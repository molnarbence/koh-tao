# S3 Upload Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the Koh Tao app to its scaffolding and rebuild a single vertical slice that uploads a file to an S3 bucket (no auth, fixed prefix) and records an upload-history entry with a `pending → stored/failed` status.

**Architecture:** DDD layering per the repo's `add-feature` rule — pure `domain/uploads`, an `application/uploads` layer that depends only on port interfaces, `infrastructure` implementations (AWS SDK + Prisma), and thin `api/uploads` routes that wire concretes. Local dev runs against a LocalStack S3 container added to the Aspire apphost; Postgres survives for the history table only.

**Tech Stack:** Nuxt 4, Bun (test runner + runtime), Prisma 7 (+ `@prisma/adapter-pg`), PostgreSQL 18, `@aws-sdk/client-s3`, LocalStack, Aspire, Tailwind, Zod, `bun:test`, testcontainers.

**Spec:** `docs/superpowers/specs/2026-06-14-s3-upload-vertical-slice-design.md`

**Conventions for the implementer:**
- Tests use `bun:test` (`import { expect, test } from 'bun:test'`).
- Run a single test file with `bun test <path>`; unit suite is `bun run test:unit`.
- IDs are generated with `Bun.randomUUIDv7()` (this repo runs on Bun everywhere).
- Application services receive dependencies as parameters typed to interfaces — never import `server/infrastructure/*` from `server/application/*`, never import `@prisma/client` or AWS SDK from `server/domain/*`.

---

## File Structure

**Created:**
- `server/domain/uploads/UploadStatus.ts` — status constants + transition guard
- `server/domain/uploads/Upload.ts` — `Upload` entity (create / rehydrate / markStored / markFailed)
- `server/application/uploads/ports.ts` — `IUploadStorage`, `IUploadRepository`
- `server/application/uploads/createUpload.ts` — create-and-store use case
- `server/application/uploads/listUploads.ts` — list history use case
- `server/infrastructure/repositories/UploadRepository.ts` — Prisma implementation
- `server/api/uploads/index.post.ts` — multipart upload route
- `server/api/uploads/index.get.ts` — history route
- `components/AppNav.vue` — top navigation
- `components/uploads/UploadForm.vue` — file picker + submit
- `components/uploads/UploadHistoryTable.vue` — history table
- `pages/uploads/index.vue` — history page
- `test/domain/uploads/upload-status.test.ts`
- `test/domain/uploads/upload.test.ts`
- `test/application/uploads/create-upload.test.ts`
- `test/application/uploads/list-uploads.test.ts`
- `test/integration/uploads/upload-flow.test.ts`

**Modified:**
- `server/infrastructure/storage/S3Storage.ts` — replace stub with real AWS SDK impl
- `prisma/schema.prisma` — collapse to a single `Upload` model
- `prisma/seed.ts` — empty it
- `nuxt.config.ts` — drop Auth0, add S3 runtime config
- `.env.example` — drop Auth0, document S3 vars
- `apphost.cs` — add LocalStack container + env wiring
- `app.vue` — nav + main wrapper
- `pages/index.vue` — upload page
- `test/smoke/env-example.test.ts` — assert new vars
- `package.json` — `@aws-sdk/client-s3` dependency (via `bun add`)

**Deleted:** see Task 1.

---

## Task 1: Teardown — remove the old domain

**Files:**
- Delete directories: `server/api/ingestions`, `server/api/internal`, `server/api/partners`, `server/api/mediation-blueprints`, `server/api/audit-events`, `server/application/ingestions`, `server/application/mediation`, `server/application/partners`, `server/domain/ingestions`, `server/domain/mediation`, `server/infrastructure/repositories` (the old repos), `server/utils`, `components/ingestions`, `components/partners`, `components/audit`, `pages/ingestions`, `pages/partners`, `pages/audit`
- Delete tests: `test/domain/auth`, `test/domain/ingestions`, `test/integration/api`, `test/integration/flows`, `test/integration/repositories`, `test/integration/prisma`
- Keep: `lib/`, `test/domain/lib`, `test/smoke`, `server/infrastructure/prisma/client.ts`, `server/infrastructure/storage/S3Storage.ts` (rewritten later)

- [ ] **Step 1: Delete the old slice directories and tests**

```bash
git rm -r \
  server/api/ingestions server/api/internal server/api/partners \
  server/api/mediation-blueprints server/api/audit-events \
  server/application/ingestions server/application/mediation server/application/partners \
  server/domain/ingestions server/domain/mediation \
  server/infrastructure/repositories \
  server/utils \
  components/ingestions components/partners components/audit \
  pages/ingestions pages/partners pages/audit \
  test/domain/auth test/domain/ingestions \
  test/integration/api test/integration/flows test/integration/repositories test/integration/prisma
```

- [ ] **Step 2: Reset the home page to a placeholder so the app still compiles**

Overwrite `pages/index.vue`:

```vue
<template>
  <p>Koh Tao</p>
</template>
```

- [ ] **Step 3: Verify the unit suite still runs (only lib + smoke remain)**

Run: `bun run test:unit`
Expected: PASS — remaining tests are `test/domain/lib/*`, `test/smoke/*`. (The `env-example` smoke test still passes here because `.env.example` is untouched so far.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove legacy ingestion/partner/mediation/audit slices"
```

---

## Task 2: Prisma schema — single Upload model

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Replace the schema with one model**

Overwrite `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Upload {
  id               String   @id
  originalFilename String
  objectKey        String
  status           String
  createdAt        DateTime @default(now())

  @@index([createdAt(sort: Desc)])
}
```

(Note: `id` has no `@default` — the application generates a uuidv7 and passes it in.)

- [ ] **Step 2: Empty the seed file**

Overwrite `prisma/seed.ts`:

```ts
// No seed data required for the upload slice.
export {}
```

- [ ] **Step 3: Regenerate the Prisma client**

Run: `bun run prisma:generate`
Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat: collapse prisma schema to single Upload model"
```

---

## Task 3: Domain — UploadStatus + transition guard

**Files:**
- Create: `server/domain/uploads/UploadStatus.ts`
- Test: `test/domain/uploads/upload-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/domain/uploads/upload-status.test.ts`:

```ts
import { expect, test } from 'bun:test'
import { UPLOAD_STATUSES, assertTransition } from '../../../server/domain/uploads/UploadStatus'

test('exposes the three upload statuses', () => {
  expect(UPLOAD_STATUSES).toEqual(['pending', 'stored', 'failed'])
})

test('allows pending to stored and pending to failed', () => {
  expect(() => assertTransition('pending', 'stored')).not.toThrow()
  expect(() => assertTransition('pending', 'failed')).not.toThrow()
})

test('rejects transitions out of terminal states', () => {
  expect(() => assertTransition('stored', 'failed')).toThrow('Invalid status transition')
  expect(() => assertTransition('failed', 'stored')).toThrow('Invalid status transition')
  expect(() => assertTransition('pending', 'pending')).toThrow('Invalid status transition')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/domain/uploads/upload-status.test.ts`
Expected: FAIL — cannot resolve module `UploadStatus`.

- [ ] **Step 3: Implement UploadStatus**

Create `server/domain/uploads/UploadStatus.ts`:

```ts
export const UPLOAD_STATUSES = ['pending', 'stored', 'failed'] as const

export type UploadStatus = (typeof UPLOAD_STATUSES)[number]

const ALLOWED_TRANSITIONS: Record<UploadStatus, UploadStatus[]> = {
  pending: ['stored', 'failed'],
  stored: [],
  failed: []
}

export function assertTransition(current: UploadStatus, next: UploadStatus) {
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid status transition: ${current} -> ${next}`)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/domain/uploads/upload-status.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/domain/uploads/UploadStatus.ts test/domain/uploads/upload-status.test.ts
git commit -m "feat: add UploadStatus with transition guard"
```

---

## Task 4: Domain — Upload entity

**Files:**
- Create: `server/domain/uploads/Upload.ts`
- Test: `test/domain/uploads/upload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/domain/uploads/upload.test.ts`:

```ts
import { expect, test } from 'bun:test'
import { Upload } from '../../../server/domain/uploads/Upload'

test('new uploads start in pending', () => {
  const upload = Upload.create({ id: 'u_1', originalFilename: 'data.csv', objectKey: 'uploads/u_1/data.csv' })
  expect(upload.status).toBe('pending')
})

test('rejects an empty filename', () => {
  expect(() => Upload.create({ id: 'u_1', originalFilename: '   ', objectKey: 'k' })).toThrow('originalFilename')
})

test('markStored moves pending to stored', () => {
  const upload = Upload.create({ id: 'u_1', originalFilename: 'data.csv', objectKey: 'k' })
  upload.markStored()
  expect(upload.status).toBe('stored')
})

test('markFailed moves pending to failed', () => {
  const upload = Upload.create({ id: 'u_1', originalFilename: 'data.csv', objectKey: 'k' })
  upload.markFailed()
  expect(upload.status).toBe('failed')
})

test('cannot mark a stored upload as failed', () => {
  const upload = Upload.create({ id: 'u_1', originalFilename: 'data.csv', objectKey: 'k' })
  upload.markStored()
  expect(() => upload.markFailed()).toThrow('Invalid status transition')
})

test('rehydrate restores all fields without re-running invariants', () => {
  const createdAt = new Date('2026-06-14T10:00:00Z')
  const upload = Upload.rehydrate({ id: 'u_9', originalFilename: 'old.csv', objectKey: 'uploads/u_9/old.csv', status: 'stored', createdAt })
  expect(upload.id).toBe('u_9')
  expect(upload.status).toBe('stored')
  expect(upload.createdAt).toBe(createdAt)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/domain/uploads/upload.test.ts`
Expected: FAIL — cannot resolve module `Upload`.

- [ ] **Step 3: Implement Upload**

Create `server/domain/uploads/Upload.ts`:

```ts
import { UploadStatus, assertTransition } from './UploadStatus'

type CreateUploadInput = {
  id: string
  originalFilename: string
  objectKey: string
}

type RehydrateUploadInput = {
  id: string
  originalFilename: string
  objectKey: string
  status: UploadStatus
  createdAt: Date
}

export class Upload {
  private constructor(
    readonly id: string,
    readonly originalFilename: string,
    readonly objectKey: string,
    public status: UploadStatus,
    readonly createdAt: Date
  ) {}

  static create(input: CreateUploadInput) {
    if (input.originalFilename.trim().length === 0) {
      throw new Error('originalFilename must not be empty')
    }
    return new Upload(input.id, input.originalFilename, input.objectKey, 'pending', new Date())
  }

  static rehydrate(input: RehydrateUploadInput) {
    return new Upload(input.id, input.originalFilename, input.objectKey, input.status, input.createdAt)
  }

  markStored() {
    assertTransition(this.status, 'stored')
    this.status = 'stored'
  }

  markFailed() {
    assertTransition(this.status, 'failed')
    this.status = 'failed'
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/domain/uploads/upload.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/domain/uploads/Upload.ts test/domain/uploads/upload.test.ts
git commit -m "feat: add Upload domain entity"
```

---

## Task 5: Application — ports + createUpload use case

**Files:**
- Create: `server/application/uploads/ports.ts`
- Create: `server/application/uploads/createUpload.ts`
- Test: `test/application/uploads/create-upload.test.ts`

- [ ] **Step 1: Write the failing test (with in-memory fakes)**

Create `test/application/uploads/create-upload.test.ts`:

```ts
import { expect, test } from 'bun:test'
import { createUpload } from '../../../server/application/uploads/createUpload'
import { Upload } from '../../../server/domain/uploads/Upload'
import type { IUploadStorage, IUploadRepository } from '../../../server/application/uploads/ports'
import type { UploadStatus } from '../../../server/domain/uploads/UploadStatus'

class FakeRepo implements IUploadRepository {
  saved: Upload[] = []
  statusUpdates: Array<{ id: string; status: UploadStatus }> = []
  async save(upload: Upload) { this.saved.push(upload) }
  async setStatus(id: string, status: UploadStatus) { this.statusUpdates.push({ id, status }) }
  async list() { return this.saved }
}

class FakeStorage implements IUploadStorage {
  puts: Array<{ key: string }> = []
  shouldThrow = false
  async putObject(input: { key: string; body: ArrayBuffer }) {
    if (this.shouldThrow) throw new Error('s3 down')
    this.puts.push({ key: input.key })
  }
}

test('persists pending first, stores object, then marks stored', async () => {
  const repo = new FakeRepo()
  const storage = new FakeStorage()

  const upload = await createUpload(
    { id: 'u_1', originalFilename: 'data.csv', file: new ArrayBuffer(4), prefix: 'uploads' },
    storage,
    repo
  )

  expect(repo.saved[0].status).toBe('pending')
  expect(storage.puts[0].key).toBe('uploads/u_1/data.csv')
  expect(repo.statusUpdates).toEqual([{ id: 'u_1', status: 'stored' }])
  expect(upload.status).toBe('stored')
})

test('marks failed and rethrows when storage throws', async () => {
  const repo = new FakeRepo()
  const storage = new FakeStorage()
  storage.shouldThrow = true

  await expect(
    createUpload({ id: 'u_2', originalFilename: 'data.csv', file: new ArrayBuffer(4), prefix: 'uploads' }, storage, repo)
  ).rejects.toThrow('s3 down')

  expect(repo.saved[0].status).toBe('failed')
  expect(repo.statusUpdates).toEqual([{ id: 'u_2', status: 'failed' }])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/application/uploads/create-upload.test.ts`
Expected: FAIL — cannot resolve `ports` / `createUpload`.

- [ ] **Step 3: Implement the ports**

Create `server/application/uploads/ports.ts`:

```ts
import type { Upload } from '../../domain/uploads/Upload'
import type { UploadStatus } from '../../domain/uploads/UploadStatus'

export interface IUploadStorage {
  putObject(input: { key: string; body: ArrayBuffer; contentType?: string }): Promise<void>
}

export interface IUploadRepository {
  save(upload: Upload): Promise<void>
  setStatus(id: string, status: UploadStatus): Promise<void>
  list(): Promise<Upload[]>
}
```

- [ ] **Step 4: Implement createUpload**

Create `server/application/uploads/createUpload.ts`:

```ts
import { Upload } from '../../domain/uploads/Upload'
import type { IUploadStorage, IUploadRepository } from './ports'

type CreateUploadInput = {
  id: string
  originalFilename: string
  file: ArrayBuffer
  contentType?: string
  prefix: string
}

export async function createUpload(
  input: CreateUploadInput,
  storage: IUploadStorage,
  repo: IUploadRepository
): Promise<Upload> {
  const objectKey = `${input.prefix}/${input.id}/${input.originalFilename}`
  const upload = Upload.create({ id: input.id, originalFilename: input.originalFilename, objectKey })

  await repo.save(upload)

  try {
    await storage.putObject({ key: objectKey, body: input.file, contentType: input.contentType })
  } catch (error) {
    upload.markFailed()
    await repo.setStatus(upload.id, 'failed')
    throw error
  }

  upload.markStored()
  await repo.setStatus(upload.id, 'stored')
  return upload
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/application/uploads/create-upload.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add server/application/uploads/ports.ts server/application/uploads/createUpload.ts test/application/uploads/create-upload.test.ts
git commit -m "feat: add createUpload use case and upload ports"
```

---

## Task 6: Application — listUploads use case

**Files:**
- Create: `server/application/uploads/listUploads.ts`
- Test: `test/application/uploads/list-uploads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/application/uploads/list-uploads.test.ts`:

```ts
import { expect, test } from 'bun:test'
import { listUploads } from '../../../server/application/uploads/listUploads'
import { Upload } from '../../../server/domain/uploads/Upload'
import type { IUploadRepository } from '../../../server/application/uploads/ports'
import type { UploadStatus } from '../../../server/domain/uploads/UploadStatus'

class FakeRepo implements IUploadRepository {
  constructor(private uploads: Upload[]) {}
  async save() {}
  async setStatus(_id: string, _status: UploadStatus) {}
  async list() { return this.uploads }
}

test('returns the uploads from the repository', async () => {
  const upload = Upload.rehydrate({
    id: 'u_1', originalFilename: 'a.csv', objectKey: 'uploads/u_1/a.csv',
    status: 'stored', createdAt: new Date('2026-06-14T10:00:00Z')
  })
  const result = await listUploads(new FakeRepo([upload]))
  expect(result).toHaveLength(1)
  expect(result[0].id).toBe('u_1')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/application/uploads/list-uploads.test.ts`
Expected: FAIL — cannot resolve `listUploads`.

- [ ] **Step 3: Implement listUploads**

Create `server/application/uploads/listUploads.ts`:

```ts
import type { Upload } from '../../domain/uploads/Upload'
import type { IUploadRepository } from './ports'

export async function listUploads(repo: IUploadRepository): Promise<Upload[]> {
  return repo.list()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/application/uploads/list-uploads.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add server/application/uploads/listUploads.ts test/application/uploads/list-uploads.test.ts
git commit -m "feat: add listUploads use case"
```

---

## Task 7: Infrastructure — S3Storage (AWS SDK)

**Files:**
- Modify: `server/infrastructure/storage/S3Storage.ts`
- Modify: `package.json` (via `bun add`)

- [ ] **Step 1: Add the AWS SDK dependency**

Run: `bun add @aws-sdk/client-s3`
Expected: adds `@aws-sdk/client-s3` to `dependencies` and updates `bun.lock`.

- [ ] **Step 2: Replace the stub with a real implementation**

Overwrite `server/infrastructure/storage/S3Storage.ts`:

```ts
import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3'
import type { IUploadStorage } from '../../application/uploads/ports'

export type S3StorageConfig = {
  endpoint?: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export class S3Storage implements IUploadStorage {
  private readonly client: S3Client
  private readonly bucket: string
  private bucketEnsured = false

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      forcePathStyle: Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
  }

  private async ensureBucket() {
    if (this.bucketEnsured) return
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }))
    } catch (error) {
      const name = (error as { name?: string }).name
      if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
        throw error
      }
    }
    this.bucketEnsured = true
  }

  async putObject(input: { key: string; body: ArrayBuffer; contentType?: string }) {
    await this.ensureBucket()
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: new Uint8Array(input.body),
        ContentType: input.contentType
      })
    )
  }
}
```

- [ ] **Step 3: Type-check the file**

Run: `bunx tsc --noEmit`
Expected: no errors referencing `S3Storage.ts`. (Pre-existing unrelated errors, if any, are acceptable — confirm none mention `S3Storage`.)

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock server/infrastructure/storage/S3Storage.ts
git commit -m "feat: implement S3Storage with AWS SDK and lazy bucket creation"
```

---

## Task 8: Infrastructure — UploadRepository (Prisma)

**Files:**
- Create: `server/infrastructure/repositories/UploadRepository.ts`

(No isolated unit test — exercised by the integration test in Task 13, matching the repo's existing convention of not unit-testing Prisma repositories.)

- [ ] **Step 1: Implement the repository**

Create `server/infrastructure/repositories/UploadRepository.ts`:

```ts
import { prisma } from '../prisma/client'
import { Upload } from '../../domain/uploads/Upload'
import type { UploadStatus } from '../../domain/uploads/UploadStatus'
import type { IUploadRepository } from '../../application/uploads/ports'

export class UploadRepository implements IUploadRepository {
  async save(upload: Upload) {
    await prisma.upload.create({
      data: {
        id: upload.id,
        originalFilename: upload.originalFilename,
        objectKey: upload.objectKey,
        status: upload.status,
        createdAt: upload.createdAt
      }
    })
  }

  async setStatus(id: string, status: UploadStatus) {
    await prisma.upload.update({ where: { id }, data: { status } })
  }

  async list(): Promise<Upload[]> {
    const rows = await prisma.upload.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map((row) =>
      Upload.rehydrate({
        id: row.id,
        originalFilename: row.originalFilename,
        objectKey: row.objectKey,
        status: row.status as UploadStatus,
        createdAt: row.createdAt
      })
    )
  }
}
```

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit`
Expected: no errors mentioning `UploadRepository.ts` (the `prisma.upload` model exists because Task 2 regenerated the client).

- [ ] **Step 3: Commit**

```bash
git add server/infrastructure/repositories/UploadRepository.ts
git commit -m "feat: add Prisma UploadRepository"
```

---

## Task 9: API routes — upload + history

**Files:**
- Create: `server/api/uploads/index.post.ts`
- Create: `server/api/uploads/index.get.ts`

(`defineEventHandler`, `readMultipartFormData`, `createError`, `useRuntimeConfig` are Nitro auto-imports — no import needed.)

- [ ] **Step 1: Implement the POST route**

Create `server/api/uploads/index.post.ts`:

```ts
import { z } from 'zod'
import { createUpload } from '../../application/uploads/createUpload'
import { S3Storage } from '../../infrastructure/storage/S3Storage'
import { UploadRepository } from '../../infrastructure/repositories/UploadRepository'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const metadataSchema = z.object({
  filename: z.string().trim().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES)
})

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const filePart = parts?.find((part) => part.name === 'file' && part.filename)

  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const metadata = metadataSchema.safeParse({
    filename: filePart.filename,
    size: filePart.data.length
  })
  if (!metadata.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid upload' })
  }

  const config = useRuntimeConfig()
  const storage = new S3Storage({
    endpoint: config.s3Endpoint,
    region: config.awsRegion,
    bucket: config.s3Bucket,
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  })
  const repo = new UploadRepository()

  const body = filePart.data.buffer.slice(
    filePart.data.byteOffset,
    filePart.data.byteOffset + filePart.data.byteLength
  )

  try {
    const upload = await createUpload(
      {
        id: Bun.randomUUIDv7(),
        originalFilename: metadata.data.filename,
        file: body,
        contentType: filePart.type,
        prefix: config.s3Prefix
      },
      storage,
      repo
    )
    return { id: upload.id, originalFilename: upload.originalFilename, status: upload.status }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Upload to storage failed' })
  }
})
```

- [ ] **Step 2: Implement the GET route**

Create `server/api/uploads/index.get.ts`:

```ts
import { listUploads } from '../../application/uploads/listUploads'
import { UploadRepository } from '../../infrastructure/repositories/UploadRepository'

export default defineEventHandler(async () => {
  const repo = new UploadRepository()
  const uploads = await listUploads(repo)
  return uploads.map((upload) => ({
    id: upload.id,
    originalFilename: upload.originalFilename,
    status: upload.status,
    createdAt: upload.createdAt
  }))
})
```

- [ ] **Step 3: Verify routes are wired (Nuxt prepare type-checks server routes)**

Run: `bunx nuxi prepare`
Expected: completes without errors referencing `server/api/uploads/*`.

- [ ] **Step 4: Commit**

```bash
git add server/api/uploads/index.post.ts server/api/uploads/index.get.ts
git commit -m "feat: add upload and history API routes"
```

---

## Task 10: Configuration — runtime config + .env.example

**Files:**
- Modify: `nuxt.config.ts`
- Modify: `.env.example`
- Modify: `test/smoke/env-example.test.ts`

- [ ] **Step 1: Update the env-example smoke test (failing first)**

Overwrite `test/smoke/env-example.test.ts`:

```ts
import { expect, test } from 'bun:test'

test('.env.example documents required environment variables', async () => {
  const content = await Bun.file('.env.example').text()
  expect(content.includes('DATABASE_URL')).toBe(true)
  expect(content.includes('NUXT_S3_BUCKET')).toBe(true)
  expect(content.includes('NUXT_S3_PREFIX')).toBe(true)
  expect(content.includes('NUXT_S3_ENDPOINT')).toBe(true)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun test test/smoke/env-example.test.ts`
Expected: FAIL — `.env.example` does not yet contain `NUXT_S3_BUCKET`.

- [ ] **Step 3: Rewrite .env.example**

Overwrite `.env.example`:

```bash
# Database — not needed when running under Aspire (injected automatically)
DATABASE_URL=postgresql://postgres:password@localhost:5432/koh-tao-dev

# S3 storage — Nuxt maps NUXT_*-prefixed vars onto runtimeConfig
NUXT_AWS_REGION=eu-west-1
NUXT_S3_BUCKET=koh-tao-raw
NUXT_S3_PREFIX=uploads
# Leave NUXT_S3_ENDPOINT empty to use real AWS S3; set it to a LocalStack/MinIO
# URL (e.g. http://localhost:4566) for local emulation.
NUXT_S3_ENDPOINT=
NUXT_AWS_ACCESS_KEY_ID=
NUXT_AWS_SECRET_ACCESS_KEY=
```

- [ ] **Step 4: Update runtimeConfig in nuxt.config.ts**

Overwrite `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    awsRegion: 'eu-west-1',
    s3Bucket: 'koh-tao-raw',
    s3Prefix: 'uploads',
    s3Endpoint: '',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    public: {
      appName: 'Koh Tao'
    }
  },
  compatibilityDate: '2026-05-17'
})
```

- [ ] **Step 5: Run the smoke test to verify it passes**

Run: `bun test test/smoke/env-example.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add nuxt.config.ts .env.example test/smoke/env-example.test.ts
git commit -m "feat: replace Auth0 config with S3 runtime config"
```

---

## Task 11: UI — navigation, app shell, upload page

**Files:**
- Modify: `app.vue`
- Create: `components/AppNav.vue`
- Create: `components/uploads/UploadForm.vue`
- Modify: `pages/index.vue`

- [ ] **Step 1: Create the navigation component**

Create `components/AppNav.vue`:

```vue
<template>
  <header class="border-b border-gray-200 bg-white">
    <nav class="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
      <span class="font-semibold">Koh Tao</span>
      <NuxtLink to="/" exact-active-class="font-semibold text-blue-600" class="text-sm text-gray-600">
        Upload
      </NuxtLink>
      <NuxtLink to="/uploads" exact-active-class="font-semibold text-blue-600" class="text-sm text-gray-600">
        History
      </NuxtLink>
    </nav>
  </header>
</template>
```

- [ ] **Step 2: Update the app shell**

Overwrite `app.vue`:

```vue
<template>
  <div>
    <AppNav />
    <main class="mx-auto max-w-3xl px-4 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
```

- [ ] **Step 3: Create the upload form component**

Create `components/uploads/UploadForm.vue`:

```vue
<script setup lang="ts">
const file = ref<File | null>(null)
const submitting = ref(false)
const result = ref<{ ok: boolean; message: string } | null>(null)

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] ?? null
  result.value = null
}

async function submit() {
  if (!file.value) return
  submitting.value = true
  result.value = null

  const form = new FormData()
  form.append('file', file.value)

  try {
    const response = await $fetch<{ originalFilename: string; status: string }>('/api/uploads', {
      method: 'POST',
      body: form
    })
    result.value = { ok: true, message: `Uploaded ${response.originalFilename} (${response.status})` }
  } catch {
    result.value = { ok: false, message: 'Upload failed. Please try again.' }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <input type="file" class="block text-sm" @change="onFileChange" />
    <button
      type="submit"
      :disabled="!file || submitting"
      class="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
    >
      {{ submitting ? 'Uploading…' : 'Upload' }}
    </button>
    <p v-if="result" :class="result.ok ? 'text-green-600' : 'text-red-600'" class="text-sm">
      {{ result.message }}
    </p>
  </form>
</template>
```

- [ ] **Step 4: Update the upload page**

Overwrite `pages/index.vue`:

```vue
<template>
  <div>
    <h1 class="mb-4 text-xl font-semibold">Upload a file</h1>
    <UploadForm />
  </div>
</template>
```

- [ ] **Step 5: Verify the project still prepares**

Run: `bunx nuxi prepare`
Expected: completes without errors. (`AppNav` and `UploadForm` resolve via Nuxt component auto-import.)

- [ ] **Step 6: Commit**

```bash
git add app.vue components/AppNav.vue components/uploads/UploadForm.vue pages/index.vue
git commit -m "feat: add navigation and upload page"
```

---

## Task 12: UI — history page

**Files:**
- Create: `components/uploads/UploadHistoryTable.vue`
- Create: `pages/uploads/index.vue`

- [ ] **Step 1: Create the history table component**

Create `components/uploads/UploadHistoryTable.vue`:

```vue
<script setup lang="ts">
defineProps<{
  uploads: Array<{ id: string; originalFilename: string; status: string; createdAt: string }>
}>()

const badgeClass: Record<string, string> = {
  stored: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-800'
}
</script>

<template>
  <table v-if="uploads.length" class="w-full text-left text-sm">
    <thead>
      <tr class="border-b border-gray-200 text-gray-500">
        <th class="py-2 font-medium">Filename</th>
        <th class="py-2 font-medium">Status</th>
        <th class="py-2 font-medium">Uploaded</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="upload in uploads" :key="upload.id" class="border-b border-gray-100">
        <td class="py-2">{{ upload.originalFilename }}</td>
        <td class="py-2">
          <span class="rounded px-2 py-0.5 text-xs" :class="badgeClass[upload.status]">
            {{ upload.status }}
          </span>
        </td>
        <td class="py-2 text-gray-600">{{ new Date(upload.createdAt).toLocaleString() }}</td>
      </tr>
    </tbody>
  </table>
  <p v-else class="text-sm text-gray-500">No uploads yet.</p>
</template>
```

- [ ] **Step 2: Create the history page**

Create `pages/uploads/index.vue`:

```vue
<script setup lang="ts">
const { data: uploads } = await useFetch('/api/uploads', { default: () => [] })
</script>

<template>
  <div>
    <h1 class="mb-4 text-xl font-semibold">Upload history</h1>
    <UploadHistoryTable :uploads="uploads" />
  </div>
</template>
```

- [ ] **Step 3: Verify the project prepares**

Run: `bunx nuxi prepare`
Expected: completes without errors.

- [ ] **Step 4: Commit**

```bash
git add components/uploads/UploadHistoryTable.vue pages/uploads/index.vue
git commit -m "feat: add upload history page"
```

---

## Task 13: Integration test — real Postgres + LocalStack round-trip

**Files:**
- Create: `test/integration/uploads/upload-flow.test.ts`

This test boots Postgres and LocalStack via testcontainers, pushes the Prisma schema, then drives the real `createUpload` / `listUploads` use cases through the real `S3Storage` + `UploadRepository`, and confirms the object physically lands in the bucket. Requires Docker.

- [ ] **Step 1: Write the integration test**

Create `test/integration/uploads/upload-flow.test.ts`:

```ts
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { $ } from 'bun'
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

let postgres: StartedTestContainer
let localstack: StartedTestContainer
let s3Endpoint = ''
const bucket = 'koh-tao-raw'
const prefix = 'uploads'

beforeAll(async () => {
  postgres = await new GenericContainer('postgres:18')
    .withEnvironment({ POSTGRES_PASSWORD: 'test', POSTGRES_USER: 'test', POSTGRES_DB: 'test' })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 1))
    .start()

  localstack = await new GenericContainer('localstack/localstack')
    .withEnvironment({ SERVICES: 's3' })
    .withExposedPorts(4566)
    .withWaitStrategy(Wait.forLogMessage(/Ready\./, 1))
    .start()

  const dbUrl = `postgresql://test:test@${postgres.getHost()}:${postgres.getMappedPort(5432)}/test`
  s3Endpoint = `http://${localstack.getHost()}:${localstack.getMappedPort(4566)}`

  process.env.DATABASE_URL = dbUrl
  await $`prisma db push --skip-generate`.env({ ...process.env, DATABASE_URL: dbUrl })
}, 180000)

afterAll(async () => {
  await postgres?.stop()
  await localstack?.stop()
})

test('upload stores the object and records a stored history row', async () => {
  const { S3Storage } = await import('../../../server/infrastructure/storage/S3Storage')
  const { UploadRepository } = await import('../../../server/infrastructure/repositories/UploadRepository')
  const { createUpload } = await import('../../../server/application/uploads/createUpload')
  const { listUploads } = await import('../../../server/application/uploads/listUploads')

  const storage = new S3Storage({
    endpoint: s3Endpoint,
    region: 'eu-west-1',
    bucket,
    accessKeyId: 'test',
    secretAccessKey: 'test'
  })
  const repo = new UploadRepository()

  const upload = await createUpload(
    { id: Bun.randomUUIDv7(), originalFilename: 'usage.csv', file: new TextEncoder().encode('a,b,c').buffer, prefix },
    storage,
    repo
  )

  expect(upload.status).toBe('stored')

  // object physically exists in the bucket
  const client = new S3Client({
    region: 'eu-west-1',
    endpoint: s3Endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
  })
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: upload.objectKey }))
  expect(await object.Body!.transformToString()).toBe('a,b,c')

  // history reflects the stored row
  const history = await listUploads(repo)
  expect(history.some((entry) => entry.id === upload.id && entry.status === 'stored')).toBe(true)
}, 60000)
```

- [ ] **Step 2: Run the integration test**

Run: `bun test test/integration/uploads/upload-flow.test.ts`
Expected: PASS (1 test). Requires Docker running. (First run pulls the `postgres:18` and `localstack/localstack` images.)

- [ ] **Step 3: Commit**

```bash
git add test/integration/uploads/upload-flow.test.ts
git commit -m "test: add S3 upload integration flow"
```

---

## Task 14: Aspire — LocalStack container + env wiring

**Files:**
- Modify: `apphost.cs`

- [ ] **Step 1: Wire LocalStack into the apphost**

Overwrite `apphost.cs`:

```csharp
#:package Aspire.Hosting.PostgreSQL@13.4.0
#:package CommunityToolkit.Aspire.Hosting.Bun@13.3.0
#:sdk Aspire.AppHost.Sdk@13.4.0

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithImage("postgres:18")
    .WithDataVolume()
    .AddDatabase("koh-tao-dev");

var localstack = builder.AddContainer("localstack", "localstack/localstack")
    .WithEnvironment("SERVICES", "s3")
    .WithEndpoint(port: 4566, targetPort: 4566, name: "edge", scheme: "http");

var app = builder.AddBunApp("koh-tao", ".", "scripts/aspire-dev.ts")
    .WithBunPackageInstallation()
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WaitFor(localstack)
    .WithEnvironment("NUXT_S3_ENDPOINT", localstack.GetEndpoint("edge"))
    .WithEnvironment("NUXT_AWS_REGION", "eu-west-1")
    .WithEnvironment("NUXT_AWS_ACCESS_KEY_ID", "test")
    .WithEnvironment("NUXT_AWS_SECRET_ACCESS_KEY", "test")
    .WithEnvironment("NUXT_S3_BUCKET", "koh-tao-raw")
    .WithEnvironment("NUXT_S3_PREFIX", "uploads");

builder.Build().Run();
```

- [ ] **Step 2: Confirm the apphost smoke test still passes**

Run: `bun test test/smoke/aspire-apphost.test.ts`
Expected: PASS — file contains `AddPostgres`, `"koh-tao-dev"`, `AddBunApp("koh-tao"`, and `WaitFor`.

- [ ] **Step 3: Manual verification (Docker required)**

Run: `aspire start`
Then in the dashboard confirm `postgres`, `localstack`, and `koh-tao` all reach a running state. Visit the app (`http://localhost:3000`), upload a file on the Upload page, then open History and confirm a `stored` row appears. (The bucket is created lazily by `S3Storage` on first upload.)

> If `aspire start` is unavailable in the execution environment, skip Step 3 and note it for the user to verify manually — the integration test in Task 13 already proves the storage + persistence path end-to-end.

- [ ] **Step 4: Commit**

```bash
git add apphost.cs
git commit -m "feat: add LocalStack S3 container to Aspire apphost"
```

---

## Task 15: Full suite verification

- [ ] **Step 1: Run the unit suite**

Run: `bun run test:unit`
Expected: PASS — `test/domain/uploads/*`, `test/domain/lib/*`, `test/smoke/*`. (Application tests live under `test/application`; see Step 2.)

- [ ] **Step 2: Run the application tests**

Run: `bun test test/application`
Expected: PASS (createUpload + listUploads).

- [ ] **Step 3: Run the integration suite (Docker required)**

Run: `bun run test:integration`
Expected: PASS — the upload flow test.

- [ ] **Step 4: Type-check the whole project**

Run: `bunx nuxi prepare && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Final commit (if anything changed)**

```bash
git add -A
git commit -m "chore: verify upload slice test suite" --allow-empty
```

---

## Notes / known assumptions

- **Bun runtime:** `Bun.randomUUIDv7()` is used for IDs; the app runs on Bun in dev (Aspire `AddBunApp`) and tests run under `bun:test`. If a future production target uses Node, swap to a uuidv7 library.
- **`test:unit` script scope:** the script is `bun test test/domain test/smoke`. Application unit tests live in `test/application` and are run explicitly (Task 15 Step 2). If you prefer them in the default unit run, widen the `test:unit` script to include `test/application` — optional, not required by the spec.
- **LocalStack endpoint from a host process:** the Bun app runs as a host process (not a container), so `localstack.GetEndpoint("edge")` must resolve to a host-reachable URL. Verified manually in Task 14 Step 3.
- **`forcePathStyle`** is enabled whenever a custom endpoint is set (LocalStack/MinIO require path-style addressing); real AWS uses virtual-hosted style with an empty endpoint.
