# Koh Tao Design

## Goal

Build an internal SOX-scoped web application for supervising ingestion lifecycle, mediation processing, and downstream billing-system usage-data file processing status.

The application owns:

- the operator web UI
- the application API
- domain and application logic
- PostgreSQL persistence
- manual upload fallback
- partner and channel configuration
- mediation configuration management
- ingestion and billing-system usage-data file processing visibility
- auditability for human and machine actions

The application does not own:

- the external SFTP process
- partner API collectors
- mediation Lambda implementation details
- S3 or SQS internals
- billing system internals beyond visible ingestion outcome

## Actors

### Human Actors

- `administrator`: operational owner with global visibility, re-run capability, full troubleshooting detail, blueprint management, and audit access
- `commercial_manager`: scoped business user with manual upload fallback and partner or channel configuration authority for assigned partners

### Machine Actors

- `mediation_layer_reporter`: machine client that creates non-web-app ingestions, fetches active mediation configuration, and reports processing updates
- `bulk_upload_status_reporter`: machine client that reports downstream billing ingestion progress

Human authentication and machine-to-machine authentication are both present from MVP day one through Auth0.

## Scope And Boundaries

The web application is the system of record for operational state, partner and channel configuration, ingestion lifecycle state, and audit history.

Terminology in this design:

- `ingestion`: the application-owned lifecycle record for one dataset arrival or upload attempt
- `mediation`: the Lambda-driven ETL or transformation step performed within that ingestion lifecycle

External channels are modeled as upstream sources rather than implementation responsibilities. Manual upload is the only ingestion path directly hosted by the web application. SFTP and partner API collection remain external, but their arrivals become first-class ingestions when the mediation layer registers them through the application API.

The final downstream status modeled by this application is whether the uploaded usage-data file was processed successfully by the billing system. The application does not monitor whether the partner was ultimately billed. Invoice drafting, invoice approval, and later billing workflow states are explicitly out of scope.

## High-Level Architecture

Main components:

- Nuxt 4 application providing UI and server routes
- PostgreSQL 18 as the primary relational store
- Prisma as the only approved database access library
- Auth0 for user login, role assignment, and machine credentials
- S3 for raw uploaded or collected file storage
- SQS and Lambda in the external mediation pipeline
- scheduled billing polling job reporting billing-system usage-data file processing status back into the application API

The application receives ingestion lifecycle information from two directions:

- direct human-triggered manual upload
- machine-triggered ingestion creation and status updates from external processing components

## Core Domain Model

### Partner Aggregate

Owns partner identity, partner metadata, partner-level mediation defaults, and the collection of configured ingestion channels.

### Ingestion Channel

Represents one ingestion path for a partner. A partner can have multiple channels, but at most one manual-upload channel.

Channels carry:

- channel type such as `manual_upload`, `sftp`, or `api`
- activation state
- application-visible channel metadata
- optional channel-level mediation override

Activation is separate from mediation configuration. A channel may be activated only when a valid active effective mediation configuration exists. If the effective configuration later becomes invalid, the channel auto-deactivates and requires explicit manual reactivation after the configuration is fixed.

### Mediation Blueprint

Administrator-owned definition of a supported hard-coded mediation function and its expected parameter set.

Blueprints are updated in place, versioned, audited, and used by commercial managers to select valid parameter inputs for partner defaults and optional channel overrides.

### Ingestion Aggregate

Represents one dataset arrival or upload attempt for a partner billing period and channel.

An ingestion owns:

- partner reference
- channel reference
- billing period
- current application status
- source metadata
- attached dataset file metadata
- applicable mediation configuration snapshot or reference
- projected downstream billing-system file processing outcome
- execution history references

One partner and one billing period can have multiple ingestions.

### Processing Execution Aggregate

Represents one execution attempt for an ingestion.

It owns:

- execution stage and status
- timestamps
- error summary
- retry counter and execution references

Re-running an ingestion creates a new execution attempt under the same ingestion rather than a new ingestion record.

### Audit Event Model

Append-only audit records preserve human and machine evidence without becoming the source of truth for aggregate state.

## Ingestion Creation Rules

### Manual Upload

- available only for partners with an active manual-upload channel
- partner selection implies the single manual-upload channel
- accepts Excel and CSV files
- requires explicit billing period input
- performs pre-mediation validation before ingestion creation
- creates the ingestion before storing the file
- embeds the ingestion ID into the trusted upload object key or filename convention
- allows duplicate uploads as separate ingestions

### Non-Web-App Channels

- the mediation layer must call the web application API to create the ingestion before mediation begins
- the request must include partner, channel, billing period, source object key, immutable source object version identifier, original filename, and controlled source type
- controlled source type values are application-defined, such as `manual_upload`, `sftp`, or `api`
- the immutable storage reference should be an S3 version ID, ETag, or equivalent immutable source reference
- missing immutable version identifiers are rejected
- repeated create requests may represent separate business ingestions unless they reuse the same idempotency identity as a transport retry

## Status Model

Current ingestion status vocabulary:

- `waiting for mediation`
- `mediation started`
- `mediation failed`
- `data quality validation failed`
- `skipped`
- `uploaded to billing system`
- `ingested by billing system`
- `billing system failed to process`

Rules:

- newly created ingestions initialize in `waiting for mediation`
- `waiting for mediation` remains visible until a real processing update or manual operator action changes it
- elapsed time alone must not auto-transition ingestion status
- `skipped` is terminal and is used when a deactivated channel causes mediation to bypass processing
- data quality failure remains distinct from infrastructure or execution failure

The UI may highlight ingestions as stuck after 15 minutes in an in-progress state, but that threshold is a visibility aid only and does not mutate persisted state.

Billing-system status remains separate from ingestion status and uses its own vocabulary: `PENDING`, `IN_PROGRESS`, `PROCESSED`, `FAILED`.

## Operator Actions

The canonical operator action is `re-run`.

Rules:

- `retry` and `re-run` mean the same business action in this application
- the UI and API use `re-run` as the canonical term
- re-run creates a new execution attempt under the same ingestion
- re-run is allowed even after `data quality validation failed`
- re-run does not require a mandatory human-entered reason field
- operator actions still record actor, timestamp, and result

`ignore` remains a later-phase action and is not part of the current MVP contract.

## API Design

### Operator-Facing Endpoints

The API exposes:

- ingestion list and detail reads
- authenticated original-file download for administrators
- manual upload creation
- re-run action endpoint
- partner and channel reads
- channel activation state updates
- mediation blueprint management
- partner default and channel override mediation configuration management
- audit-event investigation reads

Common API conventions:

- opaque external identifiers
- cursor-based pagination
- stable JSON error shape with `code`, `message`, `details`, and `requestId`
- role-shaped responses depending on administrator versus commercial manager access

### Machine-To-Machine Endpoints

The API exposes:

- `GET /api/internal/ingestions/:ingestionId/effective-mediation-configuration`
- `POST /api/internal/processing-status-updates`
- `POST /api/internal/billing-status-updates`

Rules:

- machine writes must support idempotent retries
- non-web-app ingestion creation treats repeated requests as separate business events unless the same idempotency identity is reused
- the mediation Lambda must fetch the effective mediation configuration and parameter payload for an ingestion through the web application API before execution starts
- the effective-mediation-configuration endpoint returns the resolved active partner-default or channel-override configuration, the selected blueprint or function identifier, the configuration version, and the parameter payload needed by the Lambda
- regressive or out-of-order machine status updates are rejected
- no reconciliation allowlist exists for regressive machine updates
- processing updates must identify ingestion, execution attempt, stage, status, timestamp, and technical references
- billing updates must identify ingestion, billing reference, billing-system status, timestamp, and polling identity

## Authorization Model

### Administrators

Can:

- view all ingestions with full operational detail
- download original uploaded files
- re-run ingestions
- activate and deactivate channels
- configure partner channels
- create and update mediation blueprints
- read audit data

### Commercial Managers

Can:

- view assigned-partner ingestions with sanitized detail
- manually upload files for eligible assigned partners
- activate and deactivate channels for assigned partners
- configure partner channels for assigned partners
- configure partner default mediation settings for assigned partners
- configure channel override mediation settings for assigned partners
- view configuration history within assigned scope

Cannot:

- download original files
- re-run ingestions
- access global audit data
- manage mediation blueprints

## Audit And Compliance

MVP auditability requirements:

- audit human and machine activity from day one
- store Auth0 user identifiers for human actions
- store Auth0 client identity and technical caller metadata for machine updates
- keep audit events append-only
- preserve enough evidence for SOX review
- keep entity-level audit columns and append-only audit history aligned

Configuration-changing endpoints require a non-empty human-entered reason. Re-run does not.

## Storage, Retention, And Performance

- S3 raw uploaded files use a 7-year expiry policy
- database retention may be shorter than S3 retention
- the design must not depend on an application cleanup job deleting old rows
- schema and indexing must remain efficient as historical records accumulate
- future partitioning, if needed, should favor coarse time-based partitioning and must preserve primary frontend query patterns

Key indexing priorities include:

- ingestion list filtering by partner, billing period, channel, status, and creation time
- execution history lookup by ingestion and descending execution start time
- audit lookup by target identity and timestamp, and separately by actor identity and timestamp

## Testing Strategy

- Bun is the required test runner for unit and integration tests
- integration tests use PostgreSQL through Testcontainers for Node.js
- domain tests cover aggregate behavior and status transitions
- integration tests cover Prisma repositories, schema constraints, audit persistence, API handlers, and machine-to-machine flows
- external systems such as Auth0 and the billing system are mocked or stubbed at the boundary unless an explicit end-to-end test requires otherwise

## Security Requirements

- encrypt data in transit for browser traffic, machine-to-machine API calls, and service communication
- encrypt data at rest for PostgreSQL, S3, and other persistent storage
- use Auth0 for both human and machine authentication
- apply least-privilege scopes for machine clients
- manage application-owned secrets outside source control

## Non-Goals

- building the SFTP transport process
- building partner API collectors
- modeling invoice draft and approval workflow inside the billing system
- exposing export endpoints for ingestion lists or audit data
- implementing in-app alert delivery
- using stored procedures or database functions instead of Prisma-based access

## Implementation Constraints

- Nuxt 4 for UI and server routes
- Tailwind CSS for styling
- Bun as runtime, package manager, and test runner
- PostgreSQL 18 as relational store
- Prisma as the only database access library
- strict Domain-Driven Design with explicit bounded contexts, aggregates, repositories, and application services