# US-05 — As an administrator, I want to see ingestions grouped by partner and billing period on a dashboard, so that I can get an at-a-glance view of the current processing status

**Deliverable**: D2 — Operational dashboard
**Epic**: Dashboard UI
**Type**: User Story
**Dependencies**: US-04
**Layers**: ui

## Goal

Build the main dashboard page at `/` showing ingestions grouped by partner and billing period, collapsed by default, with an empty-state placeholder when no ingestions exist for the current billing period.

## Context

- Framework: Nuxt 4, Vue, Tailwind CSS.
- Page lives at `pages/index.vue` (or `pages/ingestions/index.vue` — check `app.vue` to determine router root).
- Data comes from `GET /api/ingestions?groupBy=partner,billingPeriod` (US-04).
- Default view: current billing period, all ingestions (including successful/terminal ones).
- Groups collapsed by default; clicking a group header expands to show individual ingestion rows.
- Group status = status of the newest ingestion in the group.
- Stuck indicator: show a visual badge (e.g. orange "Stuck") on ingestion rows where `isStuck === true`.
- Empty state: if the current billing period has no ingestions, show the text "No ingestions occurred yet" centered on the page.
- Existing pages: `pages/ingestions/index.vue`, `pages/audit/index.vue`, `pages/partners/index.vue` — check what already exists before creating new files.

## Scope

**In scope**:
- Dashboard page component
- Collapsible group rows (partner name + billing period as header)
- Individual ingestion rows inside expanded groups (id, status badge, channel type, filename, created time, stuck badge)
- Empty-state placeholder
- Status badge component (maps status string to colored label)
- Loading state while fetching

**Out of scope**:
- Filter bar (US-06)
- Auto-refresh (US-06)
- Detailed ingestion view (US-10)
- Re-run action (US-10)

## Component structure

```
pages/index.vue (or pages/ingestions/index.vue)
  components/ingestions/IngestionGroupList.vue   — renders groups
  components/ingestions/IngestionGroup.vue       — collapsible group row + expanded rows
  components/ingestions/IngestionRow.vue         — single ingestion row
  components/ingestions/StatusBadge.vue          — colored status label
```

## Status badge colors (Tailwind)

| Status | Color |
|--------|-------|
| `waiting_for_mediation` | gray |
| `mediation_started` | blue |
| `mediation_failed` | red |
| `data_quality_validation_failed` | orange |
| `skipped` | yellow |
| `uploaded_to_billing_system` | blue |
| `ingested_by_billing_system` | green |
| `billing_system_failed_to_process` | red |

## Group status mapping

Group header shows the status badge of the group's `groupStatus` field from the API response.

## Files

- `pages/index.vue` (or extend existing ingestions page) — create/implement
- `components/ingestions/IngestionGroupList.vue` — create
- `components/ingestions/IngestionGroup.vue` — create
- `components/ingestions/IngestionRow.vue` — create
- `components/ingestions/StatusBadge.vue` — create

## Tests

- Smoke: `test/smoke/operator-pages.test.ts` — verify `/` renders without error and shows group list or empty state

## Acceptance Criteria

- [ ] Dashboard renders group list when ingestions exist for current billing period
- [ ] Groups are collapsed by default; clicking expands ingestion rows
- [ ] Empty state shows "No ingestions occurred yet" when no ingestions exist for current billing period
- [ ] Stuck badge visible on rows where `isStuck === true`
- [ ] Status badges use correct colors per status
- [ ] Loading state shown while API call is in flight
- [ ] Page is accessible without JavaScript errors in browser console
