# US-04 — As an administrator, I want to browse and filter all ingestions across partners and billing periods, so that I can quickly locate and investigate processing issues

**Deliverable**: D2 — Operational dashboard
**Epic**: Ingestion Reads
**Type**: User Story
**Dependencies**: US-02, US-07
**Layers**: application, infrastructure, api

> **D1 simplification**: implement with admin-only access first. Commercial manager filtering (US-07) is added in D2.

## Goal

Implement `GET /api/ingestions` with cursor-based pagination, filter parameters, and role-shaped response so the dashboard and operational table can list ingestions efficiently.

## Context

- Default sort: `createdAt DESC` (newest first).
- Default scope: current billing period (server derives current month if no `billingPeriod` filter supplied).
- Ingestions with status `waiting_for_mediation` (no processing update yet) must be included in results — no filter should hide them by default.
- The dashboard uses a grouped view (partner + billing period). The route should support an optional `groupBy=partner,billingPeriod` query mode that returns group summaries alongside items. Group status = status of the newest ingestion in the group.
- Response is role-shaped: administrators see full operational fields; commercial managers see sanitized fields (no raw storage paths, no Lambda execution IDs).
- Commercial manager responses are filtered to assigned partners only (US-07).
- Index priorities (from design doc): filter by `partnerId, billingPeriodStart, status, createdAt` — this composite index exists on the `Ingestion` model.

## Scope

**In scope**:
- `GET /api/ingestions` with cursor pagination
- Filters: `partnerId`, `billingPeriod`, `channelId`, `status`, `createdFrom`, `createdTo`
- Sort: `createdAt desc` (only supported sort in MVP)
- Dashboard group mode: `groupBy=partner,billingPeriod` returns `{ groups: [...], pageInfo }`
- Role-shaped response (admin vs commercial manager fields)
- Partner scope filtering via US-07

**Out of scope**:
- Free-text search
- Execution history in list items (in detail only, US-09)
- Billing transfer status in list items

## Standard response shape

```json
{
  "items": [
    {
      "id": "...",
      "partnerId": "...",
      "partnerName": "...",
      "channelType": "...",
      "billingPeriod": "2026-05",
      "status": "mediation_started",
      "originalFilename": "...",
      "createdAt": "2026-05-17T10:00:00Z",
      "isStuck": false
    }
  ],
  "pageInfo": {
    "nextCursor": "...",
    "hasNextPage": true,
    "limit": 50
  }
}
```

`isStuck` is `true` if status is an in-progress state and `createdAt` is more than 15 minutes ago (computed server-side, not persisted).

Admin-only fields added to each item: `sourceObjectKey`, `lambdaExecutionId`.

## Group mode response shape (when `groupBy=partner,billingPeriod`)

```json
{
  "groups": [
    {
      "partnerId": "...",
      "partnerName": "...",
      "billingPeriod": "2026-05",
      "groupStatus": "mediation_started",
      "ingestionCount": 3,
      "newestIngestionId": "...",
      "newestCreatedAt": "2026-05-17T10:00:00Z"
    }
  ],
  "pageInfo": { ... }
}
```

## Application service (`server/application/ingestions/ListIngestions.ts`)

```ts
export async function listIngestions(
  filter: IngestionListFilter,
  cursor: string | undefined,
  limit: number,
  scope: PartnerScope,
  callerRole: 'administrator' | 'commercial_manager',
  repo: IIngestionRepository
): Promise<IngestionListResult>
```

## Files

- `server/application/ingestions/ListIngestions.ts` — create
- `server/infrastructure/repositories/IngestionRepository.ts` — add `list()` method with filter/cursor support
- `server/api/ingestions/index.get.ts` — create
- `test/integration/api/ingestions.test.ts` — create

## Tests

- Integration: returns paginated results; cursor advances correctly; `billingPeriod` filter works; commercial manager sees only assigned partners; admin sees all; `isStuck` is true for ingestion >15 min in in-progress state; empty current billing period returns `{ items: [] }`

## Acceptance Criteria

- [ ] `GET /api/ingestions` returns `{ items, pageInfo }` with cursor pagination
- [ ] Default scope is current billing period when no `billingPeriod` filter is given
- [ ] `isStuck: true` for ingestions >15 min in an in-progress status
- [ ] Commercial manager sees only assigned-partner ingestions
- [ ] Admin sees raw storage path fields; commercial manager does not
- [ ] `groupBy=partner,billingPeriod` returns group summaries
- [ ] Empty result returns `{ items: [], pageInfo: { hasNextPage: false, ... } }`
