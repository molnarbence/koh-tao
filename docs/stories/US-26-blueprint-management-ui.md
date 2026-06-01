# US-26 — As an administrator, I want a management screen to create and edit mediation blueprints, so that I can maintain the catalogue of supported mediation functions and immediately see which partners would be affected by a change

**Deliverable**: D3 — Configuration management
**Epic**: Configuration UI
**Type**: User Story
**Dependencies**: US-19
**Layers**: ui

## Goal

Build the administrator-only mediation blueprint management screens: a list page and a create/edit form with impact preview showing channels that would auto-deactivate on save.

## Context

- Admin only — commercial managers should not see this section.
- Blueprint list from `GET /api/mediation-blueprints` (US-18).
- Create via `POST /api/mediation-blueprints`; edit via `PUT /api/mediation-blueprints/:id` (US-19).
- The API response for create/update includes `impactedChannels` — the UI must show this before the user confirms the save.
- The impact preview is informational only; it does not require a separate second confirmation step beyond the save action itself.
- Per design: "Before saving a mediation-blueprint edit, the UI should preview the impacted partners and channels that would be invalidated or automatically deactivated."

## Scope

**In scope**:
- `/pages/admin/mediation-blueprints/index.vue` — list page with "Create" button
- `/pages/admin/mediation-blueprints/[blueprintId].vue` — edit form
- `/pages/admin/mediation-blueprints/new.vue` — create form (or combine with edit form via route param)
- Blueprint form fields: `name`, `functionIdentifier`, `parameterSchema` (JSON textarea), `reason`
- Impact preview panel: shown after user clicks "Save" but before the API call completes — actually the API call already returns the impact. Flow: call API → show impact list + "Confirm" step — wait, actually per design "The impact preview is informational and does not require a separate second confirmation step beyond the save action itself." So: call API → if `impactedChannels.length > 0`, show summary of what was deactivated after save. No pre-save modal.
- "Create" button on list page navigates to new form

**Out of scope**:
- Blueprint deletion
- Historical version browsing (later phase)
- Second-approval workflow (later phase)

## Impact preview display

After a successful save, if `impactedChannels.length > 0`, show an inline notice:
```
Blueprint saved. The following channels were automatically deactivated:
- Partner A — SFTP channel
- Partner B — API channel
```

## Component structure

```
pages/admin/mediation-blueprints/index.vue
pages/admin/mediation-blueprints/new.vue
pages/admin/mediation-blueprints/[blueprintId].vue
  components/mediation/BlueprintForm.vue
    — name input
    — functionIdentifier input
    — parameterSchema JSON textarea (with basic JSON syntax validation)
    — reason input (required)
    — submit button
  components/mediation/ImpactedChannelsSummary.vue
    — shown after save when impactedChannels.length > 0
```

## JSON textarea validation

Client-side: attempt `JSON.parse(value)` on blur; show inline error if not valid JSON.

## Files

- `pages/admin/mediation-blueprints/index.vue` — create
- `pages/admin/mediation-blueprints/new.vue` — create
- `pages/admin/mediation-blueprints/[blueprintId].vue` — create
- `components/mediation/BlueprintForm.vue` — create
- `components/mediation/ImpactedChannelsSummary.vue` — create

## Navigation guard

Add a route middleware that checks `caller.role === 'administrator'` and redirects non-admins away from `/admin/*` routes.

## Tests

- Smoke: admin blueprint list page renders; new blueprint form renders
- Playwright: submit form with invalid JSON in `parameterSchema` shows error; submit with empty `reason` shows validation error; successful create shows new blueprint in list

## Acceptance Criteria

- [ ] List page shows all blueprints with name and function identifier
- [ ] "Create" button navigates to new blueprint form
- [ ] Saving a new blueprint adds it to the list
- [ ] Editing a blueprint updates it
- [ ] After save with `impactedChannels.length > 0`, inline summary shows deactivated channels
- [ ] `parameterSchema` textarea rejects invalid JSON client-side
- [ ] `reason` field required — blocks submission if empty
- [ ] Non-administrator users are redirected away from `/admin/*` pages
