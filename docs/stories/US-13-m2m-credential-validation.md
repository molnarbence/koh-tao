# US-13 — As the mediation system, I want to authenticate to the application API using machine credentials, so that I can securely create ingestions and report status updates without user-level access

**Deliverable**: D4 — Machine reporting
**Epic**: M2M Auth & Ingestion Lifecycle
**Type**: User Story
**Dependencies**: none
**Layers**: infrastructure, api

## Goal

Validate Auth0 client credentials tokens on all `/api/internal/*` routes, extract machine client identity, and reject requests with missing or insufficient scopes.

## Context

- Two machine clients exist: `mediation_layer_reporter` and `bulk_upload_status_reporter`.
- Machine clients authenticate using the Auth0 OAuth 2.0 client credentials flow and receive a JWT access token.
- Each machine client has a distinct set of allowed scopes. The application must verify the token carries the correct scope for the endpoint being called.
- Machine client identity must be extractable for audit attribution (US-01).
- Runtime config keys: `auth0Domain`, `auth0Audience`.

## Scope

**In scope**:
- Nuxt server middleware that validates Bearer tokens on `/api/internal/*` routes
- Verify RS256 signature, `aud`, `exp` (reuse `JwtValidator` from US-02)
- Extract `sub` (Auth0 client ID) and `scope` claim
- Attach `{ type: 'machine', clientId: payload.sub, scopes: string[] }` to `event.context.caller`
- Return `401` for missing/invalid/expired token
- Return `403` if the token lacks the required scope for the endpoint

**Out of scope**:
- Human JWT validation (US-02)
- Defining which scopes map to which endpoints — each route handler checks `event.context.caller.scopes` against its required scope constant

## Scope constants (define in `server/utils/authorization.ts`)

```
SCOPES = {
  PROCESSING_STATUS_UPDATE: 'write:processing-status',
  BILLING_STATUS_UPDATE: 'write:billing-status',
  INGESTION_CREATE: 'write:ingestions',
  MEDIATION_CONFIG_READ: 'read:mediation-config',
}
```

## Implementation

### API middleware (`server/middleware/internal-auth.ts`)

Nuxt server middleware:
- Match only `/api/internal/` prefix
- Reuse `JwtValidator` from US-02 (shared infrastructure)
- On success: set `event.context.caller = { type: 'machine', clientId, scopes }`
- On missing/invalid token: throw 401
- Downstream route handlers call `requireScope(event, SCOPES.X)` before business logic

### Utility additions (`server/utils/authorization.ts`)

Add `requireMachine(event)` and `requireScope(event, scope)` helpers.

## Files

- `server/middleware/internal-auth.ts` — create
- `server/utils/authorization.ts` — add `requireMachine`, `requireScope`
- `test/integration/api/internal-auth.test.ts` — create

## Tests

- Integration: `/api/internal/processing-status-updates` returns 401 with no token; 403 with token missing required scope; 200 (or business-logic response) with correct scope

## Acceptance Criteria

- [ ] Request to `/api/internal/processing-status-updates` without token returns `401`
- [ ] Token with wrong scope returns `403` with `{ code: "FORBIDDEN", message, requestId }`
- [ ] Valid token sets `event.context.caller.type === 'machine'` and `clientId` to Auth0 client `sub`
- [ ] Human user tokens are rejected on internal routes (different audience or missing machine scope)
