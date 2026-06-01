# US-15 — As the mediation Lambda, I want to fetch the resolved mediation configuration for an ingestion before execution, so that I can apply the correct partner-specific parameters during processing

**Deliverable**: D4 — Machine reporting
**Epic**: M2M Auth & Ingestion Lifecycle
**Type**: User Story
**Dependencies**: US-13, US-20
**Layers**: application, infrastructure, api

> **D4 simplification**: return a hardcoded stub configuration for now. Replace with real effective config resolution (US-20) when D3 is complete.

## Goal

Implement `GET /api/internal/ingestions/:ingestionId/effective-mediation-configuration` so the mediation Lambda can fetch the resolved configuration and parameter payload for an ingestion before execution starts. Also fix the existing DDD violation in `GetEffectiveMediationConfiguration.ts`.

## Context

- The mediation layer calls this endpoint with M2M credentials before it begins processing an ingestion.
- The effective configuration is resolved as: channel-level override (if active) takes precedence over partner-level default.
- `GetEffectiveMediationConfiguration.ts` currently imports `MediationConfigurationRepository` directly — a DDD violation. Fix by injecting via parameter.
- Stub route exists at `server/api/internal/ingestions/[ingestionId]/effective-mediation-configuration.get.ts`.
- `EffectiveMediationConfiguration` domain type exists at `server/domain/mediation/EffectiveMediationConfiguration.ts`.
- Required scope: `read:mediation-config`.

## Scope

**In scope**:
- Fix DDD violation: `GetEffectiveMediationConfiguration` must not import `MediationConfigurationRepository` directly
- Resolution logic: channel override > partner default; 404 if neither exists or neither is active
- Return: function identifier, configuration version ID, parameter payload
- Route at `GET /api/internal/ingestions/:ingestionId/effective-mediation-configuration`

**Out of scope**:
- Caching the config on the ingestion record itself
- Configuration history

## Response

```json
{
  "ingestionId": "...",
  "configurationVersionId": "...",
  "functionIdentifier": "...",
  "parameters": { "key": "value" }
}
```

## Port additions (`server/application/ingestions/IMediationConfigurationRepository.ts`)

```ts
interface IMediationConfigurationResolver {
  resolveForIngestion(ingestionId: string): Promise<EffectiveMediationConfiguration | null>
}
```

Resolution logic (implemented in infrastructure):
1. Load ingestion to get `channelId` and `partnerId`
2. Try to find active `MediationConfiguration` with matching `channelId` — use if found
3. Fall back to active `MediationConfiguration` with matching `partnerId` and `channelId IS NULL`
4. Return null if neither exists

## Application service fix (`server/application/ingestions/GetEffectiveMediationConfiguration.ts`)

```ts
export async function getEffectiveMediationConfiguration(
  ingestionId: string,
  resolver: IMediationConfigurationResolver
): Promise<EffectiveMediationConfiguration>
// Throws 404 if not found
```

Remove the existing direct import of `MediationConfigurationRepository`.

## Files

- `server/application/ingestions/IMediationConfigurationResolver.ts` — create (port)
- `server/application/ingestions/GetEffectiveMediationConfiguration.ts` — rewrite (fix DDD violation)
- `server/infrastructure/repositories/MediationConfigurationRepository.ts` — add `resolveForIngestion`, implement `IMediationConfigurationResolver`
- `server/api/internal/ingestions/[ingestionId]/effective-mediation-configuration.get.ts` — implement (currently stub)
- `test/integration/repositories/effective-mediation-configuration.test.ts` — extend existing test

## Tests

- Integration: returns channel override when present; falls back to partner default when no channel override; returns 404 when neither exists; scope enforcement returns 403

## Acceptance Criteria

- [ ] Channel-level override is returned when active
- [ ] Falls back to partner default when no channel override exists
- [ ] Returns `404` when no active configuration exists for the ingestion
- [ ] `GetEffectiveMediationConfiguration.ts` has no import from `server/infrastructure/`
- [ ] Unauthenticated returns `401`; wrong scope returns `403`
