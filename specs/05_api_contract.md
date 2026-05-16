# API Contract

## Purpose

- Define the HTTP API surface for the web application
- Make request and response expectations explicit before implementation starts
- Keep API design aligned with the ingestion-centric domain model, Auth0-based security model, and strict DDD boundaries

## API Design Principles

- Use JSON for request and response bodies unless the endpoint explicitly handles file upload
- Use `multipart/form-data` for manual dataset upload endpoints
- Keep public operator-facing endpoints separate from machine-to-machine ingestion status update endpoints
- Design endpoints around application use cases and aggregates rather than around raw database tables
- Use stable resource identifiers in URLs and avoid leaking persistence-only implementation details into the API contract

## Authentication And Caller Types

- Browser-based user traffic must authenticate through Auth0 user login
- Operator-facing API endpoints must authorize based on Auth0 user identity and role claims
- Machine-to-machine endpoints must authenticate through Auth0 OAuth 2.0 client credentials flow
- The application must distinguish between human callers and machine clients in audit records and authorization checks

## Common Conventions

- All timestamps should use ISO 8601 UTC format
- Resource identifiers should be opaque application identifiers rather than sequential database IDs when exposed externally
- List endpoints should default to descending creation time so the newest ingestions appear first in the UI
- List endpoints should support cursor-based pagination rather than offset-based pagination
- The standard list response shape should include `items` and `pageInfo`
- `pageInfo` should include `nextCursor`, `hasNextPage`, and the effective `limit`
- Filter parameters should use explicit query-string keys rather than overloaded search blobs where practical
- Operator-facing status views should be designed for client-side auto-refresh every 30 seconds

## Error Contract

- Error responses should use a consistent JSON shape
- Error responses should include `code`, `message`, `details`, and `requestId`
- `code` should be a stable application error code suitable for UI branching and log correlation
- `message` should be safe for operator display and should not leak secrets or internal implementation details
- `details` may contain structured validation or field-level information when helpful
- `requestId` should support tracing across logs, audit events, and upstream reports

## Idempotency Rules

- Machine-to-machine write endpoints must support idempotent retries
- Non-web-app ingestion-create endpoints must treat repeated requests as new ingestion business events unless the caller explicitly reuses the same idempotency identity for a transport retry
- Processing status update endpoints must require either a caller-supplied idempotency key or a source event identifier that is unique for the caller
- Billing status update endpoints must require a caller-supplied idempotency key or an external polling event identifier that is unique for the caller
- Retried machine-to-machine calls with the same idempotency identity must not create duplicate business state transitions
- Operator-facing re-run actions are business actions, not transport retries, and should produce new audited actions even if triggered more than once

## Operator-Facing Endpoint Areas

### Ingestion Read Endpoints

- `GET /api/ingestions`
- Supports filtering by partner, billing period, channel, status, created-from date, created-to date, and free-text search where explicitly supported
- Supports sort options that are intentionally limited to UI-supported views, with default sort `createdAt desc`
- Returns lightweight ingestion list items optimized for dashboard and operational table views
- The default dashboard read model should support grouping by partner and billing period, with newest ingestion first inside each group
- Group-level summary status should reflect the newest ingestion in the group
- Dashboard groups are collapsed by default and expanded on demand in the client UI
- The default dashboard query should scope to the current billing period
- The default dashboard query should include successful and terminal ingestions rather than filtering them out
- If the current billing period has no ingestions, the UI should render an empty-state message with the text "No ingestions occurred yet"

- `GET /api/ingestions/:ingestionId`
- Returns ingestion detail including source metadata, file references, lifecycle state, billing-system status, and execution history visible to the caller's role
- If an ingestion has been created but no processing-status update has been received yet, the lifecycle state returned by read endpoints must be `waiting for mediation`
- Read endpoints must continue returning `waiting for mediation` until a real processing update or manual operator action changes the ingestion state

- `GET /api/ingestions/:ingestionId/files/:fileId/download`
- Allows administrators to download the original uploaded file through an authenticated application endpoint

### Ingestion Action Endpoints

- `POST /api/ingestions/manual-uploads`
- Creates a new ingestion and accepts the uploaded file payload plus required ingestion metadata
- Requires multipart upload handling and validation feedback suitable for UI display
- Requires the billing period to be provided explicitly by the user as part of the upload request metadata
- Does not require an additional free-text note field for the upload request

- `POST /api/ingestions/:ingestionId/re-run`
- Triggers a new execution attempt for a selected ingestion where business rules allow it
- Retry and re-run are the same business action, and the API contract uses `re-run` as the canonical endpoint name
- Re-run is allowed even when the previous execution attempt ended in `data quality validation failed`
- Re-run creates a new execution attempt under the same ingestion
- Re-run does not require a human-entered reason field

- Later-phase operator actions may add `ignore` endpoints under the same ingestion resource namespace

### Partner And Channel Endpoints

- `GET /api/partners`
- Returns partners visible to the authenticated caller
- For manual-upload flows, only returns partners that currently have an active manual-upload channel available to the caller

- `GET /api/partners/:partnerId/channels`
- Returns configured ingestion channels and application-visible channel metadata for the partner
- Partner configuration UX separates channel activation flows from mediation-configuration flows, even when both operate on the same partner context

- `PUT /api/partners/:partnerId/channels/:channelId/activation-state`
- Activates or deactivates the selected channel and records the resulting configuration and audit event
- Activation of a manual-upload channel must fail unless a valid active mediation configuration is already available for that channel through the effective partner or channel configuration
- Channel activation must fail when no valid active mediation configuration is available
- If configuration validity is lost later, the system may automatically deactivate the channel and require a separate manual reactivation call after configuration is fixed

- `GET /api/mediation-blueprints`
- Returns administrator-defined mediation blueprints visible to the authenticated caller, including blueprint name, hard-coded function identifier, and parameter definitions needed for UI rendering

- `POST /api/mediation-blueprints`
- Creates a new mediation blueprint for a supported hard-coded mediation function and defines the associated parameter set

- `PUT /api/mediation-blueprints/:blueprintId`
- Updates an existing mediation blueprint and records a new blueprint version
- Blueprint updates mutate the existing blueprint definition rather than forking a separate blueprint lineage
- Blueprint-edit workflows should provide an impact preview of affected partners and channels before save

- `GET /api/partners/:partnerId/mediation-configuration`
- Returns the partner default mediation blueprint selection, parameter values, active version metadata, and any configured channel-level overrides visible to the authenticated caller

- `GET /api/partners/:partnerId/mediation-configuration/history`
- Returns read-only historical mediation configuration versions for the partner within the caller's scope

- `PUT /api/partners/:partnerId/mediation-configuration`
- Replaces the partner default mediation blueprint selection and parameter-value payload for the partner and records a new configuration version

- `PUT /api/partners/:partnerId/channels/:channelId/mediation-configuration`
- Creates or replaces the channel-level override mediation blueprint selection and parameter-value payload for the selected channel and records a new configuration version

- `GET /api/partners/:partnerId/channels/:channelId/mediation-configuration/history`
- Returns read-only historical mediation configuration versions for the selected channel within the caller's scope

- `DELETE /api/partners/:partnerId/channels/:channelId/mediation-configuration`
- Removes the channel-level override so the channel falls back to the partner default configuration

- Later-phase configuration endpoints may add create, update, and state-change operations for partner channels

### Audit And Investigation Endpoints

- `GET /api/audit-events`
- Supports filtering by ingestion, partner, actor, event type, and date range
- Returns audit data according to caller permissions and compliance visibility rules
- No export endpoints are provided for ingestion lists or audit data

## Machine-To-Machine Endpoint Areas

### Effective Mediation Configuration Read

- `GET /api/internal/ingestions/:ingestionId/effective-mediation-configuration`
- Used by Lambda or equivalent processing clients to fetch the active applicable mediation configuration and parameters for the ingestion before execution starts
- Response must identify the ingestion, resolved mediation blueprint or function identifier, configuration version identity, effective parameter payload, and enough channel-context metadata to explain why that configuration was selected
- The endpoint must return the effective configuration after partner-default and channel-override resolution rather than forcing the caller to reconstruct that logic
- The endpoint must reject requests for unknown ingestions, ingestions outside the caller's allowed machine scope, or ingestions that do not have a valid active applicable mediation configuration

### Processing Status Updates

- `POST /api/internal/processing-status-updates`
- Used by Lambda or equivalent processing clients to report ingestion and execution progress
- Request payload must identify the ingestion, execution attempt, source event identity, current processing stage, status, timestamp, and relevant technical references such as Lambda execution ID
- The processing-status contract must support reporting `SKIPPED` when the mediation layer bypasses file processing because the channel is deactivated
- The processing-status contract must reject regressive or out-of-order updates that would move the current persisted state backward

### Billing Status Updates

- `POST /api/internal/billing-status-updates`
- Used by the billing-status polling job to report downstream billing ingestion progress
- Request payload must identify the ingestion, billing reference, billing-system status, update timestamp, and polling event identity
- The billing-status contract must reject regressive or out-of-order updates that would move the current persisted billing view backward

## Role-Shaped Response Rules

- Administrator responses may include operational-level processor detail such as execution history, retry count, Lambda execution ID, billing reference, and error summary
- Administrator ingestion-detail responses may include full raw storage paths and file download actions for troubleshooting
- Commercial manager responses should focus on ingestion outcome, upload context, business-relevant status, and high-level failure information for the partners they manage
- Commercial manager ingestion-detail responses should expose sanitized upload metadata rather than full raw storage paths
- Administrator mediation-blueprint responses should expose editable blueprint metadata, hard-coded function selection, and parameter definitions
- Commercial manager mediation-configuration responses should expose selectable mediation blueprints and the parameter inputs defined by the selected blueprint for the partners they manage
- Machine-to-machine endpoints should return concise technical acknowledgements rather than UI-shaped payloads

## Validation Rules

- Reject requests that reference unknown partners, channels, ingestions, executions, or unsupported status values
- Reject non-web-app ingestion-creation requests that omit the immutable source object version identifier
- Manual upload validation responses should identify missing required metadata, unsupported file types, and file-level validation failures
- Manual upload should accept Excel and CSV files
- Manual upload validation failures must reject the upload immediately and must not create an ingestion
- Mediation-blueprint endpoints should reject unsupported mediation function identifiers and invalid blueprint parameter definitions
- Mediation-blueprint updates that invalidate active partner or channel configurations should trigger downstream invalidation handling and automatic channel deactivation where required by the configuration rules
- Mediation-blueprint edit flows should expose enough information to preview which dependent partner or channel configurations would be impacted before the update is submitted
- Mediation-configuration endpoints should support saving drafts with incomplete parameter values, but activation endpoints must reject incomplete configuration versions
- Mediation-configuration endpoints should reject unknown mediation blueprints and invalid parameter payload structures for the selected blueprint
- Channel activation-state endpoints should reject unknown channels or partner-channel mismatches
- Channel-activation endpoints should reject attempts to activate a second manual-upload channel for the same partner
- Machine-to-machine endpoints should reject status regressions or illegal state transitions and should not apply reconciliation rules for regressive updates
- Configuration-changing endpoints must require a non-empty human-entered reason field

## Upload And Correlation Rules

- `POST /api/ingestions/manual-uploads` must create the ingestion before storing the file and must ensure the stored object key or filename contains the ingestion ID
- Manual-upload requests to a deactivated channel must be rejected with a clear channel-deactivated response
- The manual-upload UI flow must only expose partners that have an active manual-upload channel
- The manual-upload UI flow should not require channel selection because the partner's single active manual-upload channel is implied
- Non-web-app mediation flows must use an API endpoint that creates the ingestion and returns the ingestion ID before mediation begins
- Non-web-app ingestion-creation requests must include partner, channel, billing period, source object key, immutable source object version identifier, original filename, and detected source type
- The immutable source object version identifier should be an S3 version ID, ETag, or equivalent storage-native immutable reference
- The API must reject non-web-app ingestion-creation requests when the immutable source object version identifier is missing
- Detected source type must use a controlled supported value rather than a free-form string
- Non-web-app ingestion-create requests with the same business fields may still create separate ingestions unless they are retries carrying the same idempotency identity
- A successful non-web-app ingestion-create response must represent the new ingestion in `waiting for mediation` state until a later processing-status update changes it
- Internal processing clients must be able to fetch the active applicable mediation configuration and parameter payload for an ingestion before execution starts
- Billing-uploaded CSV names or references must preserve the ingestion ID so the polling job can correlate billing-system state back to the ingestion

## Post-Upload UX Rules

- After a successful manual-upload response, the UI should offer either starting another upload or navigating to the created ingestion detail page

## Configuration Lifecycle Rules

- Mediation configuration APIs must support draft and active version states
- Activation must be a separate explicit operation from saving configuration changes
- Effective-configuration responses should make it clear whether a channel override is active or whether the channel currently falls back to the partner default
- Configuration APIs should preserve historical records and should not expose deletion operations for partner, channel, mediation blueprint, or mediation configuration history entities
- Main configuration workflows should expose only the current effective version, while history is exposed through separate read-only history endpoints or pages
- Historical versions may be used to prepopulate a new draft, but activating a historical version directly is not supported

## Operational Monitoring Rules

- The API should expose enough status and timestamp data for the UI to identify ingestions that have remained in progress for longer than the fixed 15-minute stuck threshold
- The fixed 15-minute stuck threshold is an operational UI indicator only and must not trigger an automatic persisted status transition through the API contract
- Application APIs do not provide alerting integration directly; infrastructure alerting is handled externally via CloudWatch-based monitoring
- Remembering per-user dashboard filters or grouping preferences is not a current API requirement and may be added later as a separate improvement

## Billing Polling Rules

- The billing polling workflow should stop at `ingested by billing system` and should not model invoice draft approval stages inside the billing system
- A missing or ambiguous billing lookup after the environment-configured polling timeout must be treated as a failure for the ingestion in this application
- The billing polling timeout must be configurable per environment rather than hard-coded in the API contract

## Response Shape Examples

### List Response Shape

```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": "opaque-cursor",
    "hasNextPage": true,
    "limit": 50
  }
}
```

### Error Response Shape

```json
{
  "code": "INGESTION_NOT_FOUND",
  "message": "The requested ingestion could not be found.",
  "details": {},
  "requestId": "req_123"
}
```

## Out Of Scope

- Defining the third-party billing system API contract
- Defining the external SFTP protocol contract
- Defining the internal protocol of S3, SQS, or Lambda
- Free-form ad hoc query endpoints that bypass the domain-oriented API surface