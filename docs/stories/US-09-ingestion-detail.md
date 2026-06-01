# US-09 — As an administrator, I want to view the full lifecycle detail of an ingestion including execution history and billing status, so that I can diagnose processing failures and confirm end-to-end progress without needing direct access to infrastructure

**Deliverable**: D1 — Manual upload
**Epic**: Ingestion Creation & Reads
**Type**: User Story
**Dependencies**: US-04
**Layers**: application, infrastructure, api

## Goal

Implement `GET /api/ingestions/:ingestionId` to return full ingestion detail including source metadata, billing-system status, and execution history, role-shaped for the caller.

## Context

- Always returns `waiting_for_mediation` if no processing update has arrived — the status must never be shown as "unknown" or null.
- Administrators see full operational detail: raw storage path, Lambda execution IDs, error summaries, file download link.
- Commercial managers see sanitized metadata: no raw storage paths, no download link, no Lambda execution IDs.
- Execution history is an ordered list of `ProcessingExecution` records, newest first.
- Billing-system status comes from `BillingTransfer` (most recent record for the ingestion).
- Partner scope must be enforced (US-07).

## Scope

**In scope**:
- `GET /api/ingestions/:ingestionId`
- Role-shaped response (admin vs commercial manager)
- Execution history (all `ProcessingExecution` records for the ingestion)
- Billing-system status from `BillingTransfer`
- Partner scope enforcement

**Out of scope**:
- File download (US-27)
- Re-run action (US-28)

## Response shape

```json
{
  "id": "...",
  "partnerId": "...",
  "partnerName": "...",
  "channelId": "...",
  "channelType": "...",
  "billingPeriod": "2026-05",
  "status": "mediation_started",
  "originalFilename": "...",
  "sourceType": "manual_upload",
  "createdAt": "2026-05-17T10:00:00Z",
  "updatedAt": "...",
  "isStuck": false,
  "billingTransfer": {
    "billingReference": "...",
    "billingStatus": "IN_PROGRESS",
    "reportedAt": "..."
  },
  "executions": [
    {
      "id": "...",
      "stage": "mediation",
      "status": "mediation_started",
      "startedAt": "...",
      "errorSummary": null,
      "retryCount": 0
    }
  ]
}
```

**Admin-only fields** added at top level: `sourceObjectKey`, `sourceObjectVersionId`.
**Admin-only fields** added to each execution: `lambdaExecutionId`.
**Admin-only field** at top level: `fileDownloadUrl` (set to `/api/ingestions/{id}/files/{fileId}/download` when a file exists).

## Application service (`server/application/ingestions/GetIngestionDetail.ts`)

```ts
export async function getIngestionDetail(
  ingestionId: string,
  scope: PartnerScope,
  callerRole: 'administrator' | 'commercial_manager',
  repo: IIngestionRepository
): Promise<IngestionDetail | null>
```

Fetches ingestion + executions + billing transfer in one repository call.

## Files

- `server/application/ingestions/GetIngestionDetail.ts` — create
- `server/infrastructure/repositories/IngestionRepository.ts` — add `findDetailById()` with joined executions and billing transfer
- `server/api/ingestions/[ingestionId].get.ts` — create
- `test/integration/api/ingestions.test.ts` — extend

## Tests

- Integration: returns full detail for admin including `sourceObjectKey`; commercial manager response omits `sourceObjectKey` and `lambdaExecutionId`; commercial manager cannot access ingestion for unassigned partner (403); unknown ingestion ID returns 404; ingestion with no processing update returns `status: "waiting_for_mediation"`

## Acceptance Criteria

- [ ] `GET /api/ingestions/:ingestionId` returns detail with `executions` array and `billingTransfer`
- [ ] Status is `"waiting_for_mediation"` if no processing update has been received
- [ ] Admin response includes `sourceObjectKey`, `sourceObjectVersionId`, `lambdaExecutionId` per execution
- [ ] Commercial manager response omits all raw technical fields
- [ ] Unknown ingestion returns `404`
- [ ] Commercial manager accessing unassigned-partner ingestion returns `403`
- [ ] Unauthenticated request returns `401`
