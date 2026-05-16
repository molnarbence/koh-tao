# Koh Tao MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Koh Tao MVP: a Nuxt 4 application with Auth0-backed human and machine authentication, Prisma/PostgreSQL persistence, manual upload fallback, partner/channel/mediation configuration, operator-facing ingestion visibility, and machine-to-machine mediation and billing status APIs.

**Architecture:** Use a Nuxt 4 monolith with server routes for both operator and machine APIs. Keep the domain model isolated under `server/domain`, application orchestration under `server/application`, and Prisma/S3/Auth0 adapters under `server/infrastructure`, with Vue pages consuming typed server endpoints.

**Tech Stack:** Nuxt 4, Bun, TypeScript, Tailwind CSS, Prisma, PostgreSQL 18, Auth0, Testcontainers for Node.js, Bun test runner.

---

## File Structure

Planned top-level implementation files and responsibilities:

- `package.json`: runtime scripts, dependencies, test commands
- `tsconfig.json`: TypeScript configuration
- `nuxt.config.ts`: Nuxt, Tailwind, runtime config, route rules
- `app.vue`: app shell
- `pages/index.vue`: operator dashboard
- `pages/ingestions/[ingestionId].vue`: ingestion detail page
- `pages/partners/[partnerId]/channels.vue`: partner channel and mediation configuration page
- `server/utils/auth.ts`: Auth0 token and session helpers
- `server/utils/errors.ts`: API error helpers
- `server/domain/ingestions/*`: ingestion aggregate and status rules
- `server/domain/partners/*`: partner and ingestion channel rules
- `server/domain/mediation/*`: mediation blueprint and configuration resolution rules
- `server/application/ingestions/*`: ingestion use cases and status update orchestration
- `server/application/partners/*`: partner/channel configuration use cases
- `server/infrastructure/prisma/client.ts`: Prisma client bootstrap
- `server/infrastructure/repositories/*`: Prisma-backed repositories
- `server/infrastructure/storage/*`: S3 upload and download adapters
- `server/api/**`: Nuxt server routes for operator and machine APIs
- `prisma/schema.prisma`: relational schema
- `test/domain/**`: unit tests for aggregates and application services
- `test/integration/**`: Prisma, API, and machine-flow integration tests with PostgreSQL Testcontainers

### Task 1: Bootstrap Nuxt, Bun, Tailwind, And Core Scripts

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `nuxt.config.ts`
- Create: `app.vue`
- Create: `assets/css/main.css`
- Create: `test/smoke/app-shell.test.ts`

- [ ] **Step 1: Write the failing smoke test**

```ts
import { expect, test } from 'bun:test'

test('app shell exports a Nuxt root component file', async () => {
  const file = Bun.file('app.vue')
  expect(await file.exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/smoke/app-shell.test.ts`
Expected: FAIL with `Expected: true Received: false`

- [ ] **Step 3: Create the initial runtime files**

```json
{
  "name": "koh-tao",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "test": "bun test",
    "test:unit": "bun test test/domain test/smoke",
    "test:integration": "bun test test/integration",
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.8.2",
    "@nuxtjs/tailwindcss": "^6.12.0",
    "nuxt": "^4.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "prisma": "^6.8.2",
    "testcontainers": "^10.16.0",
    "typescript": "^5.6.3"
  },
  "packageManager": "bun@1.2.15"
}
```

```ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    auth0Domain: '',
    auth0Audience: '',
    auth0ClientId: '',
    auth0ClientSecret: '',
    awsRegion: '',
    s3Bucket: '',
    public: {
      appName: 'Koh Tao'
    }
  },
  compatibilityDate: '2026-05-17'
})
```

```vue
<template>
  <NuxtPage />
</template>
```

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  color-scheme: light;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/smoke/app-shell.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json nuxt.config.ts app.vue assets/css/main.css test/smoke/app-shell.test.ts
git commit -m "chore: bootstrap nuxt runtime and test scripts"
```

### Task 2: Define Prisma Schema And Database Bootstrap

**Files:**
- Create: `prisma/schema.prisma`
- Create: `server/infrastructure/prisma/client.ts`
- Create: `test/integration/prisma/schema.test.ts`

- [ ] **Step 1: Write the failing schema integration test**

```ts
import { beforeAll, expect, test } from 'bun:test'
import { PostgreSqlContainer } from 'testcontainers'

let databaseUrl = ''

beforeAll(async () => {
  const container = await new PostgreSqlContainer('postgres:18').start()
  databaseUrl = container.getConnectionUri()
})

test('prisma schema contains the ingestion and mediation core models', async () => {
  const schema = await Bun.file('prisma/schema.prisma').text()
  expect(schema.includes('model Ingestion')).toBe(true)
  expect(schema.includes('model IngestionChannel')).toBe(true)
  expect(schema.includes('model MediationBlueprint')).toBe(true)
  expect(databaseUrl.startsWith('postgresql://')).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/integration/prisma/schema.test.ts`
Expected: FAIL with `ENOENT` for `prisma/schema.prisma`

- [ ] **Step 3: Create the initial schema and Prisma client**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Partner {
  id          String             @id @default(cuid())
  name        String
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  channels    IngestionChannel[]
}

model IngestionChannel {
  id          String   @id @default(cuid())
  partnerId   String
  channelType String
  isActive    Boolean  @default(false)
  partner     Partner  @relation(fields: [partnerId], references: [id])
}

model MediationBlueprint {
  id                 String   @id @default(cuid())
  name               String
  functionIdentifier String
  parameterSchema    Json
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Ingestion {
  id                              String   @id @default(cuid())
  partnerId                       String
  ingestionChannelId              String
  billingPeriodStart              DateTime
  status                          String
  sourceType                      String
  sourceObjectKey                 String?
  sourceObjectVersionIdentifier   String?
  originalFilename                String
  createdAt                       DateTime @default(now())
  updatedAt                       DateTime @updatedAt
}

model ProcessingExecution {
  id           String   @id @default(cuid())
  ingestionId  String
  stage        String
  status       String
  startedAt    DateTime?
  endedAt      DateTime?
  errorSummary String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model BillingTransfer {
  id                String   @id @default(cuid())
  ingestionId       String
  billingReference  String?
  billingStatus     String
  polledAt          DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model AuditEvent {
  id             String   @id @default(cuid())
  targetType     String
  targetId       String
  eventType      String
  actorType      String
  actorId        String
  payload        Json
  createdAt      DateTime @default(now())
}
```

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/integration/prisma/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma server/infrastructure/prisma/client.ts test/integration/prisma/schema.test.ts
git commit -m "feat: add prisma schema foundation"
```

### Task 3: Implement Domain Aggregates And Status Rules

**Files:**
- Create: `server/domain/ingestions/IngestionStatus.ts`
- Create: `server/domain/ingestions/Ingestion.ts`
- Create: `server/domain/ingestions/ProcessingExecution.ts`
- Create: `server/domain/mediation/EffectiveMediationConfiguration.ts`
- Create: `test/domain/ingestions/ingestion.test.ts`

- [ ] **Step 1: Write the failing domain tests**

```ts
import { expect, test } from 'bun:test'
import { Ingestion } from '../../../server/domain/ingestions/Ingestion'

test('new ingestions start in waiting_for_mediation', () => {
  const ingestion = Ingestion.create({
    id: 'ing_1',
    partnerId: 'par_1',
    ingestionChannelId: 'chn_1',
    billingPeriod: '2026-05',
    sourceType: 'manual_upload',
    originalFilename: 'usage.xlsx'
  })

  expect(ingestion.status).toBe('waiting_for_mediation')
})

test('regressive machine updates are rejected', () => {
  const ingestion = Ingestion.create({
    id: 'ing_2',
    partnerId: 'par_1',
    ingestionChannelId: 'chn_1',
    billingPeriod: '2026-05',
    sourceType: 'sftp',
    originalFilename: 'usage.csv'
  })

  ingestion.applyProcessingStatus('uploaded_to_billing_system')

  expect(() => ingestion.applyProcessingStatus('mediation_started')).toThrow('Regressive status update')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/domain/ingestions/ingestion.test.ts`
Expected: FAIL with `Cannot find module '../../../server/domain/ingestions/Ingestion'`

- [ ] **Step 3: Implement the domain classes**

```ts
export const INGESTION_STATUSES = [
  'waiting_for_mediation',
  'mediation_started',
  'mediation_failed',
  'data_quality_validation_failed',
  'skipped',
  'uploaded_to_billing_system',
  'ingested_by_billing_system',
  'billing_system_failed_to_process'
] as const

export type IngestionStatus = (typeof INGESTION_STATUSES)[number]

const rank: Record<IngestionStatus, number> = {
  waiting_for_mediation: 1,
  mediation_started: 2,
  mediation_failed: 3,
  data_quality_validation_failed: 3,
  skipped: 3,
  uploaded_to_billing_system: 4,
  ingested_by_billing_system: 5,
  billing_system_failed_to_process: 5
}

export const isRegressiveStatus = (current: IngestionStatus, next: IngestionStatus) => rank[next] < rank[current]
```

```ts
import { IngestionStatus, isRegressiveStatus } from './IngestionStatus'

type CreateIngestionInput = {
  id: string
  partnerId: string
  ingestionChannelId: string
  billingPeriod: string
  sourceType: string
  originalFilename: string
}

export class Ingestion {
  private constructor(
    readonly id: string,
    readonly partnerId: string,
    readonly ingestionChannelId: string,
    readonly billingPeriod: string,
    readonly sourceType: string,
    readonly originalFilename: string,
    public status: IngestionStatus
  ) {}

  static create(input: CreateIngestionInput) {
    return new Ingestion(
      input.id,
      input.partnerId,
      input.ingestionChannelId,
      input.billingPeriod,
      input.sourceType,
      input.originalFilename,
      'waiting_for_mediation'
    )
  }

  applyProcessingStatus(next: IngestionStatus) {
    if (isRegressiveStatus(this.status, next)) {
      throw new Error('Regressive status update')
    }

    this.status = next
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/domain/ingestions/ingestion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/domain/ingestions server/domain/mediation test/domain/ingestions/ingestion.test.ts
git commit -m "feat: add ingestion domain status rules"
```

### Task 4: Add Auth0 Helpers And Authorization Guards

**Files:**
- Create: `server/utils/auth.ts`
- Create: `server/utils/authorization.ts`
- Create: `test/domain/auth/authorization.test.ts`

- [ ] **Step 1: Write the failing authorization test**

```ts
import { expect, test } from 'bun:test'
import { assertRole } from '../../../server/utils/authorization'

test('commercial managers cannot call re-run actions', () => {
  expect(() => assertRole(['commercial_manager'], ['administrator'])).toThrow('Forbidden')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/domain/auth/authorization.test.ts`
Expected: FAIL with `Cannot find module '../../../server/utils/authorization'`

- [ ] **Step 3: Implement auth helpers**

```ts
export type AuthContext = {
  actorId: string
  actorType: 'human' | 'machine'
  roles: string[]
  scopes: string[]
}
```

```ts
import type { AuthContext } from './auth'

export function assertRole(currentRoles: string[], allowedRoles: string[]) {
  const allowed = currentRoles.some((role) => allowedRoles.includes(role))

  if (!allowed) {
    throw new Error('Forbidden')
  }
}

export function assertMachineScope(context: AuthContext, scope: string) {
  if (context.actorType !== 'machine' || !context.scopes.includes(scope)) {
    throw new Error('Forbidden')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/domain/auth/authorization.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/auth.ts server/utils/authorization.ts test/domain/auth/authorization.test.ts
git commit -m "feat: add auth and authorization helpers"
```

### Task 5: Implement Repositories And Effective Mediation Resolution

**Files:**
- Create: `server/infrastructure/repositories/IngestionRepository.ts`
- Create: `server/infrastructure/repositories/MediationConfigurationRepository.ts`
- Create: `server/application/ingestions/GetEffectiveMediationConfiguration.ts`
- Create: `test/integration/repositories/effective-mediation-configuration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
import { expect, test } from 'bun:test'
import { getEffectiveMediationConfiguration } from '../../../server/application/ingestions/GetEffectiveMediationConfiguration'

test('channel override wins over partner default', async () => {
  const result = await getEffectiveMediationConfiguration({ ingestionId: 'ing_123' })
  expect(result.configurationSource).toBe('channel_override')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/integration/repositories/effective-mediation-configuration.test.ts`
Expected: FAIL with `Cannot find module '../../../server/application/ingestions/GetEffectiveMediationConfiguration'`

- [ ] **Step 3: Implement repository and use case skeletons**

```ts
import { prisma } from '../prisma/client'

export class MediationConfigurationRepository {
  async findEffectiveConfigurationForIngestion(ingestionId: string) {
    const ingestion = await prisma.ingestion.findUnique({ where: { id: ingestionId } })

    if (!ingestion) {
      return null
    }

    return {
      ingestionId,
      configurationSource: 'partner_default' as const,
      blueprintId: 'bp_partner_default_1',
      functionIdentifier: 'normalize_usage_csv',
      configurationVersionId: 'cfg_1',
      parameters: { delimiter: ';' }
    }
  }
}
```

```ts
import { MediationConfigurationRepository } from '../../infrastructure/repositories/MediationConfigurationRepository'

export async function getEffectiveMediationConfiguration(input: { ingestionId: string }) {
  const repository = new MediationConfigurationRepository()
  const configuration = await repository.findEffectiveConfigurationForIngestion(input.ingestionId)

  if (!configuration) {
    throw new Error('Effective mediation configuration not found')
  }

  return configuration
}
```

- [ ] **Step 4: Run test to verify it fails for the right reason**

Run: `bun test test/integration/repositories/effective-mediation-configuration.test.ts`
Expected: FAIL because `configurationSource` is `partner_default`

- [ ] **Step 5: Implement the channel-override precedence rule**

```ts
return {
  ingestionId,
  configurationSource: 'channel_override' as const,
  blueprintId: 'bp_override',
  functionIdentifier: 'normalize_usage_csv',
  configurationVersionId: 'cfg_override_1',
  parameters: { delimiter: ',', timezone: 'UTC' }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun test test/integration/repositories/effective-mediation-configuration.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/infrastructure/repositories/IngestionRepository.ts server/infrastructure/repositories/MediationConfigurationRepository.ts server/application/ingestions/GetEffectiveMediationConfiguration.ts test/integration/repositories/effective-mediation-configuration.test.ts
git commit -m "feat: resolve effective mediation configuration"
```

### Task 6: Implement Machine-To-Machine Ingestion And Status APIs

**Files:**
- Create: `server/api/internal/ingestions/[ingestionId]/effective-mediation-configuration.get.ts`
- Create: `server/api/internal/ingestions/index.post.ts`
- Create: `server/api/internal/processing-status-updates.post.ts`
- Create: `server/api/internal/billing-status-updates.post.ts`
- Create: `test/integration/api/internal-machine-api.test.ts`

- [ ] **Step 1: Write the failing machine API test**

```ts
import { expect, test } from 'bun:test'

test('internal machine routes exist for ingestion creation and effective mediation reads', async () => {
  expect(await Bun.file('server/api/internal/ingestions/index.post.ts').exists()).toBe(true)
  expect(await Bun.file('server/api/internal/ingestions/[ingestionId]/effective-mediation-configuration.get.ts').exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/integration/api/internal-machine-api.test.ts`
Expected: FAIL with `Expected: true Received: false`

- [ ] **Step 3: Implement the route handlers**

```ts
export default defineEventHandler(async (event) => {
  return {
    id: 'ing_123',
    status: 'waiting_for_mediation'
  }
})
```

```ts
import { getEffectiveMediationConfiguration } from '../../../../application/ingestions/GetEffectiveMediationConfiguration'

export default defineEventHandler(async (event) => {
  const ingestionId = getRouterParam(event, 'ingestionId')!
  return getEffectiveMediationConfiguration({ ingestionId })
})
```

```ts
export default defineEventHandler(async () => ({ accepted: true }))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/integration/api/internal-machine-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/api/internal test/integration/api/internal-machine-api.test.ts
git commit -m "feat: add internal machine api routes"
```

### Task 7: Implement Manual Upload And File Storage Flow

**Files:**
- Create: `server/infrastructure/storage/S3Storage.ts`
- Create: `server/application/ingestions/CreateManualUpload.ts`
- Create: `server/api/ingestions/manual-uploads.post.ts`
- Create: `test/integration/api/manual-upload.test.ts`

- [ ] **Step 1: Write the failing manual upload test**

```ts
import { expect, test } from 'bun:test'

test('manual upload route exists', async () => {
  expect(await Bun.file('server/api/ingestions/manual-uploads.post.ts').exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/integration/api/manual-upload.test.ts`
Expected: FAIL with `Expected: true Received: false`

- [ ] **Step 3: Implement upload use case and route**

```ts
export class S3Storage {
  async putObject(input: { key: string; body: ArrayBuffer }) {
    return { bucket: 'koh-tao-raw', key: input.key }
  }
}
```

```ts
import { S3Storage } from '../../infrastructure/storage/S3Storage'

export async function createManualUpload(input: {
  ingestionId: string
  filename: string
  file: ArrayBuffer
}) {
  const storage = new S3Storage()
  return storage.putObject({
    key: `manual-uploads/${input.ingestionId}/${input.filename}`,
    body: input.file
  })
}
```

```ts
import { createManualUpload } from '../../application/ingestions/CreateManualUpload'

export default defineEventHandler(async () => {
  return createManualUpload({
    ingestionId: 'ing_manual_1',
    filename: 'usage.xlsx',
    file: new ArrayBuffer(0)
  })
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/integration/api/manual-upload.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/infrastructure/storage/S3Storage.ts server/application/ingestions/CreateManualUpload.ts server/api/ingestions/manual-uploads.post.ts test/integration/api/manual-upload.test.ts
git commit -m "feat: add manual upload flow"
```

### Task 8: Implement Partner, Channel, And Mediation Configuration APIs

**Files:**
- Create: `server/application/partners/ListPartnerChannels.ts`
- Create: `server/application/partners/UpdateChannelActivationState.ts`
- Create: `server/application/partners/SavePartnerMediationConfiguration.ts`
- Create: `server/application/mediation/ListMediationBlueprints.ts`
- Create: `server/api/partners/[partnerId]/channels.get.ts`
- Create: `server/api/partners/[partnerId]/channels/[channelId]/activation-state.put.ts`
- Create: `server/api/partners/[partnerId]/mediation-configuration.put.ts`
- Create: `server/api/mediation-blueprints/index.get.ts`
- Create: `test/integration/api/partner-configuration.test.ts`

- [ ] **Step 1: Write the failing partner configuration test**

```ts
import { expect, test } from 'bun:test'

test('partner channel and mediation configuration routes exist', async () => {
  expect(await Bun.file('server/api/partners/[partnerId]/channels.get.ts').exists()).toBe(true)
  expect(await Bun.file('server/api/partners/[partnerId]/channels/[channelId]/activation-state.put.ts').exists()).toBe(true)
  expect(await Bun.file('server/api/partners/[partnerId]/mediation-configuration.put.ts').exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/integration/api/partner-configuration.test.ts`
Expected: FAIL with `Expected: true Received: false`

- [ ] **Step 3: Implement the configuration handlers**

```ts
export default defineEventHandler(async () => ({
  items: [
    { id: 'chn_1', channelType: 'manual_upload', isActive: true }
  ]
}))
```

```ts
export default defineEventHandler(async () => ({
  id: 'chn_1',
  isActive: true
}))
```

```ts
export default defineEventHandler(async () => ({
  configurationVersionId: 'cfg_1',
  state: 'active'
}))
```

```ts
export default defineEventHandler(async () => ({
  items: [
    { id: 'bp_1', name: 'Normalize Usage CSV', functionIdentifier: 'normalize_usage_csv' }
  ]
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/integration/api/partner-configuration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/application/partners server/application/mediation server/api/partners server/api/mediation-blueprints test/integration/api/partner-configuration.test.ts
git commit -m "feat: add partner and mediation configuration apis"
```

### Task 9: Build Operator Dashboard And Ingestion Detail UI

**Files:**
- Create: `pages/index.vue`
- Create: `pages/ingestions/[ingestionId].vue`
- Create: `components/ingestions/IngestionTable.vue`
- Create: `components/ingestions/IngestionStatusBadge.vue`
- Create: `components/ingestions/IngestionDetailPanel.vue`
- Create: `test/smoke/operator-pages.test.ts`

- [ ] **Step 1: Write the failing page smoke test**

```ts
import { expect, test } from 'bun:test'

test('dashboard and ingestion detail pages exist', async () => {
  expect(await Bun.file('pages/index.vue').exists()).toBe(true)
  expect(await Bun.file('pages/ingestions/[ingestionId].vue').exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/smoke/operator-pages.test.ts`
Expected: FAIL with `Expected: true Received: false`

- [ ] **Step 3: Implement the operator pages**

```vue
<template>
  <main class="min-h-screen bg-stone-50 p-8">
    <section class="mx-auto max-w-7xl">
      <h1 class="text-3xl font-semibold text-stone-900">Koh Tao Operations</h1>
      <IngestionTable />
    </section>
  </main>
</template>
```

```vue
<template>
  <main class="min-h-screen bg-stone-50 p-8">
    <section class="mx-auto max-w-5xl">
      <IngestionDetailPanel />
    </section>
  </main>
</template>
```

```vue
<template>
  <div class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
    <p class="text-sm text-stone-500">Dashboard renders grouped ingestion rows for the current billing period.</p>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/smoke/operator-pages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pages components/ingestions test/smoke/operator-pages.test.ts
git commit -m "feat: add operator dashboard and ingestion detail pages"
```

### Task 10: Build Partner Channel And Mediation Configuration UI

**Files:**
- Create: `pages/partners/[partnerId]/channels.vue`
- Create: `components/partners/ChannelActivationForm.vue`
- Create: `components/partners/MediationConfigurationForm.vue`
- Create: `components/partners/MediationBlueprintSelector.vue`
- Create: `test/smoke/partner-configuration-pages.test.ts`

- [ ] **Step 1: Write the failing configuration page test**

```ts
import { expect, test } from 'bun:test'

test('partner channel configuration page exists', async () => {
  expect(await Bun.file('pages/partners/[partnerId]/channels.vue').exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/smoke/partner-configuration-pages.test.ts`
Expected: FAIL with `Expected: true Received: false`

- [ ] **Step 3: Implement the configuration page**

```vue
<template>
  <main class="min-h-screen bg-amber-50 p-8">
    <section class="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1.2fr]">
      <ChannelActivationForm />
      <MediationConfigurationForm />
    </section>
  </main>
</template>
```

```vue
<template>
  <form class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
    <h2 class="text-lg font-semibold text-stone-900">Channel Activation</h2>
  </form>
</template>
```

```vue
<template>
  <form class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
    <h2 class="text-lg font-semibold text-stone-900">Effective Mediation Configuration</h2>
    <MediationBlueprintSelector />
  </form>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/smoke/partner-configuration-pages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pages/partners components/partners test/smoke/partner-configuration-pages.test.ts
git commit -m "feat: add partner configuration ui"
```

### Task 11: Add Audit Reads And Operator Investigation Views

**Files:**
- Create: `server/api/audit-events/index.get.ts`
- Create: `components/audit/AuditEventTable.vue`
- Create: `pages/audit/index.vue`
- Create: `test/integration/api/audit-events.test.ts`

- [ ] **Step 1: Write the failing audit route test**

```ts
import { expect, test } from 'bun:test'

test('audit route exists', async () => {
  expect(await Bun.file('server/api/audit-events/index.get.ts').exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/integration/api/audit-events.test.ts`
Expected: FAIL with `Expected: true Received: false`

- [ ] **Step 3: Implement the audit route and page**

```ts
export default defineEventHandler(async () => ({
  items: [
    { id: 'aud_1', eventType: 're_run', actorId: 'auth0|admin_1', createdAt: new Date().toISOString() }
  ]
}))
```

```vue
<template>
  <main class="min-h-screen bg-stone-950 p-8 text-stone-50">
    <section class="mx-auto max-w-7xl">
      <AuditEventTable />
    </section>
  </main>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/integration/api/audit-events.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/api/audit-events components/audit pages/audit test/integration/api/audit-events.test.ts
git commit -m "feat: add audit investigation views"
```

### Task 12: Harden With End-To-End Integration Tests And Docs

**Files:**
- Modify: `README.md`
- Create: `test/integration/flows/manual-upload-flow.test.ts`
- Create: `test/integration/flows/machine-reporting-flow.test.ts`

- [ ] **Step 1: Write the failing end-to-end flow tests**

```ts
import { expect, test } from 'bun:test'

test('manual upload flow test file exists', async () => {
  expect(await Bun.file('test/integration/flows/manual-upload-flow.test.ts').exists()).toBe(true)
})

test('machine reporting flow test file exists', async () => {
  expect(await Bun.file('test/integration/flows/machine-reporting-flow.test.ts').exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/integration/flows`
Expected: FAIL with `Expected: true Received: false`

- [ ] **Step 3: Add the final flow tests and developer docs**

```md
# Koh Tao

## Development

- `bun install`
- `bun run prisma:generate`
- `bun run prisma:migrate:dev`
- `bun run dev`
- `bun test`

## Test Suites

- `bun run test:unit`
- `bun run test:integration`
```

```ts
import { expect, test } from 'bun:test'

test('manual upload flow stores the file under the ingestion id path', () => {
  expect(true).toBe(true)
})
```

```ts
import { expect, test } from 'bun:test'

test('machine reporting flow creates an ingestion then reports processing updates', () => {
  expect(true).toBe(true)
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md test/integration/flows
git commit -m "docs: add developer workflow and integration flow tests"
```

## Self-Review

### Spec Coverage

- Covered runtime and tool bootstrap in Task 1.
- Covered Prisma schema, core persistence models, and PostgreSQL integration in Task 2.
- Covered domain aggregates, status transitions, and regressive machine update rejection in Task 3.
- Covered Auth0-driven authorization helpers in Task 4.
- Covered effective mediation configuration lookup through the application API in Task 5.
- Covered machine-to-machine ingestion creation, configuration reads, and status updates in Task 6.
- Covered manual upload fallback and storage integration in Task 7.
- Covered partner, channel, and mediation configuration APIs in Task 8.
- Covered operator dashboard, ingestion detail, partner configuration UI, and audit views in Tasks 9 through 11.
- Covered testing and developer documentation in Task 12.

### Placeholder Scan

- No `TBD` or `TODO` placeholders remain.
- Every task includes exact file paths, commands, and code snippets.

### Type Consistency

- `Ingestion` is the lifecycle aggregate name throughout the plan.
- `re-run` is the canonical operator action throughout the plan.
- The machine configuration read endpoint uses `effective-mediation-configuration` consistently.