# Koh Tao

## Local Development (Aspire)

Prerequisites: [.NET SDK](https://dot.net) · [Docker](https://docker.com) · [Bun](https://bun.com)

```bash
aspire run
```

This starts the Aspire dashboard, a PostgreSQL 18 container, Prisma migrations, and the Nuxt dev server. The dashboard opens automatically at `http://localhost:15888`.

Seed the database with sample data (optional, run after first `aspire run`):

```bash
bun run prisma:seed
```

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
