# US-29 — As an administrator, I want to query the audit trail by actor or target resource, so that I can investigate who performed which actions and when during a compliance review

**Deliverable**: D5 — Operator actions & audit
**Epic**: Operator Actions & Audit
**Type**: User Story
**Dependencies**: US-01, US-02
**Layers**: application, infrastructure, api

## Goal

Implement `GET /api/audit-events` so administrators can query the audit trail with filtering and cursor-based pagination.

## Context

- Administrator-only endpoint.
- Supports two primary query patterns per the design doc index priorities:
  1. Filter by `targetId` + date range (e.g. "show all events for ingestion X")
  2. Filter by `actorId` + date range (e.g. "show all actions by user Y")
- Commercial managers have no access to the audit trail in MVP.
- Stub route exists at `server/api/audit-events/index.get.ts`.

## Scope

**In scope**:
- `GET /api/audit-events` with cursor pagination
- Filters: `targetId`, `targetType`, `actorId`, `actorType`, `eventType`, `createdFrom`, `createdTo`
- Sort: `createdAt DESC` only
- Administrator-only (403 for commercial managers)

**Out of scope**:
- Partner-scoped audit read model for commercial managers (later phase)
- Audit event export

## Response shape

```json
{
  "items": [
    {
      "id": "...",
      "eventType": "ingestion.created",
      "actorId": "auth0|...",
      "actorType": "user",
      "targetId": "...",
      "targetType": "ingestion",
      "details": { ... },
      "reason": null,
      "createdAt": "2026-05-17T10:00:00Z"
    }
  ],
  "pageInfo": {
    "nextCursor": "...",
    "hasNextPage": false,
    "limit": 50
  }
}
```

## Port addition (`server/application/audit/IAuditEventRepository.ts`)

Add to the interface defined in US-01:
```ts
list(filter: AuditEventFilter, cursor?: string, limit?: number): Promise<AuditEventListResult>
```

## Infrastructure (`server/infrastructure/repositories/AuditEventRepository.ts`)

Add `list()` method. Uses Prisma `findMany` with composite `where` clause driven by provided filters. Cursor is the `createdAt + id` composite encoded as base64.

## Application service (`server/application/audit/ListAuditEvents.ts`)

```ts
export async function listAuditEvents(
  filter: AuditEventFilter,
  cursor: string | undefined,
  limit: number,
  repo: IAuditEventRepository
): Promise<AuditEventListResult>
```

## Files

- `server/application/audit/IAuditEventRepository.ts` — add `list()` method
- `server/application/audit/ListAuditEvents.ts` — create
- `server/infrastructure/repositories/AuditEventRepository.ts` — add `list()` implementation
- `server/api/audit-events/index.get.ts` — implement (currently stub)
- `test/integration/api/audit-events.test.ts` — extend existing test

## Tests

- Integration: admin retrieves audit events; filter by `targetId` returns only matching events; filter by `actorId` works; cursor pagination advances correctly; commercial manager returns 403; unauthenticated returns 401

## Acceptance Criteria

- [ ] `GET /api/audit-events` returns `{ items, pageInfo }` for admins
- [ ] `targetId` filter returns only events for that target
- [ ] `actorId` filter returns only events by that actor
- [ ] Cursor pagination works correctly
- [ ] Commercial manager returns `403`
- [ ] Unauthenticated returns `401`
