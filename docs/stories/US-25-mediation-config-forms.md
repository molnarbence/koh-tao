# US-25 — As a commercial manager, I want a form to select a mediation blueprint and fill in parameter values for a partner or channel, so that I can configure mediation settings without needing to know the underlying technical details

**Deliverable**: D3 — Configuration management
**Epic**: Configuration UI
**Type**: User Story
**Dependencies**: US-20, US-21, US-18
**Layers**: ui

## Goal

Build mediation configuration forms for setting a partner's default blueprint and optional channel-level overrides, with a blueprint selector that renders dynamic parameter inputs based on the selected blueprint's `parameterSchema`.

## Context

- Blueprints come from `GET /api/mediation-blueprints` (US-18).
- Partner default config saved via `PUT /api/partners/:partnerId/mediation-configuration` (US-20).
- Channel override saved via `PUT /api/partners/:partnerId/channels/:channelId/mediation-configuration` (US-21).
- The `parameterSchema` on a blueprint is a JSON Schema object. The form must render inputs for each property in the schema. For MVP, support `string` and `number` type properties only.
- A `reason` field is required on both forms (non-empty).
- Per design: "When a commercial account manager selects a mediation blueprint, the UI should display the associated set of parameters so the manager can provide partner-specific or channel-specific values."

## Scope

**In scope**:
- `/pages/partners/[partnerId]/mediation-configuration.vue` — partner default form
- `/pages/partners/[partnerId]/channels/[channelId]/mediation-configuration.vue` — channel override form
- Blueprint selector dropdown (shows `name` of each blueprint)
- Dynamic parameter inputs rendered from `parameterSchema` properties (string → text input, number → number input)
- Required `reason` text input
- Submit calls appropriate API endpoint
- Success: show confirmation message, navigate back to channel list or partner page

**Out of scope**:
- Complex JSON Schema types (arrays, nested objects) beyond string/number
- Historical configuration version display (later phase)

## Component structure

```
components/mediation/MediationConfigForm.vue   — shared form component
  — props: partnerId, channelId? (if set, uses channel override endpoint)
  — blueprint selector
  — dynamic parameter fields
  — reason input
  — submit button
```

## Dynamic parameter rendering

```ts
// For each property in blueprint.parameterSchema.properties:
const fieldType = property.type === 'number' ? 'number' : 'text'
// Render <input :type="fieldType" :name="key" :required="required.includes(key)" />
```

## Files

- `pages/partners/[partnerId]/mediation-configuration.vue` — create
- `pages/partners/[partnerId]/channels/[channelId]/mediation-configuration.vue` — create
- `components/mediation/MediationConfigForm.vue` — create

## Tests

- Smoke: `test/smoke/partner-configuration-pages.test.ts` — verify both config pages render
- Playwright: selecting a blueprint renders its parameter inputs; submitting without reason shows validation error

## Acceptance Criteria

- [ ] Blueprint selector populates from `GET /api/mediation-blueprints`
- [ ] Selecting a blueprint renders parameter inputs derived from `parameterSchema.properties`
- [ ] `reason` field is required — form blocks submission if empty
- [ ] Partner default form saves via `PUT /api/partners/:partnerId/mediation-configuration`
- [ ] Channel override form saves via `PUT .../channels/:channelId/mediation-configuration`
- [ ] Success shows confirmation and navigates away
- [ ] API errors (e.g. blueprint not found) are shown inline
