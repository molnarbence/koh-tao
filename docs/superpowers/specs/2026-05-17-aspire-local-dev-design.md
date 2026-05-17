# Aspire Local Development Orchestration Design

## Goal

Add .NET Aspire as the local development orchestrator for the Koh Tao project. Aspire coordinates PostgreSQL 18, database migrations, and the Nuxt/Bun application from a single `aspire run` command, with an optional seeding step for test data.

## AppHost Structure

A single file-based `apphost.cs` at the repository root. No `.csproj` file, no solution file. File-level `#:sdk` and `#:package` directives pull in the Aspire SDK, the PostgreSQL hosting integration, and the community Bun hosting integration.

Files created or modified:
- `apphost.cs` — AppHost orchestration logic (committed)
- `aspire.config.json` — Aspire project configuration (committed)
- `.modules/` — Aspire CLI-managed SDK files (gitignored)
- `prisma/prisma.config.ts` — updated to resolve the database URL from either format
- `prisma/seed.ts` — seed script
- `package.json` — updated with `prisma:seed` script

## Services Registered

### PostgreSQL 18

Registered as a container resource using the `postgres:18` image tag. A named database `koh-tao-dev` is added. A persistent data volume preserves data between restarts.

### Nuxt/Bun Application

Registered via `AddBunApp` pointing at the repository root with `bun run dev` as the startup script. `WithBunPackageInstallation()` runs `bun install` before the first start. Binds port 3000 to the `PORT` environment variable. Starts only after migrations complete.

### Migration Resource

A one-shot `AddBunApp` resource named `migrate` that runs `bun run prisma:migrate:dev`. Waits for PostgreSQL to be healthy, runs to completion, then exits. The Nuxt app waits for this resource before starting. If no pending migrations exist the command exits immediately.

## Startup Order

```
PostgreSQL healthy → migrate exits → Nuxt/Bun app starts
```

## Environment Variable Injection

`WithReference(postgresDb)` injects the connection string in Npgsql format:

```
ConnectionStrings__koh-tao-dev=Host=localhost;Port=5432;Database=koh-tao-dev;Username=postgres;Password=...
```

Prisma requires a `postgresql://` URL. The conversion happens in `prisma.config.ts`:

```ts
function resolveDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const aspire = process.env['ConnectionStrings__koh-tao-dev']
  if (aspire) return npgsqlToUrl(aspire)

  return ''
}
```

`npgsqlToUrl` parses the semicolon-delimited key-value string and constructs `postgresql://user:pass@host:port/db`. `DATABASE_URL` remains the standard variable for running outside Aspire (CI, staging, production).

## Database Seeding

Seeding is optional and not part of `aspire run` startup. Developers trigger it manually after the database is up:

```bash
bun run prisma:seed
```

Seed data lives in `prisma/seed.ts` — a Bun-executable TypeScript file. It creates a minimal realistic dataset: partners, ingestion channels, mediation blueprints, and sample ingestions. The seed script is idempotent (upserts on stable IDs) so running it multiple times is safe.

## Developer Workflow

Prerequisites: .NET SDK (for the `aspire` CLI), Docker (for PostgreSQL container), Bun.

```bash
# Start all services
aspire run

# Seed test data (optional, run after database is up)
bun run prisma:seed

# Stop all services
Ctrl+C
```

The Aspire dashboard opens automatically in the browser and shows health status, logs, and the resource URLs for each service. No `.env` file is required for local development — Aspire injects all environment variables directly.

A `.env.example` file documents the variables needed when running outside Aspire.

## What Is Not Included

- Production deployment configuration (Aspire is local-only)
- pgAdmin or other database UI containers
- Automatic seeding on startup
- OpenTelemetry or ServiceDefaults (out of scope for this task)

## Reference Sources

- Aspire getting started: https://aspire.dev/get-started/first-app/?aspire-lang=csharp
- Add Aspire to existing app: https://aspire.dev/get-started/add-aspire-existing-app/
- Aspire Bun hosting integration: https://aspire.dev/integrations/frameworks/bun-apps/#hosting-integration
