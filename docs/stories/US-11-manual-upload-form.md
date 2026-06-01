# US-11 — As a commercial manager, I want a guided form to select a partner, enter a billing period, and upload a file, so that I can submit partner data correctly the first time without relying on engineering support

**Deliverable**: D1 — Manual upload
**Epic**: Upload & Detail UI
**Type**: User Story
**Dependencies**: US-08, US-03
**Layers**: ui

## Goal

Build the manual upload form at `/ingestions/upload` where commercial managers can select a partner, enter a billing period, and upload a CSV or Excel file.

## Context

- Commercial managers use this form when automated ingestion is unavailable.
- Partner selector is populated from `GET /api/partners?hasActiveManualUploadChannel=true` (US-03) — only partners with an active manual-upload channel appear.
- Selecting the partner is sufficient — the single active manual-upload channel is implied.
- Billing period is a required explicit input (e.g. `2026-05`).
- Accepted file types: CSV, XLS, XLSX.
- Form submits to `POST /api/ingestions/manual-uploads` (US-08) as `multipart/form-data`.
- If the partner has no active manual-upload channel, the form must indicate this and prevent submission.

## Scope

**In scope**:
- `/pages/ingestions/upload.vue` — form page
- Partner selector (fetched from API, filtered to active manual-upload channels)
- Billing period input (month picker or text input in `YYYY-MM` format)
- File drop zone (drag-and-drop + click-to-browse)
- Client-side validation: partner required, billing period required and valid format, file required and accepted MIME type
- Submit button disabled until all fields valid
- Server-side error display (file type rejection, channel deactivated error from API)
- Loading state during upload

**Out of scope**:
- Post-upload flow (US-12)
- Admin access to this form (admin has no default business need to upload)

## Component structure

```
pages/ingestions/upload.vue
  components/upload/PartnerSelector.vue     — dropdown from /api/partners
  components/upload/BillingPeriodInput.vue  — YYYY-MM text input with validation
  components/upload/FileDropZone.vue        — drag-and-drop file input
```

## Validation rules (client-side)

- Partner: required
- Billing period: required, must match `/^\d{4}-(0[1-9]|1[0-2])$/`
- File: required, MIME type must be `text/csv`, `application/vnd.ms-excel`, or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; file size > 0

## Error display

Map API error codes to user-friendly messages:
- `INVALID_FILE` → "The selected file type is not supported. Please upload a CSV or Excel file."
- `CHANNEL_NOT_ACTIVE` → "This partner's upload channel is currently deactivated. Contact your administrator."
- Generic 5xx → "An unexpected error occurred. Please try again."

## Files

- `pages/ingestions/upload.vue` — create
- `components/upload/PartnerSelector.vue` — create
- `components/upload/BillingPeriodInput.vue` — create
- `components/upload/FileDropZone.vue` — create

## Tests

- Smoke: `test/smoke/operator-pages.test.ts` — verify `/ingestions/upload` renders
- Playwright: submit form with invalid file type shows error message (use playwright-cli skill)

## Acceptance Criteria

- [ ] Partner selector shows only partners with active manual-upload channels
- [ ] Billing period input rejects invalid formats client-side
- [ ] File drop zone accepts CSV and Excel, rejects other types client-side
- [ ] Submit button disabled until all fields are valid
- [ ] API error `CHANNEL_NOT_ACTIVE` displays the correct user message
- [ ] API error `INVALID_FILE` displays the correct user message
- [ ] Unexpected server errors (5xx) display a generic retry message
- [ ] Loading spinner shown during upload
- [ ] Unauthenticated user is redirected to the login page
