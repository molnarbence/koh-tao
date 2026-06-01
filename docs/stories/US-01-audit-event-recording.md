# US-01 — As a compliance officer, I want every privileged action to be automatically logged with actor identity and timestamp, so that I can produce a complete evidence trail for SOX review

**Deliverable**: D5 — Auth, authorization & audit
**Epic**: Auth & Authorization
**Type**: User Story
**Dependencies**: none
**Layers**: domain, infrastructure

## Goal

Define the `AuditEvent` domain model, Prisma schema, and an append-only write utility that all privileged operations (US-23, US-19–US-14, US-16–US-17, US-27–US-28) use to record auditable actions.

## Context

- Audit records must be append-only — no updates or deletes.
- Audit records attribute every action to either a human actor (Auth0 `sub`) or a machine client (Auth0 client ID).
- Must preserve enough evidence for SOX review: who did what, to which resource, when, and why (reason is required for configuration changes).
- Audit data is later exposed via `GET /api/audit-events` (US-29) for administrators.
- This story is intentionally infrastructure-only — no API route. It is a shared building block for all other stories.

## Scope

**In scope**:
- `AuditEvent` Prisma model and migration
- `AuditEvent` domain type
- `IAuditEventRepository` port interface
- `AuditEventRepository` Prisma implementation (append-only: `create` only, no update/delete methods)
- `AuditEventType` enum covering all auditable actions in MVP

**Out of scope**:
- API read endpoint (US-29)
- Querying or filtering audit events

## AuditEvent Prisma model

```prisma
model AuditEvent {
  id          String   @id @default(uuid(7))
  eventType   String
  actorId     String
  actorType   String   // 'user' | 'machine'
  targetId    String?
  targetType  String?
  details     Json?
  reason      String?
  createdAt   DateTime @default(now())

  @@index([targetId, createdAt])
  @@index([actorId, createdAt])
}
```

## AuditEventType constants

```ts
// server/domain/audit/AuditEventType.ts
export const AuditEventType = {
  INGESTION_CREATED: 'ingestion.created',
  INGESTION_RERUN: 'ingestion.rerun',
  FILE_UPLOADED: 'file.uploaded',
  FILE_DOWNLOADED: 'file.downloaded',
  PROCESSING_STATUS_UPDATED: 'processing.status_updated',
  BILLING_STATUS_UPDATED: 'billing.status_updated',
  CHANNEL_ACTIVATION_CHANGED: 'channel.activation_changed',
  MEDIATION_BLUEPRINT_SAVED: 'mediation_blueprint.saved',
  PARTNER_MEDIATION_CONFIG_SAVED: 'partner_mediation_config.saved',
  CHANNEL_MEDIATION_CONFIG_SAVED: 'channel_mediation_config.saved',
} as const
```

## Port (`server/application/audit/IAuditEventRepository.ts`)

```ts
interface IAuditEventRepository {
  write(event: {
    eventType: string
    actorId: string
    actorType: 'user' | 'machine'
    targetId?: string
    targetType?: string
    details?: Record<string, unknown>
    reason?: string
  }): Promise<void>
}
```

## Infrastructure (`server/infrastructure/repositories/AuditEventRepository.ts`)

Implements `IAuditEventRepository`. Only exposes `write` (no list/find methods — those are for US-29). Uses `prisma.auditEvent.create`.

## Files

- `prisma/schema.prisma` — add `AuditEvent` model
- `server/domain/audit/AuditEventType.ts` — create
- `server/application/audit/IAuditEventRepository.ts` — create
- `server/infrastructure/repositories/AuditEventRepository.ts` — create
- `test/integration/prisma/schema.test.ts` — extend to cover AuditEvent table

## Tests

- Integration: `AuditEventRepository.write()` persists a record; verify indexes exist on `targetId` and `actorId`; no update or delete methods exist on the repository

## Acceptance Criteria

- [ ] `AuditEvent` table exists in DB with all required columns
- [ ] `AuditEventRepository.write()` creates a record and returns void
- [ ] Repository has no `update`, `delete`, or `upsert` methods
- [ ] Domain type has no Prisma imports
- [ ] Indexes on `(targetId, createdAt)` and `(actorId, createdAt)` exist in schema
