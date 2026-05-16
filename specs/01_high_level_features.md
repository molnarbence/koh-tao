# High Level Features

## Purpose

- Internal web application for supervising ingestion lifecycle, mediation processing, and billing-system upload status
- Focus on the operational UI, application backend, and database for status visibility and controlled actions
- Treat SFTP and partner API collection as external upstream channels rather than part of this project's implementation scope
- Provide operational visibility, controlled actions, and auditability for a SOX-scoped process
- In this specification, `ingestion` means the application-owned lifecycle record for one dataset arrival or upload attempt, while `mediation` means the Lambda-driven processing step within that lifecycle

## User Roles

- Target-state roles are administrators and commercial managers
- Administrators supervise ingestion lifecycle and mediation processing across all partners and channels
- Administrators can take operational actions such as re-run with audit logging
- Commercial managers can manually upload source files when automated collection is unavailable
- Commercial managers cannot perform administrator-only operational controls in the target-state design
- MVP includes authentication and role enforcement from day one using Auth0
- Later phases must enforce separation of duties between commercial and administrative roles

## MVP Features

- Dashboard showing end-to-end processing status for all ingestions
- Each ingestion belongs to a billing-period scope covering one calendar month
- One partner and one billing period can have multiple usage dataset ingestions
- Ingestion lifecycle tracking from ingestion creation through ETL and billing delivery
- Visibility into the latest billing-system usage-data file processing status reported for each ingestion
- Support for manual file upload through the web application
- Manual upload accepts Excel and CSV files
- Display partner channel type and channel metadata, including SFTP, API, and manual upload channels
- Ingestion detail page with source metadata, file references, processing history, validation results, and current status
- Commercial managers see sanitized upload metadata on ingestion detail pages
- Administrators can see full raw storage paths and can download original uploaded files through the application UI
- Search and filtering by partner, billing period, ingestion, channel, processing step, date, and status
- The operational UI auto-refreshes every 30 seconds
- The dashboard groups ingestions by partner and billing period by default
- Within each partner-and-billing-period group, ingestions are sorted newest first by default
- Group-level status reflects the newest ingestion in the group
- Groups are collapsed by default and can be expanded to inspect individual ingestions
- The main dashboard defaults to the current billing period
- The default dashboard view shows all ingestions for the current billing period, including successful ones
- If no ingestions occurred yet for the current billing period, the dashboard shows an empty-state placeholder with the text "No ingestions occurred yet"
- Visibility into failed, delayed, and stuck processing jobs
- Basic operational actions such as re-run for failed ingestions

## Later Phase Features

- Enforcement of separate permissions for administrators and commercial managers
- Partner and channel management for application-level configuration, visibility, and operational state
- Commercial account managers can configure multiple ingestion channels for the same partner
- Channel activation and mediation configuration should be presented as separate workflows in the UI
- Administrators can create mediation-configuration blueprints for hard-coded mediation functions, including the set of expected input parameters for each blueprint
- Before saving a mediation-blueprint edit, the UI should preview the impacted partners and channels that would be invalidated or automatically deactivated
- The impact preview is informational and does not require a separate second confirmation step beyond the save action itself
- Commercial account managers can configure mediation-layer defaults for a partner and optional channel-level overrides for that partner's channels by selecting from administrator-defined mediation blueprints
- When a commercial account manager selects a mediation blueprint, the UI should display the associated set of parameters so the manager can provide partner-specific or channel-specific values
- Channel activation and deactivation controls for stopping or allowing future mediation attempts on a channel
- Expanded administrator actions such as ignore with justification
- Stronger approval flows for sensitive operator actions where required by compliance
- The UI exposes operational-level processor detail including stage history, timestamps, retry count, Lambda execution ID, billing reference, and error summary
- Main configuration workflows should show only the currently effective version, while historical mediation and channel configuration versions are listed on a separate history page
- Historical versions are read-only, but users may load a historical version as the starting point for a new draft within their existing scope and permissions

## Ingestion Creation Rules

- Create an ingestion record for a manual upload only after the upload passes pre-mediation validation
- For web-app uploads, create the ingestion before storing the file and use the ingestion ID in the stored object path or filename
- For non-web-app channels, the mediation layer creates the ingestion through the web application API when processing begins and receives the ingestion ID in the API response
- For non-web-app channels, ingestion creation must provide partner, channel, billing period, source object key, immutable source object version identifier, original filename, and detected source type
- For non-web-app channels, repeated ingestion-create requests may result in separate ingestion records even when partner, channel, billing period, and source object key are the same
- The immutable source object version identifier should be an S3 version ID, ETag, or equivalent storage-native immutable reference
- Non-web-app ingestion creation must be rejected if the immutable source object version identifier is missing from the event or source metadata
- Create an ingestion record when an API dataset collector starts in the background only if that collector path is later brought into this application's owned implementation scope
- Create an ingestion record when a file uploaded via SFTP is saved into S3 only after the mediation layer calls the web application API to create the ingestion and receives the ingestion ID
- The web application must support multiple configured channels for the same partner
- The web application must display ingestion records independently even when they belong to the same partner and billing period
- Uploaded CSV files sent to the billing system must include the ingestion ID so the billing-status polling job can correlate status back to the ingestion

## Out Of Scope

- Building or operating the SFTP file transfer process itself
- Building or operating the API ingestion collector itself
- Replacing the ETL processor that moves data into the billing system
- Managing partner-side integration implementations

## Operational Controls

- MVP includes re-run ETL for a selected ingestion
- Retry and re-run mean the same operator action in this application, and `re-run` is the canonical term used in the UI and API contract
- Re-run ETL is allowed for ingestions that previously ended in data-quality validation failure
- Re-run ETL creates a new execution attempt under the same ingestion rather than creating a new ingestion record
- Channel activation and deactivation controls are part of the current partner-channel management workflow
- Later phases may add marking an ingestion as ignored when there is a documented operational justification
- Activated mediation-configuration changes apply only to ingestions that are still waiting for mediation and therefore must be versioned and strongly audited
- Operational actions must record the actor, timestamp, and result

## File Handling And Validation Rules

- Manual upload should reject invalid files immediately and should not create an ingestion when the file fails pre-mediation validation
- Manual upload requires the user to enter the billing period explicitly
- Manual upload does not require an extra free-text note or reason
- Manual upload should allow duplicate uploads for the same partner, billing period, and channel as separate ingestions
- Duplicate uploads are valid because corrected files may need to be re-ingested and the billing system is expected to handle upsert behavior using its own matching configuration
- Duplicate non-web-app ingestion-create calls are also valid business events when they are submitted as separate requests rather than as a transport retry with the same idempotency identity
- Content problems discovered during mediation should be represented as a separate data-quality validation status rather than as a generic mediation failure
- If a selected channel is deactivated, manual upload to that channel must be blocked and the user must be told that the channel is deactivated
- Manual upload is itself a channel type and a partner must have an active manual-upload channel to appear as an eligible upload target in the web application
- A partner can have only one manual-upload channel because manual upload is performed only through the web application
- In the manual-upload form, selecting the partner is sufficient because the single active manual-upload channel is implied
- Activating the manual-upload channel requires a valid active mediation configuration
- A partner may still have multiple active automated channels at the same time

## Manual Upload UX Rules

- After a successful manual upload, the UI should offer the user a choice to upload another file for a different partner or navigate to the created ingestion detail page

## Processing Status Vocabulary

- waiting for mediation
- mediation started
- mediation failed
- data quality validation failed
- skipped
- uploaded to billing system
- ingested by billing system
- billing system failed to process
- A newly created ingestion must be visible with status `waiting for mediation` until the first processing-status update arrives
- An ingestion that remains in `waiting for mediation` must stay in that status until a real processing update or manual operator action changes it

## Channel Activation Rules

- An ingestion channel can be activated or deactivated
- Channel activation must be blocked unless a valid active mediation configuration already exists
- If the active mediation configuration becomes invalid or unusable, the channel should automatically deactivate
- After automatic deactivation, the channel requires an explicit manual reactivation step once a valid configuration is restored
- The mediation layer must obtain the channel configuration before starting mediation for an ingestion
- If the channel is deactivated, the mediation layer must skip file processing and report the ingestion status as `SKIPPED`
- A skipped ingestion remains visible in the operational UI with the channel state and skip reason available for investigation

## Billing System Status Vocabulary

- PENDING
- IN_PROGRESS
- PROCESSED
- FAILED

## Billing Integration Rules

- This application tracks usage-data delivery into the billing system, not invoice drafting or invoice approval inside the billing system
- The final downstream status in this application is whether the uploaded usage-data file was processed successfully by the billing system
- If the scheduled billing-status job cannot find a matching uploaded CSV or gets an ambiguous result, the ingestion should be marked as failed in this application
- Billing-status polling timeout must be configurable per environment before the ingestion is marked as failed

## Operational Visibility Rules

- The web application provides dashboard visibility for failures and stuck ingestions, but does not implement in-app notifications or exports
- Infrastructure-side alerting is handled outside the application through CloudWatch logs, metrics, and external alerting integration
- An ingestion should be considered stuck in the UI when it remains in an in-progress state for more than 15 minutes
- The stuck indication is a UI investigation aid only and must not automatically change the persisted ingestion status
- The application does not provide export of ingestion lists or audit data
- Persisting each user's last-used dashboard filters or grouping preferences is not a current requirement and may be considered as a future improvement

## Audit And Compliance

- MVP should still record ingestion creation, file uploads, status transitions, and operational events where technically possible
- MVP must provide user-attributed and machine-attributed audit records using Auth0 identities and machine-client context
- Audit records must clearly attribute who uploaded a file, created an ingestion, retried processing, re-ran ETL, or changed configuration
- The audit history must remain evidence-friendly for SOX review
- Operational history for sensitive events must remain immutable
