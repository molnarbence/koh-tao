# US-18 — As an operator, I want to browse available mediation blueprints and their parameter schemas, so that I can select the appropriate blueprint when configuring a partner's mediation settings

**Deliverable**: D3 — Configuration management
**Epic**: Mediation Blueprints
**Type**: User Story
**Dependencies**: US-02
**Layers**: application, infrastructure, api

## Goal

Implement `GET /api/mediation-blueprints` and `GET /api/mediation-blueprints/:id` so administrators can read available mediation blueprints and their parameter schemas.

## Context

- `MediationBlueprint` Prisma model: `id`, `name`, `functionIdentifier`, `parameterSchema` (Json), `createdAt`, `updatedAt`.
- Blueprints are administrator-owned definitions of supported mediation functions.
- Commercial managers need to read blueprints to populate the configuration forms (US-25), but cannot create or modify them.
- `ListMediationBlueprints` application service stub exists at `server/application/mediation/ListMediationBlueprints.ts`.
- Route stub exists at `server/api/mediation-blueprints/index.get.ts`.

## Scope

**In scope**:
- `MediationBlueprint` domain type in `server/domain/mediation/`
- `IMediationBlueprintRepository` port
- `MediationBlueprintRepository` Prisma implementation
- `ListMediationBlueprints` application service (replace stub)
- `GET /api/mediation-blueprints` — accessible to administrators and commercial managers (read-only for both)
- `GET /api/mediation-blueprints/:id` — same access

**Out of scope**:
- Create/update blueprints (US-19)
- Parameter schema validation

## Response shapes

```json
// GET /api/mediation-blueprints
{
  "items": [
    {
      "id": "...",
      "name": "...",
      "functionIdentifier": "...",
      "parameterSchema": { ... }
    }
  ]
}

// GET /api/mediation-blueprints/:id
{
  "id": "...",
  "name": "...",
  "functionIdentifier": "...",
  "parameterSchema": { ... }
}
```

## Implementation

### Domain (`server/domain/mediation/MediationBlueprint.ts`)
```ts
type MediationBlueprint = {
  id: string
  name: string
  functionIdentifier: string
  parameterSchema: Record<string, unknown>
}
```

### Application port (`server/application/mediation/IMediationBlueprintRepository.ts`)
```ts
interface IMediationBlueprintRepository {
  listAll(): Promise<MediationBlueprint[]>
  findById(id: string): Promise<MediationBlueprint | null>
}
```

### Infrastructure (`server/infrastructure/repositories/MediationBlueprintRepository.ts`)
Implements port. Maps Prisma model to domain type (cast `parameterSchema` Json field to `Record<string, unknown>`).

### Application service (`server/application/mediation/ListMediationBlueprints.ts`)
```ts
export async function listMediationBlueprints(
  repo: IMediationBlueprintRepository
): Promise<MediationBlueprint[]>
```

### API routes

`server/api/mediation-blueprints/index.get.ts`:
- `requireUser(event)` — both roles allowed
- Instantiate repo, call service

`server/api/mediation-blueprints/[blueprintId].get.ts`:
- Same auth
- Return 404 if not found

## Files

- `server/domain/mediation/MediationBlueprint.ts` — create
- `server/application/mediation/IMediationBlueprintRepository.ts` — create
- `server/application/mediation/ListMediationBlueprints.ts` — implement (currently stub)
- `server/infrastructure/repositories/MediationBlueprintRepository.ts` — create
- `server/api/mediation-blueprints/index.get.ts` — implement (currently stub)
- `server/api/mediation-blueprints/[blueprintId].get.ts` — create
- `test/integration/api/mediation-blueprints.test.ts` — create

## Tests

- Integration: returns blueprints for authenticated user (admin and commercial manager); returns 404 for unknown id; unauthenticated returns 401

## Acceptance Criteria

- [ ] `GET /api/mediation-blueprints` returns `{ items: [...] }` for any authenticated user
- [ ] `GET /api/mediation-blueprints/:id` returns blueprint or `404`
- [ ] `parameterSchema` is included in response
- [ ] Unauthenticated request returns `401`
