# Database Design Base Rules

## Design Principles

- Use the database as the system of record for operational state and audit history
- Model each ingestion as a first-class entity with a stable identifier
- Model ingestion as a first-class entity distinct from partner, channel, dataset file, and processing execution
- Separate partner configuration, channel metadata, ingestion tracking, dataset files, processing executions, and audit events into distinct tables
- Preserve historical records instead of overwriting critical operational events
- Prefer explicit state transitions over inferred status from logs alone
- Store references to external channel and processor events without taking ownership of their internal implementation details
- Treat Auth0 as the system of record for user identities and role assignments
- Database and table design must support a strict Domain-Driven Design architecture rather than driving the domain model directly

## DDD Architecture Rules

- Define explicit bounded contexts such as partner configuration, ingestion tracking, processing monitoring, and audit/compliance
- Define aggregate roots explicitly and keep write operations within aggregate boundaries
- Repositories should load and persist domain aggregates, not expose raw persistence models as the primary application contract
- Prisma schema design should follow the domain model where practical, but persistence concerns must not leak into domain behavior
- SQL access should be encapsulated behind Prisma-backed repositories or equivalent Prisma-based persistence adapters
- Use anti-corruption boundaries when translating Auth0 user identities, Auth0 machine clients, and external processing references into domain concepts
- Cross-context interactions should happen through application services, domain events, or clearly defined interfaces rather than direct table-coupling assumptions

## Compliance And Control Rules

- Enforce role separation between commercial managers and administrators at the application and data-access layers
- Record who performed every sensitive action and when it happened
- Require a human-entered reason for every partner, channel, and mediation-configuration change, activation, deactivation, and privileged override action
- Single authorized administrators may perform privileged actions without a second approval workflow
- Avoid hard deletes for SOX-relevant operational records
- Ensure audit records are append-only for critical actions and status changes
- Store Auth0 user identifiers and role context on audit events rather than duplicating full user and role management locally

## Encryption Rules

- Encrypt data in transit between browsers, the web application, Auth0, AWS services, and other external systems
- Encrypt data at rest for PostgreSQL data files, backups, snapshots, and S3-stored raw files
- Do not design any persistence path that depends on unencrypted storage for production use

## Entity Audit Field Rules

- Every persistent entity table must include `created_at`, `updated_at`, `created_by`, and `updated_by`
- `created_at` records when the entity row was first created
- `updated_at` records when the entity row was last modified
- `created_by` stores the Auth0 user identifier or Auth0 machine client identifier that created the row
- `updated_by` stores the Auth0 user identifier or Auth0 machine client identifier responsible for the most recent modification
- `updated_at` can never be null
- `updated_by` can never be null
- On insert, `updated_at` must be set to the same value as `created_at`
- On insert, `updated_by` must be set to the same value as `created_by`
- These fields are required on domain entity tables such as partners, ingestion channels, ingestions, dataset files, processing executions, and billing transfers
- Append-only event tables may additionally capture event-specific actor metadata, but they do not replace the required entity-level audit fields on mutable entities

## Core Entity Rules

- A partner can have multiple ingestion channels
- An ingestion channel belongs to exactly one partner
- A commercial account manager can configure multiple ingestion channels for the same partner
- An ingestion channel must store an activation state that determines whether the mediation layer is allowed to process files for that channel
- A partner can have at most one manual-upload channel
- A manual-upload channel may be activated only when a valid active mediation configuration is available for it through the partner default or an active channel override
- If the active applicable mediation configuration becomes invalid or unusable, the affected channel must automatically transition to a deactivated state
- Restoring a valid active mediation configuration does not reactivate the channel automatically; a manual reactivation step is required
- A partner can define a default mediation configuration used by that partner's ingestions unless a channel-level override is present
- An ingestion channel can optionally override the partner's default mediation configuration
- Mediation blueprints must reference a hard-coded mediation function identifier and define the expected parameter set for that function
- Partner-level and channel-level mediation configurations must reference a mediation blueprint and store a flexible parameter-value payload for that blueprint
- An ingestion belongs to one partner, one billing period, and one channel
- An ingestion represents one usage dataset arrival or upload attempt for a partner billing period
- One partner and one billing period can have multiple ingestions
- A billing period is one calendar month
- A dataset file belongs to one ingestion
- Each ingestion must retain a reference or snapshot to the mediation configuration version that applies to it so operators can see which configuration was or will be used
- An ingestion can have multiple processing executions over time
- Each processing execution must store its stage, status, start time, end time, and error summary
- Re-running ETL for an ingestion creates a new processing execution attempt under the same ingestion
- There is no explicit cap on the number of execution attempts an ingestion may have
- Manual uploads must create an ingestion record only after pre-mediation validation succeeds, then store the uploading user, upload timestamp, original filename, and storage reference
- Web-app upload storage references must include the ingestion ID in a trusted object-key or filename convention so the mediation layer can derive the ingestion identity from the S3 event
- Non-web-app channels do not create the ingestion record up front; the mediation layer must call the web application API to create the ingestion, receive the ingestion ID, then continue by loading the active mediation configuration for that ingestion
- Non-web-app ingestion creation requests must include partner, channel, billing period, source object key, immutable source object version identifier, original filename, and detected source type
- The immutable source object version identifier should be an S3 version ID, ETag, or equivalent storage-native immutable reference
- The web application must reject non-web-app ingestion creation when the immutable source object version identifier is missing
- Detected source type must come from a controlled application-defined set such as `manual_upload`, `sftp`, or `api`
- The ingestion model must allow multiple ingestion records for the same partner, channel, billing period, and source object key when those arrivals are submitted as separate business requests
- API collection must create an ingestion record when the mediation layer or collector path first calls the web application API to register the ingestion
- SFTP-based arrivals must create the ingestion record through the web application API when the mediation layer starts processing the object
- Before starting mediation, the mediation layer must read the current channel configuration including channel activation state
- If the channel is deactivated, the mediation layer must not process the file and must report the ingestion as skipped
- The mediation layer must fail the ingestion immediately if it cannot fetch the applicable active mediation configuration or parameters from the web application API
- Processor status updates must reference both the ingestion and the execution attempt they belong to
- Billing-system polling updates must reference the ingestion they belong to and any relevant external billing-system reference
- Channel records should identify the external channel type and any application-visible metadata needed for monitoring
- Channel records should allow multiple active automated channels for the same partner
- Billing-uploaded CSV references must preserve the ingestion ID so the polling job can correlate billing-system state back to the ingestion

## Aggregate Root Definitions

### Partner Aggregate Root

- Aggregate root: `Partner`
- Owns partner identity, partner metadata, and partner-level configuration relevant to the web application
- Owns the collection of `IngestionChannel` entities configured for that partner
- Owns the default mediation configuration assigned to the partner
- Enforces invariants around partner configuration, including channel uniqueness rules and channel ownership by exactly one partner
- Commercial account manager configuration changes for partner channels must be applied through the `Partner` aggregate root
- Commercial account manager changes to partner-level mediation configuration must be applied through the `Partner` aggregate root
- Commercial account manager changes to channel activation state must be applied through the `Partner` aggregate root

### Mediation Blueprint Aggregate Root

- Aggregate root: `MediationBlueprint`
- Owns the administrator-defined blueprint for a supported hard-coded mediation function
- Owns blueprint metadata such as function identifier, blueprint name, expected parameter definitions, and blueprint version history
- Enforces invariants around supported function selection and parameter-definition consistency
- Administrator changes to mediation blueprints must be applied through the `MediationBlueprint` aggregate root
- Blueprint definition updates mutate the existing blueprint contract in place rather than creating a separate blueprint lineage

### Ingestion Aggregate Root

- Aggregate root: `Ingestion`
- Owns ingestion identity, billing period, source channel reference, current status, and lifecycle timestamps
- Owns attached `DatasetFile` entities and ingestion-scoped metadata needed to track uploaded or collected files
- Owns the business view of downstream billing ingestion outcome needed by the application, including the latest billing-system status projected onto the ingestion
- Enforces invariants around one ingestion belonging to exactly one partner, one billing period, and one channel
- Enforces status transitions, retry semantics, and ingestion-level consistency for manual upload, API collection, and SFTP-detected arrivals

### Processing Execution Aggregate Root

- Aggregate root: `ProcessingExecution`
- Owns one ETL execution attempt for a specific ingestion
- Owns execution-stage transitions, execution timestamps, error summaries, retry counters, and external execution references
- Enforces invariants around execution attempt lifecycle and valid processing-state transitions within a single execution attempt
- References an `Ingestion` by identity and must not directly modify ingestion-owned data except through application-layer coordination
- The latest execution attempt is the primary execution state used for operator-facing current-state views of an ingestion

### Billing Transfer Supporting Model

- `BillingTransfer` is not a separate aggregate root in the current design
- Billing transfer records act as supporting persistence for uploader references, transfer attempts, polling history, and traceability metadata associated with an ingestion
- These records support auditability and diagnostics but do not own the application's business view of billing ingestion outcome
- The latest business-relevant billing ingestion result belongs to the `Ingestion` aggregate root

### Audit Event Model

- `AuditEvent` remains append-only and should not be treated as a mutable business aggregate root
- Audit records reference aggregate roots by identity and preserve historical evidence without becoming the source of truth for aggregate state

## Aggregate Boundary Rules

- Aggregate references across boundaries should use identifiers rather than in-memory object graphs persisted across aggregates
- Transactions should not span multiple aggregate roots unless there is a clearly justified application-level consistency requirement
- Cross-aggregate workflows such as ingestion creation plus initial processing execution should be coordinated by application services
- Read models and dashboards may join across aggregates for query purposes, but write invariants must remain inside aggregate boundaries
- Supporting history tables such as `billing_transfers` may exist without being modeled as independent aggregate roots

## Status Modeling Rules

- Store normalized status values rather than free-text status fields
- Separate high-level ingestion status from step-level execution status
- Track timestamps for each major lifecycle transition
- Preserve failure reason, error code, and retry count for each execution attempt
- Support the current status vocabulary: waiting for mediation, mediation started, mediation failed, data quality validation failed, skipped, uploaded to billing system, ingested by billing system, billing system failed to process
- A newly created ingestion must initialize in `waiting for mediation` before any processing execution starts or any processing-status update is received
- An ingestion that remains in `waiting for mediation` must not auto-transition to another persisted status solely because time has passed
- Support a separate billing-system status vocabulary: PENDING, IN_PROGRESS, PROCESSED, FAILED
- Mark which statuses are terminal versus in-progress in the status reference model
- Reject regressive machine-reported status transitions rather than reconciling them into the current persisted ingestion state
- Treat `skipped` as a terminal application-level ingestion status when mediation is intentionally bypassed because the channel is deactivated
- Treat `data quality validation failed` as distinct from infrastructure or execution failure so operators can identify content-quality issues separately from technical mediation failures
- Keep application-level ingestion status and billing-system status as separate concepts so the application can represent both internal and external progress accurately
- Use `Ingestion` as the source of truth for the application's current business view of billing ingestion outcome
- When multiple execution attempts exist for the same ingestion, the latest execution attempt determines the primary current execution state shown to operators
- Billing transfer records may store transfer and polling history, but they do not replace ingestion-level ownership of the latest business-relevant billing result

## Mediation Configuration Rules

- Mediation functions are hard-coded processing options known by the application and mediation layer
- Administrators define reusable mediation blueprints for supported hard-coded mediation functions
- A mediation blueprint must define the parameter set expected by the selected hard-coded mediation function
- Commercial managers choose among administrator-defined mediation blueprints for their assigned partners and channels
- Store mediation parameter values as a flexible structured payload such as JSON rather than as a fixed relational column set per function
- Store blueprint-defined parameter metadata separately from the commercial-manager-supplied parameter values
- Support a partner-level default mediation configuration and optional channel-level overrides
- Channel-level overrides must take precedence over the partner default when both are present
- The UI must use the selected mediation blueprint to render the set of parameters that the commercial manager can fill in
- If an in-place blueprint change makes an active partner or channel configuration invalid, that configuration becomes invalid immediately
- Mediation configuration versions must support draft and active lifecycle states
- Incomplete parameter values may be saved as a draft configuration version, but draft versions must not be executable
- A valid configuration version becomes usable only after an explicit activate step
- If a channel-level override exists only as an incomplete draft, processing must fall back to the active valid partner-level configuration and the UI must make the effective configuration clear to the user
- Newly activated configuration versions apply to ingestions that are still waiting for mediation
- The mediation layer must query the latest active applicable configuration version at execution time
- Persist configuration version history so the application can explain which version applied to a given ingestion and audit who changed it
- Editing mediation configuration in production is allowed, but every change must be strongly audited and versioned

## Background Processing Reference Rules

- Store the S3 object key or equivalent storage reference for each uploaded dataset file
- Store the S3 version ID, ETag, or equivalent immutable storage version reference for each uploaded dataset file when available from the source channel
- Support correlation of an ingestion to external S3 event, SQS message, Lambda execution, and billing uploader references when available
- For web-app uploads, support trusted ingestion correlation from the object key or filename convention that embeds the ingestion ID
- For non-web-app channels, support ingestion creation through the web application API before mediation starts so later status updates can use the returned ingestion ID
- Support storage of the Auth0 machine client identifier or equivalent API caller identity for status updates submitted by Lambda
- Support storage of the channel activation state or skip reason that caused the mediation layer to skip processing when relevant
- Support storage of the billing-status polling job identity, polling timestamp, and external billing-system reference for billing-system file processing status updates
- Polling failure rules must support marking the ingestion as failed when the billing system lookup is missing or ambiguous after the environment-configured timeout window
- Do not require the database to model the full internal state of S3, SQS, Lambda, or the billing system
- Persist only the external identifiers and execution metadata needed for monitoring, debugging, and auditability
- Persist operational-level execution detail for operators, including status history, timestamps, Lambda execution references, billing references, error summaries, and retry counts
- Support a fixed global stuck-threshold concept of 15 minutes for identifying in-progress ingestions that should be highlighted in the operational UI
- The stuck-threshold highlight must not mutate ingestion status automatically and is only an operational visibility rule

## Retention Rules

- Apply a 7-year expiry policy to raw files stored in S3
- Database retention does not need to match the S3 retention period and may be shorter where compliance and operational needs allow
- Do not assume an application cleanup job will regularly delete old database rows
- Database table design and indexing must remain efficient even when historical records accumulate

## Audit Rules

- Log create, update, re-run, ignore, channel activation-state changes, and configuration-change events
- Store actor Auth0 user identifier, actor role context from Auth0, event type, event timestamp, target entity, and any optional operator note when provided
- For machine-to-machine status updates, store the Auth0 client identity and any relevant technical caller metadata
- For billing-system polling updates, store the polling job identity and billing-system file processing update metadata needed for traceability
- Log channel activation-state changes, automatic deactivation caused by invalid configuration, manual reactivation events, and skip-causing channel decisions used by the mediation layer
- Log mediation blueprint creation and in-place update events separately from partner-level or channel-level configuration selection events
- Log mediation-function selection changes, parameter changes, draft saves, activations, partner-default changes, and channel-override changes
- File downloads do not require separate audit events beyond normal authenticated application access logging
- Keep audit events queryable by ingestion, partner, billing period, user, and time range
- Keep entity-level audit columns and append-only audit events aligned so the current row metadata and the historical event trail do not contradict each other

## Integrity Rules

- Use foreign keys for all core entity relationships
- Use unique constraints for external identifiers and storage object references where appropriate
- Use not-null constraints for identifiers, ownership fields, statuses, and timestamps that define process state
- Use not-null constraints for `created_at`, `updated_at`, `created_by`, and `updated_by` on mutable entity tables unless a narrowly justified exception is documented
- On row creation, enforce `updated_at = created_at` and `updated_by = created_by`
- Use check constraints or enum-like reference tables for controlled status values
- Do not rely on stored procedures or database functions for domain rules, workflow orchestration, or write-side invariants that belong in the application and domain layers
- Allow duplicate ingestions for the same partner, billing period, and channel; do not enforce a uniqueness rule that would block corrected re-ingestion
- Enforce uniqueness for the manual-upload channel type per partner
- Do not provide deletion semantics for partner, channel, mediation blueprint, or mediation configuration history records; preserve historical visibility instead

## Testing Rules

- Unit and integration tests should run through Bun's built-in test runner
- Repository and persistence integration tests must run against a real PostgreSQL instance started through Testcontainers
- Integration tests should verify schema constraints, audit-field behavior, status persistence, and aggregate rehydration against PostgreSQL rather than against in-memory database substitutes

## Performance Rules

- Optimize for the primary frontend ingestion views: newest-first ingestion lists, partner filters, billing-period filters, channel filters, status filters, and date-range filters
- Index foreign keys used in audit and execution-history lookups
- Design for frequent filtering by partner, channel, status, billing period, and creation date range
- Add composite indexes on `ingestions` that support common dashboard and search queries, especially combinations anchored by partner, billing period, status, channel, and descending creation timestamp
- Index `processing_executions` by ingestion identifier and descending execution start timestamp so ingestion detail pages can load execution history efficiently
- Index `dataset_files` by ingestion identifier and `billing_transfers` by ingestion identifier and external billing reference
- Index `audit_events` by target entity identity and event timestamp, and separately by actor identity and event timestamp, to support operational investigations
- Prefer a small number of high-value composite indexes driven by real UI queries rather than a large number of overlapping indexes
- Do not partition by ingestion identifier
- Do not use daily partitioning as a default design choice
- Start without table partitioning unless measured data volume proves that indexes alone are insufficient
- If partitioning becomes necessary later, prefer time-based range partitioning at a coarse grain such as monthly partitions on append-heavy tables like `ingestions`, `processing_executions`, or `audit_events`
- Any future partitioning strategy must preserve the ability to filter and sort efficiently for the main frontend ingestion views without depending on row-deletion jobs

## Candidate Core Tables

- partners
- ingestion_channels
- mediation_blueprints
- mediation_config_versions
- ingestions
- dataset_files
- processing_executions
- processing_step_events
- audit_events
- billing_transfers
- status_definitions

## Out Of Scope

- Persisting the full internal state model of the external SFTP process
- Persisting the full internal state model of the external API collection process
- Modeling external partner-side systems beyond identifiers and monitoring metadata needed by the web application
