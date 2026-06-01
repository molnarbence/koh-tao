# US-21 — As a commercial manager, I want to override the mediation configuration for a specific channel, so that I can apply different processing parameters when a channel has unique requirements

**Deliverable**: D3 — Configuration management
**Epic**: Mediation Configuration
**Type**: User Story
**Dependencies**: US-20
**Layers**: domain, application, infrastructure, api

## Goal

Implement `PUT /api/partners/:partnerId/channels/:channelId/mediation-configuration` so a channel can have its own mediation configuration that overrides the partner default.

## Context

- Same model as US-20 (`MediationConfiguration`) but with `channelId` set to the channel's ID.
- The effective configuration for an ingestion (used by US-15) resolves: channel-level override takes precedence over partner default.
- Requires non-empty `reason`.
- Partner scope enforcement: commercial managers can only configure channels for their assigned partners.
- Audit required.

## Scope

**In scope**:
- `PUT /api/partners/:partnerId/channels/:channelId/mediation-configuration` route
- `SaveChannelMediationConfiguration` application service
- Verify channel belongs to the given partner (404 if not)

**Out of scope**:
- Deleting/clearing a channel override (later phase)
- Effective configuration resolution logic — that's in US-15

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
  "channelId": "...",
  "blueprintId": "...",
  "parameters": { ... },
  "isActive": true
}
```

## Application service (`server/application/partners/SaveChannelMediationConfiguration.ts`)

Same structure as US-20 but scoped to `channelId`. Deactivates existing active config for `(partnerId, channelId)` before inserting new one.

## Files

- `server/application/partners/SaveChannelMediationConfiguration.ts` — create
- `server/api/partners/[partnerId]/channels/[channelId]/mediation-configuration.put.ts` — create
- `test/integration/api/partner-configuration.test.ts` — extend

## Tests

- Integration: channel override saves correctly; previous channel override is deactivated; channel belonging to different partner returns 404; partner scope enforcement returns 403 for commercial manager

## Acceptance Criteria

- [ ] `PUT .../channels/:channelId/mediation-configuration` saves and returns `configurationVersionId` with `channelId` set
- [ ] Previous active override for same channel is deactivated; partner default remains active
- [ ] Channel not belonging to the given partner returns `404`
- [ ] Missing `reason` returns `422`
- [ ] Commercial manager cannot configure channel for unassigned partner (403)
- [ ] Audit event recorded
