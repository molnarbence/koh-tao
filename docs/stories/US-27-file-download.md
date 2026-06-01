# US-27 — As an administrator, I want to download the original uploaded file for an ingestion, so that I can investigate data quality issues or verify what was submitted

**Deliverable**: D5 — Operator actions & audit
**Epic**: Operator Actions & Audit
**Type**: User Story
**Dependencies**: US-09, US-01
**Layers**: infrastructure, api

## Goal

Implement `GET /api/ingestions/:ingestionId/files/:fileId/download` so administrators can download the original uploaded file through an authenticated application endpoint using a pre-signed S3 URL.

## Context

- Administrator only — commercial managers cannot access this endpoint.
- The application does not serve the file bytes directly; it generates a short-lived S3 pre-signed URL and redirects the browser.
- The `fileId` in the URL corresponds to the ingestion's source file reference (S3 object key stored on the ingestion record). For MVP, `fileId` can be treated as an opaque token that maps to the `sourceObjectKey` — the mapping lives in the repository.
- Pre-signed URL TTL: 5 minutes (configurable via `fileDownloadUrlTtlSeconds` runtime config, default 300).
- Audit event must be recorded (US-01): administrator identity, ingestionId, fileId, timestamp.

## Scope

**In scope**:
- `GET /api/ingestions/:ingestionId/files/:fileId/download`
- Verify ingestion exists and caller is administrator (403 for commercial managers)
- Generate pre-signed S3 GET URL for the ingestion's source object key
- Respond with `302` redirect to the pre-signed URL
- Audit event recording

**Out of scope**:
- Serving file bytes directly
- Multiple file attachments per ingestion (MVP: one file per ingestion)

## Port addition (`server/application/ingestions/IIngestionStorage.ts`)

Add to the existing `IIngestionStorage` interface from US-08:
```ts
getPresignedDownloadUrl(key: string, ttlSeconds: number): Promise<string>
```

## Infrastructure (`server/infrastructure/storage/S3Storage.ts`)

Implement `getPresignedDownloadUrl` using the AWS SDK `GetObjectCommand` + `getSignedUrl`.

## API route (`server/api/ingestions/[ingestionId]/files/[fileId]/download.get.ts`)

```ts
// Pseudocode
requireUser(event)
requireAdministrator(event)                          // 403 if not admin
const ingestion = await ingestionRepo.findDetailById(ingestionId)
if (!ingestion) throw 404
const url = await storage.getPresignedDownloadUrl(ingestion.sourceObjectKey, ttlSeconds)
await auditRepo.write({ ... })
return sendRedirect(event, url, 302)
```

## Files

- `server/application/ingestions/IIngestionStorage.ts` — add `getPresignedDownloadUrl`
- `server/infrastructure/storage/S3Storage.ts` — implement `getPresignedDownloadUrl`
- `server/api/ingestions/[ingestionId]/files/[fileId]/download.get.ts` — create
- `server/utils/authorization.ts` — add `requireAdministrator(event)` helper
- `test/integration/api/ingestions.test.ts` — extend

## Tests

- Integration: admin request returns 302 redirect to pre-signed URL; commercial manager returns 403; unknown ingestion returns 404; audit event recorded

## Acceptance Criteria

- [ ] `GET .../files/:fileId/download` returns `302` redirect to a pre-signed S3 URL
- [ ] Commercial manager returns `403`
- [ ] Unknown ingestion returns `404`
- [ ] Pre-signed URL TTL matches configured value
- [ ] Audit event recorded with actor identity, ingestionId, and timestamp
