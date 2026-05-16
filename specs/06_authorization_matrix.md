# Authorization Matrix

## Purpose

- Define the permission model for human users and machine clients
- Make role boundaries explicit before API and UI implementation begins
- Keep authorization aligned with Auth0 as the system of record for identities, roles, and machine credentials

## Authorization Principles

- Auth0 is the source of truth for human user identities, role assignments, and machine-to-machine clients
- The application must not maintain a separate primary role-management system
- Authorization decisions must be enforced in the application layer and reflected consistently in the UI and API
- Every privileged action must be auditable with actor identity, actor type, timestamp, target, and reason where required
- The default authorization stance is deny unless a role or machine scope is explicitly granted access

## Actor Types

- `administrator`: operational user responsible for monitoring, investigation, and operational control actions
- `commercial_manager`: business user responsible for manual upload fallback and partner/channel configuration within assigned scope
- `mediation_layer_reporter`: machine client allowed to submit processing execution and ingestion progress updates
- `bulk_upload_status_reporter`: machine client allowed to submit downstream billing ingestion status updates

## Scope Model

- Human users authenticate through Auth0 and carry role claims consumed by the web application
- Commercial managers should be constrained to the partners they are responsible for
- Administrators may access all partners and all ingestions unless a stricter enterprise policy is later introduced
- Machine clients must use least-privilege API scopes rather than broad administrative access

## Human User Permission Matrix

| Capability | Administrator | Commercial Manager |
| --- | --- | --- |
| Access the web application | Yes | Yes |
| View ingestion dashboard | Yes, all partners | Yes, assigned partners only |
| View ingestion detail | Yes, full operational detail | Yes, role-shaped business detail only |
| View dataset file references | Yes, including raw storage path | Yes, sanitized metadata only for assigned partners |
| Download original uploaded files | Yes | No |
| Upload dataset manually | No default business need | Yes |
| Re-run ETL for ingestion | Yes | No |
| Activate or deactivate ingestion channel | Yes | Yes for assigned partners |
| Ignore ingestion with reason | Later phase, Yes | No |
| View audit trail | Yes | No default access |
| Configure partner channels | Yes | Yes for assigned partners |
| Create or update mediation blueprints | Yes | No |
| Configure partner default mediation blueprint selection and parameter values | No default business need | Yes for assigned partners |
| Configure channel-level mediation override selection and parameter values | No default business need | Yes for assigned partners |
| View configuration history pages | Yes | Yes for assigned partners |
| Use historical version as template for new draft | Yes | Yes for assigned partners |
| Manage Auth0 users or roles through this app | No | No |

## UI Visibility Rules

- Administrators should see cross-partner operational views and deep processor diagnostics
- Administrators should see blueprint-management screens for defining mediation blueprints and their parameter sets
- Administrators should see that blueprint edits can immediately invalidate dependent configurations and deactivate affected channels
- Administrators should see an impact preview for blueprint edits that lists affected partners and channels before saving the change
- Administrators should see full raw storage paths and file download actions on ingestion detail pages
- Commercial managers should see only the partners they own and should not see low-level technical execution detail unless explicitly approved later
- Commercial managers should see selectable mediation blueprints and, after selecting one, the parameter inputs associated with that blueprint for their assigned partners
- Commercial managers should see channel activation-state controls for their assigned partners where channel-management permissions allow it
- Commercial managers should see the manual-upload flow only for partners that currently have an active manual-upload channel
- Commercial managers should see sanitized upload metadata only and should not see full raw storage paths or file download actions
- Configuration history should be shown on separate read-only pages, with template-from-history actions available only where the user's normal configuration scope permits drafting a new version
- UI controls must be hidden or disabled when the role is not permitted to perform the corresponding action
- Server-side authorization must remain authoritative even when the UI hides controls

## API Authorization Rules

- Every operator-facing endpoint must enforce role-based authorization before executing business logic
- Endpoints returning partner-scoped data must enforce partner-scope filtering for commercial managers
- Audit endpoints should be restricted to administrators unless a narrower compliance-approved read model is introduced later
- Action endpoints such as re-run and ignore should require administrator role
- File-download endpoints should require administrator role
- Mediation-blueprint endpoints should require administrator role
- Mediation-configuration endpoints should require commercial-manager access scoped to the affected partner
- Configuration-history endpoints should respect the caller's existing administrator or partner-scoped commercial-manager access
- Channel activation-state endpoints should require partner-scoped channel-management permission

## Machine Client Scope Matrix

| Machine Client | Allowed Endpoints | Allowed Data Scope | Not Allowed |
| --- | --- | --- | --- |
| `mediation_layer_reporter` | Processing status update endpoints | Processing and ingestion status updates only | Dashboard reads, audit reads, partner config, operator actions |
| `bulk_upload_status_reporter` | Billing status update endpoints | Billing-system file processing status updates only | Dashboard reads, audit reads, partner config, operator actions |

## Audit Requirements For Authorization

- Log successful and denied privileged actions with actor identity and actor type
- Log role-sensitive operator actions such as re-run, ignore, channel activation-state changes, and channel configuration changes
- Log machine-client calls with Auth0 client identity and request correlation metadata
- Preserve enough authorization context in audit data to explain why a caller was allowed or denied access

## Future Extension Rules

- If additional human roles are introduced later, add them by expanding this matrix rather than by weakening existing administrator or commercial-manager boundaries
- If commercial managers later need audit visibility, define a narrower partner-scoped audit read model instead of reusing administrator-level audit access wholesale
- If a second-approval workflow is introduced later, model it as an additional authorization rule on top of this matrix rather than replacing the role model itself

## Out Of Scope

- Auth0 tenant administration procedures
- Organization-wide identity governance outside this application's boundaries
- Partner-side authorization models in external systems