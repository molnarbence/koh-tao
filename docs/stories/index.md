# Story Index — Koh Tao

Internal SOX-scoped ingestion supervision application. Work items follow a three-level hierarchy: **Deliverable → Epic → User Story**.

Stories are ordered as thin vertical slices — each deliverable yields observable end-to-end value before the next one begins.

## Global Constraints (apply to every story)

- **Architecture**: strict DDD — `server/domain/` imports nothing outside itself; `server/application/` imports only domain and its own port interfaces (never concrete infra classes); `server/infrastructure/` implements ports; `server/api/` instantiates infra and passes it into application services
- **Database**: Prisma ORM only — no raw SQL, no stored procedures
- **Validation**: Zod on all API inputs at the route layer
- **Auth**: Auth0 JWT for user routes; Auth0 client credentials (M2M) for `/api/internal/*`
- **Pagination**: cursor-based (`nextCursor`, `hasNextPage`, `limit`) on all list endpoints
- **IDs**: opaque application identifiers in all external responses
- **Tests**: Bun test runner; domain/application unit tests mock at boundaries; integration tests use Testcontainers PostgreSQL
- **Audit**: every privileged action records actor identity (Auth0 userId or clientId), actor type (human/machine), timestamp, target, and action type
- **Error shape**: `{ code, message, details, requestId }` on all error responses

---

## Deliverable D1 — Manual upload

*A commercial manager uploads a dataset file and sees the new ingestion appear.*

> **Auth stub**: D1 implements auth as a hardcoded identity (no real JWT validation). Real Auth0 enforcement and partner scope filtering land in D5.

### Epic: Ingestion Creation

| ID    | User Story                                                    | Deps  |
|-------|---------------------------------------------------------------|-------|
| US-08 | Upload a dataset file for a partner and billing period        | —     |
| US-03 | List partners (accessible to current user)                    | —     |

### Epic: Ingestion Reads

| ID    | User Story                                                    | Deps  |
|-------|---------------------------------------------------------------|-------|
| US-09 | View full lifecycle detail of an ingestion                    | US-08 |

### Epic: Upload UI

| ID    | User Story                                                    | Deps          |
|-------|---------------------------------------------------------------|---------------|
| US-11 | Guided upload form: partner, billing period, file             | US-08, US-03  |
| US-12 | Clear next step after a successful upload                     | US-11         |
| US-10 | Dedicated detail page for each ingestion                      | US-09, US-28* |

> *US-10 depends on US-28 (re-run). Render the re-run button as disabled until D5 is complete.

**Feedback checkpoint**: commercial manager walkthrough — can they find the right partner, upload a file, and land on the ingestion detail page? Does the post-upload choice feel natural?

---

## Deliverable D2 — Operational dashboard

*An administrator opens a browser and sees all ingestions on a live, filterable dashboard.*

### Epic: Ingestion Reads

| ID    | User Story                                                    | Deps  |
|-------|---------------------------------------------------------------|-------|
| US-04 | Browse and filter all ingestions across partners              | —     |

### Epic: Dashboard UI

| ID    | User Story                                                    | Deps  |
|-------|---------------------------------------------------------------|-------|
| US-05 | Ingestions grouped by partner and billing period on dashboard | US-04 |
| US-06 | Filter dashboard by partner, billing period, status; auto-refresh | US-05 |

> **Auth stub**: admin-only access with hardcoded identity until D5 is complete.

**Feedback checkpoint**: show the dashboard to administrators with seeded data. Validate grouping UX, status vocabulary, stuck indicator, and empty-state message.

---

## Deliverable D3 — Configuration management

*Administrators manage blueprints; commercial managers configure partner channels and activate them.*

### Epic: Mediation Blueprints

| ID    | User Story                                                    | Deps         |
|-------|---------------------------------------------------------------|--------------|
| US-18 | Browse available mediation blueprints and parameter schemas   | —            |
| US-19 | Create and update mediation blueprints with parameter schemas | US-18        |

### Epic: Mediation Configuration

| ID    | User Story                                                    | Deps         |
|-------|---------------------------------------------------------------|--------------|
| US-20 | Configure default mediation blueprint and parameters for a partner | US-19   |
| US-21 | Override mediation configuration for a specific channel       | US-20        |

### Epic: Channel Management

| ID    | User Story                                                    | Deps              |
|-------|---------------------------------------------------------------|-------------------|
| US-22 | See all configured ingestion channels for a partner           | US-03             |
| US-23 | Activate or deactivate an ingestion channel                   | US-22, US-20      |

### Epic: Configuration UI

| ID    | User Story                                                    | Deps              |
|-------|---------------------------------------------------------------|-------------------|
| US-24 | Channel management page with activation toggles               | US-22, US-23      |
| US-25 | Form to select a blueprint and fill in parameter values       | US-20, US-21, US-18 |
| US-26 | Management screen to create and edit mediation blueprints     | US-19             |

At the end of D3, wire up the deferred stubs from D1:
- US-08: connect real mediation config check (channel must have active config to upload)

**Feedback checkpoint**: commercial manager configures a blueprint, activates a channel, and uploads through the full validated path. Administrator reviews the blueprint impact preview.

---

## Deliverable D4 — Machine reporting

*The mediation Lambda registers ingestions and reports status updates, visible on the dashboard.*

### Epic: M2M Auth & Ingestion Lifecycle

| ID    | User Story                                                    | Deps                |
|-------|---------------------------------------------------------------|---------------------|
| US-13 | Authenticate to the application API using machine credentials | —                   |
| US-14 | Register a new ingestion record before processing begins      | US-13               |
| US-15 | Fetch resolved mediation configuration before execution       | US-13, US-20*       |
| US-16 | Report processing stage and status updates for an ingestion   | US-13, US-14        |
| US-17 | Report billing system file processing status for an ingestion | US-13, US-14        |

> *US-15 depends on US-20 (mediation config). Return a hardcoded stub config in D4; replace with real resolution when D3 is complete.

**Feedback checkpoint**: integration test with the Lambda team — can they register an ingestion, fetch config, and push status updates? Do the idempotency semantics match their retry behaviour?

---

## Deliverable D5 — Auth, authorization & audit

*Real Auth0 identity enforced on all routes; partner scope filtering active; complete audit trail.*

### Epic: Auth & Authorization

| ID    | User Story                                                    | Deps        |
|-------|---------------------------------------------------------------|-------------|
| US-01 | Every privileged action logged with actor identity and timestamp | —         |
| US-02 | Application verifies identity on every request                | —           |
| US-07 | Commercial managers see and interact only with their partners | US-02       |

### Epic: Operator Actions & Audit

| ID    | User Story                                                    | Deps          |
|-------|---------------------------------------------------------------|---------------|
| US-27 | Download the original uploaded file for an ingestion          | US-09, US-01  |
| US-28 | Trigger a new execution attempt for a failed ingestion        | US-09, US-01  |
| US-29 | Query the audit trail by actor or target resource             | US-01, US-02  |

At the end of D5, wire up all deferred auth stubs from D1–D4:
- US-03, US-04, US-08, US-09, US-11: replace hardcoded actor with real JWT identity
- US-03, US-04: apply commercial manager partner scope filtering (US-07)
- US-10: enable re-run button (US-28 now complete)

**Feedback checkpoint**: administrator re-runs a failed ingestion during a simulated incident. Does the re-run flow feel safe? Is the audit trail readable for a SOX reviewer?

---

## Full story list

| ID    | Title                                                              | Deliverable | Epic                            |
|-------|--------------------------------------------------------------------|-------------|---------------------------------|
| US-08 | Upload a dataset file for a partner and billing period             | D1          | Ingestion Creation              |
| US-03 | List partners accessible to current user                           | D1          | Ingestion Creation              |
| US-09 | View full lifecycle detail of an ingestion                         | D1          | Ingestion Reads                 |
| US-10 | Dedicated detail page for each ingestion                           | D1          | Upload UI                       |
| US-11 | Guided upload form: partner, billing period, file                  | D1          | Upload UI                       |
| US-12 | Clear next step after a successful upload                          | D1          | Upload UI                       |
| US-04 | Browse and filter all ingestions across partners                   | D2          | Ingestion Reads                 |
| US-05 | Ingestions grouped by partner and billing period on dashboard      | D2          | Dashboard UI                    |
| US-06 | Filter dashboard by partner, billing period, status; auto-refresh  | D2          | Dashboard UI                    |
| US-18 | Browse available mediation blueprints and parameter schemas        | D3          | Mediation Blueprints            |
| US-19 | Create and update mediation blueprints with parameter schemas      | D3          | Mediation Blueprints            |
| US-20 | Configure default mediation blueprint and parameters for a partner | D3          | Mediation Configuration         |
| US-21 | Override mediation configuration for a specific channel            | D3          | Mediation Configuration         |
| US-22 | See all configured ingestion channels for a partner                | D3          | Channel Management              |
| US-23 | Activate or deactivate an ingestion channel                        | D3          | Channel Management              |
| US-24 | Channel management page with activation toggles                    | D3          | Configuration UI                |
| US-25 | Form to select a blueprint and fill in parameter values            | D3          | Configuration UI                |
| US-26 | Management screen to create and edit mediation blueprints          | D3          | Configuration UI                |
| US-13 | Authenticate to the application API using machine credentials      | D4          | M2M Auth & Ingestion Lifecycle  |
| US-14 | Register a new ingestion record before processing begins           | D4          | M2M Auth & Ingestion Lifecycle  |
| US-15 | Fetch resolved mediation configuration before execution            | D4          | M2M Auth & Ingestion Lifecycle  |
| US-16 | Report processing stage and status updates for an ingestion        | D4          | M2M Auth & Ingestion Lifecycle  |
| US-17 | Report billing system file processing status for an ingestion      | D4          | M2M Auth & Ingestion Lifecycle  |
| US-01 | Every privileged action logged with actor identity and timestamp   | D5          | Auth & Authorization            |
| US-02 | Application verifies identity on every request                     | D5          | Auth & Authorization            |
| US-07 | Commercial managers see and interact only with their partners      | D5          | Auth & Authorization            |
| US-27 | Download the original uploaded file for an ingestion               | D5          | Operator Actions & Audit        |
| US-28 | Trigger a new execution attempt for a failed ingestion             | D5          | Operator Actions & Audit        |
| US-29 | Query the audit trail by actor or target resource                  | D5          | Operator Actions & Audit        |
