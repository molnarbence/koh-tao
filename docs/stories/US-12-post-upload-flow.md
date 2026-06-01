# US-12 — As a commercial manager, I want to be offered a clear next step after a successful upload, so that I can continue my upload workflow without losing track of submitted ingestions

**Deliverable**: D1 — Manual upload
**Epic**: Upload & Detail UI
**Type**: User Story
**Dependencies**: US-11
**Layers**: ui

## Goal

After a successful manual upload, present the user with a choice to either upload another file for a different partner or navigate to the created ingestion's detail page.

## Context

- Per the design spec: "After a successful manual upload, the UI should offer the user a choice to upload another file for a different partner or navigate to the created ingestion detail page."
- The API response from US-08 returns `{ ingestionId }` on success.
- This flow is a post-submit state on the upload page — not a separate page.

## Scope

**In scope**:
- Success state on `pages/ingestions/upload.vue` after API returns 201
- Two action buttons: "Upload another file" and "View ingestion"
- "Upload another file" resets the form (clears file, optionally clears partner and billing period)
- "View ingestion" navigates to `/ingestions/:ingestionId`

**Out of scope**:
- Toast notifications elsewhere in the app
- Email confirmation

## Success state UI

```
✓ File uploaded successfully

[Upload another file]   [View ingestion →]
```

Show a simple success section replacing the form content. "Upload another file" button resets form state and shows the form again. "View ingestion" uses `navigateTo('/ingestions/' + ingestionId)`.

## Files

- `pages/ingestions/upload.vue` — add success state to existing upload form (from US-11)

## Tests

- Smoke: after form submission returns 201, success state is shown
- Playwright: click "Upload another file" shows form again; click "View ingestion" navigates to detail page

## Acceptance Criteria

- [ ] After successful upload, form is replaced by a success state with two action buttons
- [ ] "Upload another file" resets the form and shows it again
- [ ] "View ingestion" navigates to `/ingestions/:ingestionId` using the returned ID
- [ ] Success state is not shown on error
