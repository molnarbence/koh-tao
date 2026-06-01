# US-07 — As a commercial manager, I want to see and interact only with the partners I am responsible for, so that I can work without accidentally viewing or modifying another manager's partner data

**Deliverable**: D5 — Auth, authorization & audit
**Epic**: Auth & Authorization
**Type**: User Story
**Dependencies**: US-02
**Layers**: application, api

## Goal

Enforce that commercial managers can only read and write data for partners they are assigned to, while administrators have unrestricted cross-partner access.

## Context

- Role is available on `event.context.caller.role` after US-02.
- Two roles: `administrator` and `commercial_manager`.
- Partner assignment for commercial managers is stored in Auth0 as a custom claim on the JWT (e.g. `https://kohtao/partnerIds: string[]`).
- The application must not trust client-supplied partner filters without also enforcing them server-side.
- Partner scope must be checked in the application layer, not scattered across individual route handlers.

## Scope

**In scope**:
- Utility function `getCallerPartnerScope(event)` that returns either `{ type: 'all' }` or `{ type: 'restricted', partnerIds: string[] }`
- `assertPartnerAccess(event, partnerId)` that throws `403` if the caller does not have access to the given partner
- `applyPartnerFilter(scope, query)` helper that adds a `partnerId IN [...]` filter to Prisma queries for restricted callers

**Out of scope**:
- Storing partner assignments in the application database — these come from the JWT claim only
- Role management or assignment UI

## Implementation

### Application utility (`server/utils/authorization.ts`)

```ts
function getCallerPartnerScope(event): PartnerScope
// Returns { type: 'all' } for administrator
// Returns { type: 'restricted', partnerIds } for commercial_manager, reading
// the 'https://kohtao/partnerIds' claim from the JWT payload stored in event.context.caller

function assertPartnerAccess(event, partnerId: string): void
// Throws createError({ statusCode: 403 }) if caller is restricted and partnerId not in their list

function applyPartnerFilter<T extends { partnerId?: string }>(
  scope: PartnerScope,
  where: T
): T
// If scope is restricted, merges { partnerId: { in: scope.partnerIds } } into the Prisma where clause
```

### Usage pattern in route handlers

```ts
// In GET /api/partners/:partnerId/channels
const scope = getCallerPartnerScope(event)
assertPartnerAccess(event, partnerId)
// ... proceed with query
```

## Files

- `server/utils/authorization.ts` — add `getCallerPartnerScope`, `assertPartnerAccess`, `applyPartnerFilter`
- `test/domain/auth/authorization.test.ts` — extend existing test file

## Tests

- Unit: `assertPartnerAccess` throws 403 when commercial manager accesses a partner not in their list
- Unit: `assertPartnerAccess` passes for administrator regardless of partnerId
- Unit: `applyPartnerFilter` adds `partnerId IN` clause for restricted scope; passes through for `all` scope

## Acceptance Criteria

- [ ] Commercial manager JWT with `partnerIds: ["p1"]` cannot access data for partner `p2` (403)
- [ ] Administrator JWT can access any partner
- [ ] `applyPartnerFilter` correctly constrains Prisma `where` clauses
- [ ] All unit tests pass with `bun test test/domain/auth`
