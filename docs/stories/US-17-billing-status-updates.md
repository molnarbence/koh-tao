# US-17 — As the billing status polling job, I want to report the downstream billing system's file processing status for an ingestion, so that operators can see the complete end-to-end outcome

**Deliverable**: D4 — Machine reporting
**Epic**: M2M Auth & Ingestion Lifecycle
**Type**: User Story
**Dependencies**: US-13, US-14, US-01
**Layers**: domain, application, infrastructure, api

## Goal

Implement `POST /api/internal/billing-status-updates` so the billing-status polling job can report downstream billing-system file processing progress against an ingestion.

## Context

- The billing-status polling job runs every 10 minutes and reports progress using Auth0 client credentials.
- Billing-system status is separate from ingestion status and uses its own vocabulary: `PENDING`, `IN_PROGRESS`, `PROCESSED`, `FAILED`.
- `BillingTransfer` Prisma model exists (visible in the schema) — use it to persist billing status records.
- If the polling job cannot find a matching uploaded CSV or gets an ambiguous result, it should report `FAILED`.
- A configurable polling timeout: if no `PROCESSED` or `FAILED` status arrives within the configured window, the application should mark the billing transfer as timed out. The timeout is configurable per environment (runtime config key: `billingStatusTimeoutMinutes`).
- Required scope: `write:billing-status`.
- Idempotency: `X-Idempotency-Key` support same as US-16.
- Stub route exists at `server/api/internal/billing-status-updates.post.ts`.

## Scope

**In scope**:
- `POST /api/internal/billing-status-updates`
- Upsert `BillingTransfer` record with latest status and timestamp
- Idempotency key deduplication
- Timeout detection: if last update was more than `billingStatusTimeoutMinutes` ago and status is still `PENDING` or `IN_PROGRESS`, mark as `FAILED` with reason `POLLING_TIMEOUT`
- Audit event with machine client identity

**Out of scope**:
- Surfacing billing status on ingestion detail reads (US-09)
- Processing status updates (US-16)

## Request body

```json
{
  "ingestionId": "...",
  "billingReference": "...",
  "billingStatus": "IN_PROGRESS",
  "timestamp": "2026-05-17T10:10:00Z",
  "pollingIdentity": "polling-job-instance-1"
}
```

## Response

```json
{ "accepted": true }
```

## BillingTransfer model (check/extend schema if needed)

```prisma
model BillingTransfer {
  id               String    @id @default(uuid(7))
  ingestionId      String
  billingReference String?
  billingStatus    String    // PENDING | IN_PROGRESS | PROCESSED | FAILED
  failureReason    String?
  reportedAt       DateTime
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  ingestion        Ingestion @relation(fields: [ingestionId], references: [id])
}
```

## Application service (`server/application/ingestions/ApplyBillingStatusUpdate.ts`)

```ts
export async function applyBillingStatusUpdate(
  input: {
    ingestionId: string; billingReference: string; billingStatus: BillingStatus
    timestamp: Date; pollingIdentity: string
    idempotencyKey?: string; machineClientId: string
  },
  ingestionRepo: IIngestionRepository,
  billingTransferRepo: IBillingTransferRepository,
  auditRepo: IAuditEventRepository,
  config: { billingStatusTimeoutMinutes: number }
): Promise<void>
```

## Files

- `server/application/ingestions/ApplyBillingStatusUpdate.ts` — create
- `server/application/ingestions/IBillingTransferRepository.ts` — create port
- `server/infrastructure/repositories/BillingTransferRepository.ts` — create
- `server/api/internal/billing-status-updates.post.ts` — implement (currently stub)
- `test/integration/api/internal-machine-api.test.ts` — extend
- `test/integration/flows/machine-reporting-flow.test.ts` — extend

## Tests

- Integration: status update upserts BillingTransfer; timeout detection marks transfer as FAILED when within timeout window; idempotent replay returns 200 without duplicate write; unknown ingestion returns 404; audit recorded

## Acceptance Criteria

- [ ] `POST /api/internal/billing-status-updates` returns `{ accepted: true }` with `200`
- [ ] `BillingTransfer` record is created or updated with correct `billingStatus`
- [ ] Ingestion that exceeds `billingStatusTimeoutMinutes` without terminal status is marked `FAILED` with `failureReason: "POLLING_TIMEOUT"`
- [ ] Idempotent replay (same key) does not create a duplicate record
- [ ] Unknown `ingestionId` returns `404`
- [ ] Wrong scope returns `403`
- [ ] Audit event recorded with machine `clientId`
