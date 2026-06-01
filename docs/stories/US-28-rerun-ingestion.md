# US-28 — As an administrator, I want to trigger a new execution attempt for a failed ingestion, so that I can recover from transient processing failures without requiring a new file upload

**Deliverable**: D5 — Operator actions & audit
**Epic**: Operator Actions & Audit
**Type**: User Story
**Dependencies**: US-09, US-01
**Layers**: domain, application, infrastructure, api

## Goal

Implement `POST /api/ingestions/:ingestionId/re-run` so administrators can trigger a new execution attempt under the same ingestion, including for ingestions in `data_quality_validation_failed` state.

## Context

- Administrator only.
- "Re-run" and "retry" are the same business action; the canonical API and UI term is `re-run`.
- Re-run creates a new `ProcessingExecution` record under the same ingestion — it does not create a new ingestion.
- No reason field required for re-run.
- Re-run is allowed in any non-terminal state and also after `data_quality_validation_failed`.
- The domain should record the new execution attempt with status `waiting_for_mediation` (the ingestion itself is reset to that status; the Lambda will call US-16 to advance it).
- Audit event required: actor, ingestionId, timestamp.

## Scope

**In scope**:
- `POST /api/ingestions/:ingestionId/re-run`
- Create new `ProcessingExecution` record
- Reset ingestion status to `waiting_for_mediation`
- Audit recording

**Out of scope**:
- Actually triggering the Lambda (the application signals willingness to re-run by resetting status; the Lambda polling loop or event source picks it up)
- Reason field (not required per design)
- Commercial manager access (admin only)

## Domain addition (`server/domain/ingestions/Ingestion.ts`)

```ts
rerun(): ProcessingExecution {
  this.status = 'waiting_for_mediation'
  return ProcessingExecution.createNew({ ingestionId: this.id })
}
```

`ProcessingExecution.createNew()` generates a new execution ID and sets initial state.

## Application service (`server/application/ingestions/RerunIngestion.ts`)

```ts
export async function rerunIngestion(
  input: { ingestionId: string; actorId: string },
  ingestionRepo: IIngestionRepository,
  auditRepo: IAuditEventRepository
): Promise<{ executionId: string }>
```

Steps:
1. Load ingestion (404 if not found)
2. Call `ingestion.rerun()` — returns new `ProcessingExecution`
3. Persist updated ingestion status
4. Persist new `ProcessingExecution`
5. Write audit event
6. Return `{ executionId }`

## Response

```json
{ "executionId": "..." }
```

Status `202 Accepted`.

## Files

- `server/domain/ingestions/Ingestion.ts` — add `rerun()` method
- `server/domain/ingestions/ProcessingExecution.ts` — add `createNew()` static method
- `server/application/ingestions/RerunIngestion.ts` — create
- `server/api/ingestions/[ingestionId]/re-run.post.ts` — create
- `test/domain/ingestions/ingestion.test.ts` — extend with re-run behavior tests
- `test/integration/api/ingestions.test.ts` — extend

## Tests

- Unit: `rerun()` resets status to `waiting_for_mediation`; `rerun()` succeeds after `data_quality_validation_failed`
- Integration: admin re-run returns 202 with `executionId`; commercial manager returns 403; unknown ingestion returns 404; new `ProcessingExecution` record exists in DB with correct initial state; audit event recorded

## Acceptance Criteria

- [ ] `POST /api/ingestions/:ingestionId/re-run` returns `{ executionId }` with `202`
- [ ] Ingestion status is reset to `waiting_for_mediation` in DB
- [ ] New `ProcessingExecution` record is created in DB
- [ ] Re-run succeeds after `data_quality_validation_failed`
- [ ] Commercial manager returns `403`
- [ ] Unknown ingestion returns `404`
- [ ] Audit event recorded with actor and ingestionId
