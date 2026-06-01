# US-02 — As an operator, I want the application to verify my identity on every request, so that I can be confident that ingestion data is only accessible to authenticated users

**Deliverable**: D5 — Auth, authorization & audit
**Epic**: Auth & Authorization
**Type**: User Story
**Dependencies**: none
**Layers**: infrastructure, api

## Goal

Validate Auth0 JWTs on all operator-facing routes, extract user identity and role, and attach them to the request context so downstream handlers can make authorization decisions.

## Context

- Auth0 is the sole source of truth for human user identities and role assignments.
- The application does not maintain its own user table.
- JWT validation must happen before any business logic executes.
- `server/utils/auth.ts` and `server/utils/authorization.ts` exist as stubs.
- Runtime config keys available in `nuxt.config.ts`: `auth0Domain`, `auth0Audience`, `auth0ClientId`.

## Scope

**In scope**:
- Nuxt server middleware that validates the Bearer token on all routes under `/api/` except `/api/internal/`
- Extract `sub` (Auth0 user ID) and role claim from verified JWT payload
- Attach `{ userId, role }` to `event.context.caller`
- Return `401 Unauthorized` with standard error shape `{ code, message, requestId }` for missing or invalid tokens
- Return `401` for expired tokens

**Out of scope**:
- Partner scope filtering (US-07)
- M2M token validation (US-13)
- Role-based access control beyond attaching the role to context

## Implementation

### Infrastructure (`server/infrastructure/auth/`)

Create `JwtValidator` that:
- Fetches and caches Auth0 JWKS from `https://{auth0Domain}/.well-known/jwks.json`
- Verifies RS256 signature, `aud` claim (must equal `auth0Audience`), and `exp`
- Returns parsed payload or throws a typed `AuthError`

### API middleware (`server/middleware/auth.ts`)

Nuxt server middleware (runs on every request):
- Skip routes matching `/api/internal/`
- Extract `Authorization: Bearer <token>` header
- Call `JwtValidator.verify(token)`
- On success: set `event.context.caller = { type: 'user', userId: payload.sub, role: payload['https://kohtao/role'] }`
- On failure: throw `createError({ statusCode: 401, ... })`

### Utility (`server/utils/authorization.ts`)

Add helper `requireUser(event)` that reads `event.context.caller`, asserts `type === 'user'`, and throws 401 if not set. Downstream route handlers call this.

## Files

- `server/infrastructure/auth/JwtValidator.ts` — create
- `server/middleware/auth.ts` — implement (currently stub)
- `server/utils/authorization.ts` — add `requireUser` helper
- `test/integration/api/auth.test.ts` — create

## Tests

- Unit: `JwtValidator` rejects expired token, wrong audience, bad signature
- Integration: operator route returns 401 with no token; returns 401 with invalid token; returns 200 with valid token and attaches context

## Acceptance Criteria

- [ ] Request to `GET /api/partners` without token returns `401` with `{ code: "UNAUTHORIZED", message, requestId }`
- [ ] Request with expired JWT returns `401`
- [ ] Request with valid JWT has `event.context.caller.userId` set to Auth0 `sub`
- [ ] Request with valid JWT has `event.context.caller.role` set from the JWT claim
- [ ] `/api/internal/*` routes are not affected by this middleware
