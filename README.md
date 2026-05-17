# Koh Tao

## Local Development (Aspire)

Prerequisites: [.NET SDK](https://dot.net) · [Docker](https://docker.com) · [Bun](https://bun.com)

```bash
aspire start
```

Starts the Aspire dashboard, a PostgreSQL 18 container, Prisma schema sync, and the Nuxt dev server. To restart, run `aspire start` again — it stops the previous instance automatically.

Seed the database with sample data (optional, run after first `aspire start`):

```bash
bun run prisma:seed
```

To debug a resource: `aspire describe` → `aspire logs koh-tao` → `aspire otel logs koh-tao`

## Running Without Aspire

Copy `.env.example` to `.env` and fill in the values, then:

```bash
bun install
bun run prisma:generate
bun run prisma:migrate:dev
bun run dev
```

## Test Suites

```bash
bun run test:unit          # domain + smoke tests
bun run test:integration   # Prisma + API tests (requires Docker)
```
