# US-06 — As an administrator, I want to filter the dashboard by partner, billing period, and status with automatic refresh, so that I can monitor live ingestion progress without manually reloading the page

**Deliverable**: D2 — Operational dashboard
**Epic**: Dashboard UI
**Type**: User Story
**Dependencies**: US-05
**Layers**: ui

## Goal

Add a filter bar to the dashboard with partner, billing period, channel, and status filters, and implement 30-second auto-refresh of the ingestion list.

## Context

- Filters map directly to query params on `GET /api/ingestions` (US-04).
- Default: current billing period selected.
- Billing period selector: dropdown of available billing periods (e.g. the last 12 months as options, current month pre-selected).
- Partner filter: dropdown, populated from `GET /api/partners`.
- Status filter: multi-select of status vocabulary values.
- Auto-refresh: re-fetches data every 30 seconds without a full page reload. Does not reset collapsed/expanded group state.
- Filter changes reset to page 1 of results.

## Scope

**In scope**:
- Filter bar component with partner, billing period, status filters
- Auto-refresh every 30 seconds (use `setInterval` + `clearInterval` on unmount)
- Preserve expanded group state across refreshes (expand state is local component state, not reset by data refetch)
- Clear/reset filters button

**Out of scope**:
- Persisting filter preferences across sessions (not a current requirement per design)
- Date range pickers (use billing period selector only for MVP)

## Component structure

```
components/ingestions/DashboardFilterBar.vue
  — partner selector (dropdown, from /api/partners)
  — billing period selector (dropdown, last 12 months)
  — status multi-select
  — reset button
```

## Auto-refresh implementation

```ts
// In the dashboard page composable or setup
const REFRESH_INTERVAL_MS = 30_000
onMounted(() => {
  const timer = setInterval(fetchIngestions, REFRESH_INTERVAL_MS)
  onUnmounted(() => clearInterval(timer))
})
```

Do not reset the timer on filter change — only reset data fetch.

## Files

- `components/ingestions/DashboardFilterBar.vue` — create
- `pages/index.vue` (or ingestions page) — add filter bar and auto-refresh logic

## Tests

- Smoke: filter bar renders; changing billing period updates displayed groups

## Acceptance Criteria

- [ ] Partner dropdown populated from `GET /api/partners`
- [ ] Billing period dropdown shows last 12 months with current month pre-selected
- [ ] Status multi-select includes all 8 status values
- [ ] Selecting a filter updates the ingestion list
- [ ] Reset button clears all filters back to defaults
- [ ] Data refreshes automatically every 30 seconds
- [ ] Auto-refresh does not collapse expanded groups
- [ ] Auto-refresh timer is cleared when the component is unmounted
