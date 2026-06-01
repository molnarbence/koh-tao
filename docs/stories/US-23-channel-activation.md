# US-23 — As an operator, I want to activate or deactivate an ingestion channel, so that I can control whether the mediation layer processes new files arriving through that channel

**Deliverable**: D3 — Configuration management
**Epic**: Channel Management
**Type**: User Story
**Dependencies**: US-22, US-20, US-01
**Layers**: domain, application, infrastructure, api

## Goal

Implement `PUT /api/partners/:partnerId/channels/:channelId/activation-state` with domain rules enforcing that activation requires a valid active mediation configuration, and that auto-deactivation occurs when the configuration becomes invalid.

## Context

- Both administrators and commercial managers (scoped to assigned partners) can activate/deactivate channels.
- Activation rule: a channel may only be activated when a valid active effective mediation configuration exists for that channel. If none exists, the request must be rejected with a domain error.
- Auto-deactivation: if the effective mediation configuration is later invalidated (e.g. blueprint updated in US-19), the channel must auto-deactivate. This is triggered by domain events or called explicitly from the blueprint update flow.
- `UpdateChannelActivationState` stub exists at `server/application/partners/UpdateChannelActivationState.ts`.
- Audit event must be recorded (US-01): actor, timestamp, channelId, previous state, new state.
- API exists as stub at `server/api/partners/[partnerId]/channels/[channelId]/activation-state.put.ts`.

## Scope

**In scope**:
- Domain rule: `IngestionChannel.activate()` throws if no valid mediation config
- `UpdateChannelActivationState` application service (replace stub)
- Audit recording via US-01
- `PUT .../activation-state` route handler

**Out of scope**:
- Blueprint impact preview (US-19)
- Automatic deactivation triggered by blueprint update — the deactivation method is implemented here; calling it from US-19 is US-19's responsibility

## Request body

```json
{ "isActive": true }
```

## Domain rule

```ts
// server/domain/partners/IngestionChannel.ts
activate(hasValidMediationConfig: boolean): void {
  if (!hasValidMediationConfig) {
    throw new DomainError('CHANNEL_ACTIVATION_REQUIRES_MEDIATION_CONFIG',
      'Channel cannot be activated without a valid active mediation configuration')
  }
  this.isActive = true
}

deactivate(): void {
  this.isActive = false
}
```

## Application service (`server/application/partners/UpdateChannelActivationState.ts`)

```ts
export async function updateChannelActivationState(
  input: { channelId: string; partnerId: string; isActive: boolean; actorId: string; actorType: 'user' | 'machine' },
  channelRepo: IIngestionChannelRepository,
  mediationConfigRepo: IMediationConfigurationRepository,
  auditRepo: IAuditEventRepository
): Promise<{ id: string; isActive: boolean }>
```

Logic:
1. Load channel; throw 404 if not found or partnerId mismatch
2. If `isActive === true`: check `mediationConfigRepo.hasValidActiveConfig(channelId)` — throw domain error if false
3. Apply domain method (`activate` or `deactivate`)
4. Persist updated `isActive`
5. Write audit event

## Files

- `server/domain/partners/IngestionChannel.ts` — add `activate()` and `deactivate()` methods
- `server/application/partners/UpdateChannelActivationState.ts` — implement
- `server/api/partners/[partnerId]/channels/[channelId]/activation-state.put.ts` — implement
- `test/domain/partners/channel-activation.test.ts` — create
- `test/integration/api/partner-configuration.test.ts` — extend

## Tests

- Unit: `activate()` throws when `hasValidMediationConfig = false`; succeeds when `true`
- Unit: `deactivate()` always succeeds
- Integration: activation with no mediation config returns 422 with domain error code; deactivation always succeeds; audit event is recorded

## Acceptance Criteria

- [ ] `PUT .../activation-state` with `{ isActive: true }` and no mediation config returns `422` with `code: "CHANNEL_ACTIVATION_REQUIRES_MEDIATION_CONFIG"`
- [ ] Activation succeeds when valid mediation config exists
- [ ] Deactivation always succeeds regardless of config state
- [ ] Commercial manager cannot activate/deactivate channels for unassigned partner (403)
- [ ] Audit event is recorded with actor identity, previous and new state
