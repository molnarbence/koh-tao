# S3 Upload — Vertical Slice (rebuild from scratch)

**Date:** 2026-06-14
**Status:** Approved (design)

## Summary

Strip the existing Koh Tao domain (ingestions, partners, mediation, audit, billing)
down to the scaffolding and rebuild a single clean vertical slice: **upload a file to
an S3 bucket and record an upload-history entry with a status**. No authentication, one
predefined S3 key prefix, no audit.

The slice follows the repository's established DDD layering (`domain → application port →
infrastructure → api`) per the `add-feature` skill, and corrects the existing pattern
violation in `CreateManualUpload.ts` (which imported infrastructure and instantiated
`S3Storage` inside the application layer).

## Scope

### In scope
- Upload a single file via a web page; the bytes land in an S3 bucket under a fixed prefix.
- Persist one upload-history record per upload, with a status lifecycle.
- A history page listing past uploads with their status.
- Persistent navigation between the two pages.
- Local development against an S3-compatible MinIO container via Aspire.

### Out of scope
- Authentication / authorization (explicitly removed).
- Audit logging.
- Partners, channels, mediation, billing, processing executions.
- Multi-file upload, resumable/chunked upload, download, delete.
- User-configurable prefixes or buckets (prefix is predefined in config).

## Teardown & what survives

**Deleted (old domain):**
- API: `server/api/{ingestions,partners,mediation,internal,audit-events}/…`
- Application: `server/application/{ingestions,partners,mediation}/…`
- Domain: `server/domain/{ingestions,mediation}/…`
- Infrastructure: audit/partner/billing/mediation repos; the fake `S3Storage` stub is rewritten.
- Pages/components: `pages/{ingestions,partners,audit}`, `components/{ingestions,partners,audit}`.
- Auth: `server/utils/auth.ts`, `server/utils/authorization.ts`, all `auth0*` config.
- Prisma models: `Partner`, `IngestionChannel`, `MediationBlueprint`, `ProcessingExecution`,
  `BillingTransfer`, `AuditEvent`. `prisma/seed.ts` emptied/removed.
- Corresponding tests under `test/` (audit, partner-configuration, machine-reporting,
  manual-upload, mediation, env-example/Auth0 smoke).

**Survives (scaffolding):**
- Nuxt 4 + Tailwind, `app.vue` shell, Aspire apphost, Bun, Prisma + Postgres wiring.
- The vertical-slice DDD layer convention and `add-feature` / `ddd-reviewer` tooling.
- The `test/{domain,integration,smoke}` harness structure.

## Architecture

Single bounded context: `uploads`. Layers:

```
pages/ components/        → UI (Upload, History, Nav)
server/api/uploads/       → HTTP edge: validation, instantiate concretes, call app services
server/application/uploads/ → app services + port interfaces (no infra imports)
server/domain/uploads/    → Upload entity + UploadStatus (pure, no I/O)
server/infrastructure/    → S3Storage (Bun S3 client), UploadRepository (Prisma)
```

### Domain (`server/domain/uploads/`)

**`UploadStatus.ts`**
```ts
export const UPLOAD_STATUSES = ['pending', 'stored', 'failed'] as const
export type UploadStatus = (typeof UPLOAD_STATUSES)[number]
```
Transition guard: from `pending` → `stored` or `failed`; `stored` and `failed` are terminal.
Any other transition throws.

**`Upload.ts`** — entity:
- Fields: `id`, `originalFilename`, `objectKey`, `status`, `createdAt`.
- `Upload.create({ id, originalFilename, objectKey })` → starts `pending`; rejects empty filename.
- `markStored()` → `pending → stored` via the guard.
- `markFailed()` → `pending → failed` via the guard.
- `objectKey` is computed at the application edge and passed in; the domain only holds it.

### Application (`server/application/uploads/`)

**Port interfaces:**
```ts
interface IUploadStorage {
  putObject(input: { key: string; body: ArrayBuffer; contentType?: string }): Promise<void>
}
interface IUploadRepository {
  save(upload: Upload): Promise<void>
  setStatus(id: string, status: UploadStatus): Promise<void>
  list(): Promise<Upload[]>   // newest first
}
```

**Services** (deps injected as params; import only domain + interfaces):
- `createUpload({ originalFilename, file }, storage, repo)`:
  1. `Upload.create(...)` with generated `uuidv7` id and computed `objectKey =
     "<prefix>/<id>/<originalFilename>"`.
  2. `repo.save(upload)` — persists the `pending` row.
  3. `storage.putObject(...)`. On success `markStored()`, on throw `markFailed()`,
     then `repo.setStatus(...)`.
  4. Returns the upload with its final status. On storage failure the row stays `failed`
     and the error is rethrown for the API to surface.
- `listUploads(repo)` → `repo.list()`.

### Infrastructure (`server/infrastructure/`)

- `storage/S3Storage.ts` implements `IUploadStorage` using **Bun's built-in S3 client**
  (`import { S3Client } from 'bun'`) — no `@aws-sdk/*` dependency. Constructed with
  endpoint/region/bucket/credentials passed in from the API edge; `putObject` writes via
  `client.write(key, bytes, { type })`. Path-style addressing is Bun's default
  (`virtualHostedStyle` left off), which MinIO requires; the same code talks to real
  AWS in prod (empty endpoint). Bun's S3 client has **no bucket-management API**, so bucket
  provisioning lives outside the app (see Local dev and Testing).
- `repositories/UploadRepository.ts` implements `IUploadRepository` via Prisma, mapping
  Prisma rows ↔ `Upload` entities. Never leaks raw Prisma types upward.

### API (`server/api/uploads/`) — only place concretes are instantiated

- `index.post.ts` — reads `multipart/form-data`, Zod-validates filename (non-empty) and
  size (max limit), instantiates `S3Storage` + `UploadRepository`, calls `createUpload`.
- `index.get.ts` — instantiates `UploadRepository`, calls `listUploads`, returns history JSON.

## Data model (Prisma)

```prisma
model Upload {
  id               String   @id
  originalFilename String
  objectKey        String
  status           String
  createdAt        DateTime @default(now())

  @@index([createdAt(sort: Desc)])
}
```

All prior models removed. `id` has no DB default — the application generates a `uuidv7`
(`Bun.randomUUIDv7()`) at the API edge and passes it down.

## S3 layout & configuration

- One predefined prefix (config, not user-supplied). Default `uploads/`.
- Object key: `uploads/<uploadId>/<originalFilename>`.
- Bucket name from config; dev default `koh-tao-raw`.

**Config** (`nuxt.config.ts` runtimeConfig + `.env.example`) — drop all `auth0*`; add/keep:
- `s3Bucket` (default `koh-tao-raw`)
- `s3Prefix` (default `uploads`)
- `awsRegion` (default `eu-west-1`)
- `s3Endpoint` — MinIO URL in dev, empty in prod (Bun's S3 client then targets real AWS)
- `awsAccessKeyId` / `awsSecretAccessKey` — `minioadmin`/`minioadmin` for MinIO dev, real creds in prod
  (dev `awsRegion` is `us-east-1` to match MinIO's default signing region)

Under Aspire these are injected automatically; `.env.example` documents the standalone path.

## UI

Plain Nuxt pages + Tailwind, matching the surviving `app.vue` shell. No auth/guards.

- `app.vue` → `<AppNav />` + `<NuxtPage />`.
- `components/AppNav.vue` — top bar: app name + active-aware `NuxtLink`s **Upload** (`/`)
  and **History** (`/uploads`).
- `pages/index.vue` (Upload) + `components/uploads/UploadForm.vue` — single file input,
  `POST /api/uploads` as multipart; inline success (filename + `stored`) or error message.
- `pages/uploads/index.vue` (History) + `components/uploads/UploadHistoryTable.vue` —
  `GET /api/uploads`, table of filename / status badge (green `stored`, red `failed`,
  grey `pending`) / uploaded-at, newest first, with an empty state.

## Local dev (Aspire + MinIO)

`apphost.cs`:
- Add a MinIO container (`minio/minio`, fixed name `koh-tao-minio`, `server --console-address
  :9001 /data`), API port `9000` + console `9001`, root user/password `minioadmin`.
- Bun app `.WaitFor(minio)` + env: `NUXT_S3_ENDPOINT` (MinIO API endpoint), `NUXT_AWS_REGION`
  (`us-east-1`), `NUXT_AWS_ACCESS_KEY_ID`/`NUXT_AWS_SECRET_ACCESS_KEY` (`minioadmin`),
  `NUXT_S3_BUCKET`, `NUXT_S3_PREFIX`.
- Postgres unchanged.

Bucket bootstrap: Bun's S3 client cannot create buckets and MinIO rejects unsigned PUTs, so
the dev bucket is created in `scripts/aspire-dev.ts` via the `mc` client bundled in the MinIO
container — `docker exec koh-tao-minio mc mb --ignore-existing local/<bucket>` (with an
alias+retry loop for readiness), guarded to run only when `NUXT_S3_BUCKET` is set.
Production buckets are assumed pre-provisioned (buckets aren't created at runtime in prod).

`scripts/aspire-dev.ts` flow: Prisma generate + `bunx prisma db push` → create-bucket (dev
only, via `mc`) → Nuxt dev.

## Testing

Mirrors `test/{domain,integration,smoke}`:
- **Domain unit** (`test/domain/uploads/`) — `Upload` transitions (`pending→stored`,
  `pending→failed`), illegal transitions throw, empty filename rejected. No I/O.
- **Application unit** — `createUpload` with in-memory fake `IUploadStorage` +
  `IUploadRepository`: row saved `pending` first; `stored` on success; `failed` + rethrow
  when storage throws.
- **Integration** (Docker) — boots Postgres + MinIO (via `@testcontainers/minio`), creates
  the bucket with `mc` (run through `docker exec`, since testcontainers' `exec()` hangs under
  Bun), then drives `createUpload` / `listUploads` through the real `S3Storage` +
  `UploadRepository`: the object lands in the bucket (read back via Bun's S3 client) and the
  history row shows `stored`.
- **Smoke** — update app-shell/aspire smoke tests for new nav/pages; remove obsolete
  audit/env-example/Auth0 smoke tests.

## Error handling

- S3 put fails → upload persisted as `failed`; the application throws a typed
  `StorageError` (wrapping the cause), which the API maps to `502`. Other failures (e.g.
  database down) are not disguised as storage errors — they surface as `500`. The upload
  page shows the failure; history still shows the `failed` row.
- Zod validation (missing file, empty filename, oversized) → `400` before domain/S3 work.
- Bucket creation is idempotent (`mc mb --ignore-existing`).
- No file / multiple files → rejected at the API edge.

## Open questions

None outstanding — all design decisions resolved during brainstorming.
