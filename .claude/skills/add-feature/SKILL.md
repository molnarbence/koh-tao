---
name: add-feature
description: Scaffold a complete vertical slice following DDD layer rules for this codebase
---

## Layer Checklist

**1. Domain** (`server/domain/<context>/`)
- Pure TypeScript class or value object
- Imports only from within `server/domain/` — never from infrastructure, application, or Nuxt
- Business rules and invariants live here (see `Ingestion.ts` for the pattern)

**2. Port / Interface** (`server/application/<context>/`)
- Define a TypeScript interface for any external dependency the application service needs
- Example: `IIngestionStorage { putObject(...): Promise<...> }` instead of importing `S3Storage`
- This is what the application service depends on — never the concrete class

**3. Application Service** (`server/application/<context>/`)
- Receives its dependencies as function parameters (or constructor args), typed to the interface
- NEVER imports from `server/infrastructure/` — only from `server/domain/` and its own interfaces
- Example pattern:
  ```ts
  export async function createManualUpload(
    input: { ingestionId: string; filename: string; file: ArrayBuffer },
    storage: IIngestionStorage   // ← interface, not S3Storage
  ) { ... }
  ```

**4. Infrastructure** (`server/infrastructure/`)
- Implements the port interface
- Imports Prisma client, AWS SDK, etc. here only
- Maps Prisma models to domain entities — never return raw Prisma types upward

**5. API Route** (`server/api/`)
- Instantiates the concrete infrastructure class
- Passes it into the application service call
- Validates inputs with Zod before calling the application service
- Example:
  ```ts
  const storage = new S3Storage()
  return createManualUpload({ ingestionId, filename, file }, storage)
  ```

## Red Flags to Catch
- `import ... from '../../infrastructure/...'` inside `server/application/` → violation
- `import ... from '@prisma/client'` inside `server/domain/` → violation
- Application service calling `new SomeConcrete()` inside itself → violation
