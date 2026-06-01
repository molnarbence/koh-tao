# US-19 — As an administrator, I want to create and update mediation blueprints with parameter schemas, so that I can define and maintain the set of supported mediation functions available for partner configuration

**Deliverable**: D3 — Configuration management
**Epic**: Mediation Blueprints
**Type**: User Story
**Dependencies**: US-18, US-01
**Layers**: domain, application, infrastructure, api

## Goal

Implement `POST /api/mediation-blueprints` and `PUT /api/mediation-blueprints/:id` (admin-only) with versioning on update, required audit reason, and an impact preview showing affected partners/channels that would auto-deactivate.

## Context

- Only administrators can create or modify blueprints.
- Blueprint updates are versioned (incrementing version field or timestamp-based).
- Configuration-changing endpoints require a non-empty human-entered `reason` field in the request body.
- When a blueprint is updated, any partner or channel configuration referencing it may become invalid, triggering auto-deactivation of those channels. The response must include a preview of affected entities even before saving.
- `deactivateChannel` from US-23 must be called for each affected channel after a blueprint update is saved.
- Audit event must be recorded (US-01).

## Scope

**In scope**:
- `POST /api/mediation-blueprints` — create new blueprint
- `PUT /api/mediation-blueprints/:id` — update existing blueprint (increment version)
- Required `reason` field in request body for both endpoints
- Impact preview: list of `{ partnerId, partnerName, channelId, channelType }` that would be auto-deactivated
- After save: trigger deactivation of affected channels via application service
- Audit recording

**Out of scope**:
- Blueprint deletion
- Blueprint versioning history UI (later phase)
- Second-approval workflow (later phase)

## Request body

```json
{
  "name": "...",
  "functionIdentifier": "...",
  "parameterSchema": { ... },
  "reason": "..."
}
```

## Impact preview response (both create and update)

The response includes an `impactedChannels` array:

```json
{
  "id": "...",
  "name": "...",
  "functionIdentifier": "...",
  "parameterSchema": { ... },
  "impactedChannels": [
    { "channelId": "...", "channelType": "...", "partnerId": "...", "partnerName": "..." }
  ]
}
```

For `POST` (new blueprint), `impactedChannels` is always `[]`.
For `PUT`, it lists channels whose active mediation config references this blueprint and will be auto-deactivated on save.

## Domain rule

Blueprints are updated in-place. Versioning is recorded via `updatedAt` timestamp. No draft/publish workflow in MVP.

## Application service

`server/application/mediation/SaveMediationBlueprint.ts`:
```ts
export async function saveMediationBlueprint(
  input: { id?: string; name: string; functionIdentifier: string; parameterSchema: object; reason: string; actorId: string },
  blueprintRepo: IMediationBlueprintRepository,
  mediationConfigRepo: IMediationConfigurationRepository,
  channelRepo: IIngestionChannelRepository,
  auditRepo: IAuditEventRepository
): Promise<{ blueprint: MediationBlueprint; impactedChannels: ImpactedChannel[] }>
```

On update:
1. Find all channels using this blueprint in their active mediation config
2. Save blueprint
3. Deactivate each affected channel (call `deactivate()` domain method, persist)
4. Write audit event
5. Return blueprint + impacted channel list

## Files

- `server/application/mediation/SaveMediationBlueprint.ts` — create
- `server/api/mediation-blueprints/index.post.ts` — create
- `server/api/mediation-blueprints/[blueprintId].put.ts` — create
- `test/integration/api/mediation-blueprints.test.ts` — extend
- `test/domain/mediation/blueprint.test.ts` — create

## Tests

- Integration: create blueprint returns 201 with empty `impactedChannels`; update returns 200 with correct `impactedChannels`; affected channels are deactivated in DB; missing `reason` returns 422; non-admin returns 403; audit event recorded

## Acceptance Criteria

- [ ] `POST /api/mediation-blueprints` returns `201` with `impactedChannels: []`
- [ ] `PUT /api/mediation-blueprints/:id` returns `200` with list of channels to be auto-deactivated
- [ ] Affected channels have `isActive = false` in the database after update
- [ ] Missing `reason` field returns `422` with `code: "REASON_REQUIRED"`
- [ ] Non-administrator caller returns `403`
- [ ] Audit event is recorded with `reason`, actor, and timestamp
