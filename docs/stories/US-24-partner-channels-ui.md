# US-24 — As an operator, I want a channel management page for each partner, so that I can view and toggle channel activation states without needing to use a separate tool

**Deliverable**: D3 — Configuration management
**Epic**: Configuration UI
**Type**: User Story
**Dependencies**: US-22, US-23
**Layers**: ui

## Goal

Build the partner channels management page showing channel list with activation/deactivation toggle, blocked state display when no mediation config exists, and clear feedback on auto-deactivation constraints.

## Context

- Page at `/partners/:partnerId/channels`.
- Data from `GET /api/partners/:partnerId/channels` (US-22).
- Activate/deactivate toggle calls `PUT .../activation-state` (US-23).
- If activation fails with `CHANNEL_ACTIVATION_REQUIRES_MEDIATION_CONFIG`, show an inline message: "This channel cannot be activated until a valid mediation configuration is saved."
- Existing page: `pages/partners/index.vue` exists — add channel management as a sub-page.

## Scope

**In scope**:
- `/pages/partners/[partnerId]/channels.vue`
- Channel list with type, activation state toggle, and status
- Inline error message when activation blocked by missing config
- Loading state during toggle
- Partner name in page header (fetch from `GET /api/partners` or embed in route)

**Out of scope**:
- Mediation configuration forms (US-25)
- Channel create/edit (later phase)

## Component structure

```
pages/partners/[partnerId]/channels.vue
  components/channels/ChannelList.vue
  components/channels/ChannelRow.vue         — channel type, toggle, error message
```

## Toggle behavior

1. User clicks toggle
2. Loading indicator on the row
3. On success: toggle state updates, no toast needed
4. On `CHANNEL_ACTIVATION_REQUIRES_MEDIATION_CONFIG` error: toggle stays off, inline message appears below the row: "Configure a mediation blueprint first before activating this channel."
5. On other errors: generic error message

## Files

- `pages/partners/[partnerId]/channels.vue` — create
- `components/channels/ChannelList.vue` — create
- `components/channels/ChannelRow.vue` — create

## Tests

- Smoke: `test/smoke/partner-configuration-pages.test.ts` — verify channels page renders
- Playwright: toggle activation shows loading state; activation without config shows inline error

## Acceptance Criteria

- [ ] Channel list renders with `channelType` and `isActive` state for each channel
- [ ] Toggle correctly reflects `isActive` from API
- [ ] Toggling to active when no mediation config exists shows inline error message
- [ ] Loading state shown during API call
- [ ] Page is scoped to the caller's partner access (commercial manager cannot see other partners' channels via URL manipulation — server enforces this)
