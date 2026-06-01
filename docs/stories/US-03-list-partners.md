# US-03 — As an operator, I want to see a list of partners I have access to, so that I can select the right partner when performing uploads or configuration tasks

**Deliverable**: D1 — Manual upload
**Epic**: Ingestion Creation
**Type**: User Story
**Dependencies**: US-02, US-07
**Layers**: domain, application, infrastructure, api

## Goal

Implement `GET /api/partners` so callers can list partners they have access to, with an optional filter for partners that currently have an active manual-upload channel.

## Context

- `Partner` aggregate exists in the Prisma schema with fields: `id`, `name`, `createdAt`, `updatedAt`, `channels`.
- `Partner` domain model is not yet defined as a domain class — the repository currently returns raw Prisma types. This story introduces the port/interface pattern properly.
- Commercial managers see only their assigned partners (enforced via US-07).
- The manual-upload form (US-11) uses `?hasActiveManualUploadChannel=true` to populate its partner selector.

## Scope

**In scope**:
- `Partner` domain type (value object or read model) in `server/domain/partners/`
- `IPartnerRepository` port interface in `server/application/partners/`
- `PartnerRepository` Prisma implementation in `server/infrastructure/repositories/`
- `ListPartners` application service in `server/application/partners/`
- `GET /api/partners` route handler
- Query param: `hasActiveManualUploadChannel=true|false`
- Partner scope filtering via US-07

**Out of scope**:
- Partner create/update endpoints
- Channel detail (US-22)
- Mediation configuration

## Response shape

```json
{
  "items": [
    { "id": "...", "name": "..." }
  ]
}
```

(No pagination needed — partner count is small and bounded.)

## Implementation

### Domain (`server/domain/partners/Partner.ts`)
Plain TypeScript type or class: `{ id: string; name: string }`. No Prisma imports.

### Application port (`server/application/partners/IPartnerRepository.ts`)
```ts
interface IPartnerRepository {
  listAll(filter?: { hasActiveManualUploadChannel?: boolean }): Promise<Partner[]>
  listByIds(ids: string[], filter?: { hasActiveManualUploadChannel?: boolean }): Promise<Partner[]>
}
```

### Infrastructure (`server/infrastructure/repositories/PartnerRepository.ts`)
Implements `IPartnerRepository`. Uses `prisma.partner.findMany`. Maps Prisma model to domain `Partner` type. For the `hasActiveManualUploadChannel` filter, join to `IngestionChannel` where `channelType === 'manual_upload' AND isActive === true`.

### Application service (`server/application/partners/ListPartners.ts`)
```ts
export async function listPartners(
  scope: PartnerScope,
  filter: { hasActiveManualUploadChannel?: boolean },
  repo: IPartnerRepository
): Promise<Partner[]>
```

### API route (`server/api/partners/index.get.ts`)
- Call `requireUser(event)`
- Build scope via `getCallerPartnerScope(event)`
- Instantiate `PartnerRepository`, call `listPartners`
- Return `{ items }`

## Files

- `server/domain/partners/Partner.ts` — create
- `server/application/partners/IPartnerRepository.ts` — create
- `server/application/partners/ListPartners.ts` — implement (currently stub)
- `server/infrastructure/repositories/PartnerRepository.ts` — create
- `server/api/partners/index.get.ts` — implement (currently stub)
- `test/integration/api/partner-configuration.test.ts` — extend

## Tests

- Integration: authenticated admin sees all partners; commercial manager sees only assigned partners; `hasActiveManualUploadChannel=true` filters correctly

## Acceptance Criteria

- [ ] `GET /api/partners` returns `{ items: [...] }` for authenticated user
- [ ] Commercial manager only sees partners from their JWT `partnerIds` claim
- [ ] `?hasActiveManualUploadChannel=true` returns only partners with an active manual-upload channel
- [ ] Unauthenticated request returns `401`
- [ ] Domain type `Partner` has no imports from Prisma or infrastructure
