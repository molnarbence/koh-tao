# US-20 — As a commercial manager, I want to configure a default mediation blueprint and parameters for a partner, so that the partner's ingestions are processed using the correct transformation logic

**Deliverable**: D3 — Configuration management
**Epic**: Mediation Configuration
**Type**: User Story
**Dependencies**: US-19, US-01
**Layers**: domain, application, infrastructure, api

## Goal

Implement `PUT /api/partners/:partnerId/mediation-configuration` so commercial managers (and admins) can select a mediation blueprint and supply partner-specific parameter values as the partner's default mediation configuration.

## Context

- `MediationConfiguration` is not yet a separate Prisma model — it may be stored as a JSON column on `Partner` or as its own table. Use a dedicated `MediationConfiguration` table with `partnerId`, `channelId` (nullable for partner-level), `blueprintId`, `parameters` (Json), `isActive`, `version`, `createdAt`.
- Configuration-changing endpoints require a non-empty `reason` field.
- `SavePartnerMediationConfiguration` stub exists at `server/application/partners/SavePartnerMediationConfiguration.ts`.
- `MediationConfigurationRepository` exists at `server/infrastructure/repositories/MediationConfigurationRepository.ts` as a partial implementation.
- After saving, the effective configuration used by US-15 must reflect the new version.
- Audit event required.

## Scope

**In scope**:
- `MediationConfiguration` Prisma model (add migration if needed)
- `IMediationConfigurationRepository` port (extend existing)
- `SavePartnerMediationConfiguration` application service (replace stub)
- `PUT /api/partners/:partnerId/mediation-configuration` route

**Out of scope**:
- Channel-level override (US-21)
- Reading mediation configuration (used internally by US-15)

## Request body

```json
{
  "blueprintId": "...",
  "parameters": { "key": "value" },
  "reason": "..."
}
```

## Response

```json
{
  "configurationVersionId": "...",
  "blueprintId": "...",
  "parameters": { ... },
  "isActive": true
}
```

## Schema addition (if MediationConfiguration table doesn't exist)

```prisma
model MediationConfiguration {
  id          String   @id @default(uuid(7))
  partnerId   String
  channelId   String?
  blueprintId String
  parameters  Json
  isActive    Boolean  @default(true)
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  partner     Partner  @relation(fields: [partnerId], references: [id])
  channel     IngestionChannel? @relation(fields: [channelId], references: [id])
  blueprint   MediationBlueprint @relation(fields: [blueprintId], references: [id])
}
```

## Application service (`server/application/partners/SavePartnerMediationConfiguration.ts`)

```ts
export async function savePartnerMediationConfiguration(
  input: { partnerId: string; blueprintId: string; parameters: object; reason: string; actorId: string },
  mediationConfigRepo: IMediationConfigurationRepository,
  blueprintRepo: IMediationBlueprintRepository,
  auditRepo: IAuditEventRepository
): Promise<MediationConfigurationResult>
```

Steps:
1. Assert blueprint exists (404 if not)
2. Deactivate any existing active config for this partner (channelId IS NULL)
3. Create new `MediationConfiguration` record with `isActive = true`
4. Write audit event
5. Return result

## Files

- `prisma/schema.prisma` — add `MediationConfiguration` model if absent
- `server/application/partners/IMediationConfigurationRepository.ts` — extend port
- `server/application/partners/SavePartnerMediationConfiguration.ts` — implement (currently stub)
- `server/infrastructure/repositories/MediationConfigurationRepository.ts` — extend
- `server/api/partners/[partnerId]/mediation-configuration.put.ts` — create
- `test/integration/repositories/mediation-configuration.test.ts` — extend

## Tests

- Integration: save partner config creates new record with `isActive = true`; previous active config is deactivated; missing `reason` returns 422; unknown blueprint returns 404; commercial manager cannot configure unassigned partner (403); audit event recorded

## Acceptance Criteria

- [ ] `PUT /api/partners/:partnerId/mediation-configuration` saves config and returns `configurationVersionId`
- [ ] Previous active config for same partner (no channel) is deactivated
- [ ] Missing `reason` returns `422`
- [ ] Non-existent blueprint returns `404`
- [ ] Commercial manager cannot configure unassigned partner (403)
- [ ] Audit event recorded with actor, reason, partnerId, blueprintId
