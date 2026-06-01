# US-22 — As an operator, I want to see all configured ingestion channels for a partner, so that I can understand the available ingestion paths and their current activation state

**Deliverable**: D3 — Configuration management
**Epic**: Channel Management
**Type**: User Story
**Dependencies**: US-03
**Layers**: domain, application, infrastructure, api

## Goal

Implement `GET /api/partners/:partnerId/channels` to return the configured ingestion channels and application-visible metadata for a partner.

## Context

- `IngestionChannel` Prisma model: `id`, `partnerId`, `channelType`, `isActive`, `partner`.
- Channel types: `manual_upload`, `sftp`, `api`.
- A partner can have at most one `manual_upload` channel.
- Partner scope must be enforced (US-07): commercial managers can only access channels for their assigned partners.
- `ListPartnerChannels` application service stub exists at `server/application/partners/ListPartnerChannels.ts`.

## Scope

**In scope**:
- `IngestionChannel` domain type in `server/domain/partners/`
- `IIngestionChannelRepository` port in `server/application/partners/`
- `IngestionChannelRepository` Prisma implementation
- `ListPartnerChannels` application service (replace stub)
- `GET /api/partners/:partnerId/channels` route handler

**Out of scope**:
- Channel create/update (later phase)
- Activation state update (US-23)
- Mediation configuration per channel (US-21)

## Response shape

```json
{
  "items": [
    {
      "id": "...",
      "channelType": "manual_upload",
      "isActive": true
    }
  ]
}
```

## Implementation

### Domain (`server/domain/partners/IngestionChannel.ts`)
```ts
type IngestionChannel = {
  id: string
  partnerId: string
  channelType: 'manual_upload' | 'sftp' | 'api'
  isActive: boolean
}
```
No Prisma imports.

### Application port (`server/application/partners/IIngestionChannelRepository.ts`)
```ts
interface IIngestionChannelRepository {
  listByPartnerId(partnerId: string): Promise<IngestionChannel[]>
  findById(id: string): Promise<IngestionChannel | null>
}
```

### Infrastructure (`server/infrastructure/repositories/IngestionChannelRepository.ts`)
Implements the port. Maps Prisma `IngestionChannel` model to domain type.

### Application service (`server/application/partners/ListPartnerChannels.ts`)
```ts
export async function listPartnerChannels(
  partnerId: string,
  repo: IIngestionChannelRepository
): Promise<IngestionChannel[]>
```

### API route (`server/api/partners/[partnerId]/channels.get.ts`)
- `requireUser(event)`
- `assertPartnerAccess(event, partnerId)`
- Instantiate repo, call service
- Return `{ items }`

## Files

- `server/domain/partners/IngestionChannel.ts` — create
- `server/application/partners/IIngestionChannelRepository.ts` — create
- `server/application/partners/ListPartnerChannels.ts` — implement (currently stub)
- `server/infrastructure/repositories/IngestionChannelRepository.ts` — create
- `server/api/partners/[partnerId]/channels.get.ts` — implement (currently stub)
- `test/integration/api/partner-configuration.test.ts` — extend

## Tests

- Integration: returns channels for valid partner; commercial manager cannot access channels for unassigned partner (403); correct `channelType` and `isActive` values

## Acceptance Criteria

- [ ] `GET /api/partners/:partnerId/channels` returns `{ items: [...] }`
- [ ] Each item has `id`, `channelType`, `isActive`
- [ ] Commercial manager accessing unassigned partner returns `403`
- [ ] Unauthenticated request returns `401`
- [ ] `IngestionChannel` domain type has no Prisma imports
