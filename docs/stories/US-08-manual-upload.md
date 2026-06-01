# US-08 — As a commercial manager, I want to upload a dataset file for a partner and billing period via the web application, so that I can trigger the ingestion process when automated collection is unavailable

**Deliverable**: D1 — Manual upload
**Epic**: Ingestion Creation & Reads
**Type**: User Story
**Dependencies**: US-02, US-07, US-20, US-01
**Layers**: domain, application, infrastructure, api

> **D1 simplification**: skip the mediation config validation for now (always allow upload if an active manual-upload channel exists). Wire up the full US-20 dependency when D4 is complete.

## Goal

Implement `POST /api/ingestions/manual-uploads` to validate an uploaded file, create an ingestion record, store the file in S3 with the ingestion ID embedded in the object key, and return the new ingestion ID.

## Context

- Only commercial managers (with an active manual-upload channel for the target partner) can submit manual uploads. Administrators have no default business need to upload files.
- Pre-mediation validation must reject invalid files before creating an ingestion. If validation fails, no ingestion record is created.
- The ingestion is created before the file is stored in S3. The S3 key embeds the ingestion ID: `manual-uploads/{ingestionId}/{originalFilename}`.
- Duplicate uploads for the same partner + billing period are allowed and create separate ingestion records.
- `CreateManualUpload.ts` currently imports `S3Storage` directly — a DDD violation. This story must fix that by introducing an `IIngestionStorage` port.
- `Ingestion.create()` domain method exists. Initial status is `waiting_for_mediation`.
- Billing period is a required field supplied by the user (e.g. `"2026-05"`).
- Accepted MIME types: `text/csv`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

## Scope

**In scope**:
- `IIngestionStorage` port interface in `server/application/ingestions/`
- Fix `CreateManualUpload.ts` to accept `IIngestionStorage` via parameter (remove direct import of `S3Storage`)
- `IIngestionRepository` port (extend or create) with a `save` method
- Full `IngestionRepository.save()` Prisma implementation
- `POST /api/ingestions/manual-uploads` route (multipart/form-data)
- Pre-mediation validation: file type check, non-empty file check
- Audit event on ingestion creation

**Out of scope**:
- Non-web-app ingestion creation (US-14)
- Billing period format validation beyond non-empty (keep simple)
- Channel deactivation check — the API must verify the partner has an active manual-upload channel and reject with 422 if not

## Request

`multipart/form-data`:
- `partnerId: string`
- `billingPeriod: string` (e.g. `"2026-05"`)
- `file: File`

## Response

```json
{
  "ingestionId": "..."
}
```

## Port (`server/application/ingestions/IIngestionStorage.ts`)

```ts
interface IIngestionStorage {
  putObject(input: { key: string; body: ArrayBuffer; contentType: string }): Promise<void>
}
```

## Application service (`server/application/ingestions/CreateManualUpload.ts`)

```ts
export async function createManualUpload(
  input: {
    partnerId: string
    billingPeriod: string
    originalFilename: string
    file: ArrayBuffer
    contentType: string
    actorId: string
  },
  channelRepo: IIngestionChannelRepository,
  ingestionRepo: IIngestionRepository,
  storage: IIngestionStorage,
  auditRepo: IAuditEventRepository
): Promise<{ ingestionId: string }>
```

Steps:
1. Find active manual-upload channel for partner; throw `CHANNEL_NOT_ACTIVE` if none
2. Validate file: non-empty, accepted MIME type; throw `INVALID_FILE` if fails
3. Generate `ingestionId`
4. Call `Ingestion.create(...)` domain method
5. Persist ingestion via `ingestionRepo.save(ingestion)`
6. Store file via `storage.putObject({ key: 'manual-uploads/{ingestionId}/{filename}', ... })`
7. Write audit event
8. Return `{ ingestionId }`

## Files

- `server/application/ingestions/IIngestionStorage.ts` — create
- `server/application/ingestions/IIngestionRepository.ts` — create (port)
- `server/application/ingestions/CreateManualUpload.ts` — rewrite (fix DDD violation)
- `server/infrastructure/storage/S3Storage.ts` — add `implements IIngestionStorage`
- `server/infrastructure/repositories/IngestionRepository.ts` — add `save()` method
- `server/api/ingestions/manual-uploads.post.ts` — implement (currently stub)
- `test/integration/api/manual-upload.test.ts` — extend existing test

## Tests

- Integration: successful upload creates ingestion with status `waiting_for_mediation` and stores file; unsupported file type returns 422; partner without active manual-upload channel returns 422 with `CHANNEL_NOT_ACTIVE`; missing billing period returns 422; unauthenticated returns 401; audit event recorded

## Acceptance Criteria

- [ ] `POST /api/ingestions/manual-uploads` returns `{ ingestionId }` on success with status `201`
- [ ] Ingestion is created in DB with status `waiting_for_mediation` before S3 write
- [ ] S3 key is `manual-uploads/{ingestionId}/{originalFilename}`
- [ ] Unsupported file type returns `422` with `code: "INVALID_FILE"`
- [ ] Partner with no active manual-upload channel returns `422` with `code: "CHANNEL_NOT_ACTIVE"`
- [ ] `CreateManualUpload.ts` has no import from `server/infrastructure/`
- [ ] Audit event recorded with actor and ingestion ID
