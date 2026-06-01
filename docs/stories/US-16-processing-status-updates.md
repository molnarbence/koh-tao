# US-16 — As the mediation Lambda, I want to report processing stage and status updates for an ingestion, so that operators can see real-time progress and be alerted to failures

**Deliverable**: D4 — Machine reporting
**Epic**: M2M Auth & Ingestion Lifecycle
**Type**: User Story
**Dependencies**: US-13, US-14, US-01
**Layers**: domain, application, infrastructure, api

## Goal

Implement `POST /api/internal/processing-status-updates` so the mediation Lambda can report ingestion and execution progress, with regressive status transitions rejected.

## Context

- The mediation Lambda reports stage and status as it processes an ingestion.
- `Ingestion.applyProcessingStatus(next)` already exists and throws on regressive transitions — this domain rule must be exercised.
- `ProcessingExecution` domain entity exists at `server/domain/ingestions/ProcessingExecution.ts`.
- Status vocabulary: `waiting_for_mediation`, `mediation_started`, `mediation_failed`, `data_quality_validation_failed`, `skipped`, `uploaded_to_billing_system`, `ingested_by_billing_system`, `billing_system_failed_to_process`.
- Required scope: `write:processing-status`.
- Idempotency: caller provides `X-Idempotency-Key`. Same key from same caller replays successfully without duplicate writes.
- Stub route exists at `server/api/internal/processing-status-updates.post.ts`.

## Scope

**In scope**:
- `POST /api/internal/processing-status-updates`
- Update ingestion status via `Ingestion.applyProcessingStatus(next)`
- Create or update `ProcessingExecution` record
- Reject regressive status transitions with 422
- Idempotency key deduplication
- Audit event with machine client identity

**Out of scope**:
- Billing status updates (US-17)
- Stuck-ingestion detection (UI-only, US-05)

## Request body

```json
{
  "ingestionId": "...",
  "executionId": "...",
  "stage": "mediation",
  "status": "mediation_started",
  "timestamp": "2026-05-17T10:00:00Z",
  "lambdaExecutionId": "...",
  "errorSummary": null
}
```

## Response

```json
{ "accepted": true }
```

## Application service (`server/application/ingestions/ApplyProcessingStatusUpdate.ts`)

```ts
export async function applyProcessingStatusUpdate(
  input: {
    ingestionId: string; executionId: string; stage: string; status: IngestionStatus
    timestamp: Date; lambdaExecutionId?: string; errorSummary?: string
    idempotencyKey?: string; machineClientId: string
  },
  ingestionRepo: IIngestionRepository,
  auditRepo: IAuditEventRepository
): Promise<void>
```

Steps:
1. Check idempotency — return early if key already processed
2. Load ingestion (404 if not found)
3. Call `ingestion.applyProcessingStatus(status)` — throws `DomainError` on regressive transition
4. Upsert `ProcessingExecution` record (create or update by `executionId`)
5. Persist updated ingestion status
6. Write audit event

## Files

- `server/application/ingestions/ApplyProcessingStatusUpdate.ts` — create
- `server/infrastructure/repositories/IngestionRepository.ts` — add `findById` and `updateStatus` methods
- `server/api/internal/processing-status-updates.post.ts` — implement (currently stub)
- `test/integration/api/internal-machine-api.test.ts` — extend
- `test/integration/flows/machine-reporting-flow.test.ts` — extend existing test

## Tests

- Integration: valid status update transitions ingestion status and creates execution record; regressive status returns 422 with domain error code; idempotent replay returns 200 without duplicate write; unknown ingestion returns 404; audit event recorded

## Acceptance Criteria

- [ ] `POST /api/internal/processing-status-updates` returns `{ accepted: true }` with `200`
- [ ] Regressive status transition returns `422` with `code: "REGRESSIVE_STATUS_UPDATE"`
- [ ] Idempotent replay (same key + caller) returns `200` without creating duplicate
- [ ] `ProcessingExecution` record is created/updated in DB
- [ ] Ingestion `status` field is updated in DB
- [ ] Audit event recorded with machine `clientId`
- [ ] Wrong scope returns `403`
