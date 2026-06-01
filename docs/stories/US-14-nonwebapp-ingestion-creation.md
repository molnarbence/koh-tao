# US-14 — As the mediation Lambda, I want to register a new ingestion record before processing begins, so that the web application has a lifecycle record to track and display status against

**Deliverable**: D4 — Machine reporting
**Epic**: M2M Auth & Ingestion Lifecycle
**Type**: User Story
**Dependencies**: US-13, US-01
**Layers**: domain, application, infrastructure, api

## Goal

Implement `POST /api/internal/ingestions` so the mediation layer can register a new ingestion via M2M credentials and receive the ingestion ID in response.

## Context

- The mediation layer calls this endpoint when it begins processing a file that arrived via SFTP or API collector.
- Each call creates a new, independent ingestion record — even if the same partner, billing period, channel, and source object key were already submitted before. Repeated calls are separate business events unless the caller reuses the same idempotency key as a transport retry.
- The immutable source object version identifier (e.g. S3 version ID or ETag) is required and must be rejected if missing.
- Caller must carry scope `write:ingestions` (from US-13 `SCOPES` constants).
- Stub route exists at `server/api/internal/ingestions/index.post.ts`.
- `Ingestion.create()` domain method already sets initial status to `waiting_for_mediation`.

## Scope

**In scope**:
- `POST /api/internal/ingestions` M2M endpoint
- Idempotency key support: if `X-Idempotency-Key` header matches a previously accepted request for this caller, return the original response without creating a duplicate ingestion
- Required fields: `partnerId`, `channelId`, `billingPeriod`, `sourceObjectKey`, `sourceObjectVersionId`, `originalFilename`, `sourceType`
- Reject if `sourceObjectVersionId` is missing or empty
- Audit event recording with machine client identity

**Out of scope**:
- Processing status updates (US-16)
- Validation of `sourceType` beyond requiring it to be present

## Request body

```json
{
  "partnerId": "...",
  "channelId": "...",
  "billingPeriod": "2026-05",
  "sourceObjectKey": "s3://...",
  "sourceObjectVersionId": "...",
  "originalFilename": "usage.xlsx",
  "sourceType": "sftp"
}
```

## Response

```json
{ "ingestionId": "..." }
```

Returns `201` on creation, `200` on idempotent replay.

## Application service (`server/application/ingestions/RegisterExternalIngestion.ts`)

```ts
export async function registerExternalIngestion(
  input: {
    partnerId: string; channelId: string; billingPeriod: string
    sourceObjectKey: string; sourceObjectVersionId: string
    originalFilename: string; sourceType: string
    idempotencyKey?: string; machineClientId: string
  },
  ingestionRepo: IIngestionRepository,
  auditRepo: IAuditEventRepository
): Promise<{ ingestionId: string; created: boolean }>
```

Steps:
1. If `idempotencyKey` provided, check for existing ingestion with same key + clientId — return existing if found
2. Reject if `sourceObjectVersionId` empty
3. Generate ID, call `Ingestion.create(...)`, persist
4. Store idempotency key if provided
5. Write audit event with `machineClientId`

## Files

- `server/application/ingestions/RegisterExternalIngestion.ts` — create
- `server/api/internal/ingestions/index.post.ts` — implement (currently stub)
- `test/integration/api/internal-machine-api.test.ts` — extend existing test

## Tests

- Integration: successful creation returns `{ ingestionId }` with status 201; missing `sourceObjectVersionId` returns 422; same idempotency key from same caller returns same ingestion ID with status 200; missing required fields return 422; missing/invalid M2M token returns 401; wrong scope returns 403

## Acceptance Criteria

- [ ] `POST /api/internal/ingestions` returns `{ ingestionId }` with `201`
- [ ] Missing `sourceObjectVersionId` returns `422` with `code: "MISSING_VERSION_ID"`
- [ ] Repeated request with same `X-Idempotency-Key` from same caller returns `200` with same `ingestionId`
- [ ] New request without idempotency key always creates a new ingestion
- [ ] Unauthenticated returns `401`; wrong scope returns `403`
- [ ] Audit event recorded with machine `clientId`
