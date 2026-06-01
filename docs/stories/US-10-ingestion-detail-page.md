# US-10 — As an operator, I want a dedicated detail page for each ingestion, so that I can diagnose issues and take corrective action without leaving the context of the affected ingestion

**Deliverable**: D1 — Manual upload
**Epic**: Upload & Detail UI
**Type**: User Story
**Dependencies**: US-09, US-28
**Layers**: ui

## Goal

Build the ingestion detail page at `/ingestions/:id` showing full lifecycle state, execution history, billing-system status, and (for admins) a re-run button and file download link.

## Context

- Data comes from `GET /api/ingestions/:ingestionId` (US-09).
- Re-run button calls `POST /api/ingestions/:ingestionId/re-run` (US-28) — admin only.
- File download link calls `GET /api/ingestions/:ingestionId/files/:fileId/download` (US-27) — admin only.
- Role-shaped: admin sees raw storage path, Lambda execution IDs, download link, re-run button. Commercial manager sees sanitized view.
- Executions are listed newest-first.
- Stuck indicator if `isStuck === true`.
- Billing-system status displayed separately from ingestion status.

## Scope

**In scope**:
- `/pages/ingestions/[id].vue` — detail page
- Ingestion header (partner, billing period, channel, status badge, stuck badge)
- Source metadata section (filename, source type; admin: raw storage path)
- Billing transfer section (billing reference, billing status, reported at)
- Execution history table (stage, status, started at, error summary; admin: Lambda execution ID)
- Admin actions section: re-run button, file download link
- Re-run confirmation: simple inline confirm (no modal needed for MVP — just a "confirm" state on the button)

**Out of scope**:
- Ignore action (later phase)
- Historical configuration version display (later phase)
- Audit trail for this ingestion on this page

## Component structure

```
pages/ingestions/[id].vue
  components/ingestions/IngestionHeader.vue
  components/ingestions/IngestionSourceMetadata.vue
  components/ingestions/BillingTransferStatus.vue
  components/ingestions/ExecutionHistoryTable.vue
  components/ingestions/AdminActions.vue           — re-run button + download link
```

## Re-run button behavior

1. First click: button text changes to "Confirm re-run?" with a cancel option
2. Second click (confirm): calls `POST /api/ingestions/:id/re-run`, shows success toast, refreshes page data
3. On error: shows error message inline

## File download link behavior

Renders as `<a href="/api/ingestions/:id/files/:fileId/download">Download original file</a>`. The server returns a 302 redirect to S3, so a standard link works.

## Files

- `pages/ingestions/[id].vue` — create
- `components/ingestions/IngestionHeader.vue` — create
- `components/ingestions/IngestionSourceMetadata.vue` — create
- `components/ingestions/BillingTransferStatus.vue` — create
- `components/ingestions/ExecutionHistoryTable.vue` — create
- `components/ingestions/AdminActions.vue` — create

## Tests

- Smoke: `test/smoke/operator-pages.test.ts` — verify `/ingestions/[id]` page renders

## Acceptance Criteria

- [ ] Page shows ingestion status, source metadata, billing transfer status, and execution history
- [ ] Admin sees raw storage path, Lambda execution IDs per execution, re-run button, download link
- [ ] Commercial manager does not see raw technical fields, re-run button, or download link
- [ ] Re-run button requires two-click confirmation before calling the API
- [ ] After successful re-run, page data refreshes and new execution appears in history
- [ ] `isStuck === true` shows a stuck badge in the header
- [ ] Page renders correctly for ingestion with no executions yet (`status: "waiting_for_mediation"`)
- [ ] Loading state is shown while fetching ingestion data
- [ ] Unauthenticated user is redirected to the login page
