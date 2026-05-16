# Tech Stack

## Reference Sources

- Nuxt 4 installation and setup: https://nuxt.com/docs/4.x/getting-started/installation
- Bun runtime and package manager: https://bun.com/
- Bun test runner: https://bun.com/docs/test
- Tailwind CSS Nuxt integration guide: https://tailwindcss.com/docs/installation/framework-guides/nuxt
- Prisma ORM documentation: https://www.prisma.io/orm
- Prisma seed test data reference: https://www.prisma.io/docs/guides/integrations/permit-io#4-seed-test-data-with-project-boundaries
- Testcontainers PostgreSQL for Node.js: https://testcontainers.com/modules/postgresql/?language=nodejs
- Auth0 Nuxt web app quickstart: https://auth0.com/docs/quickstart/webapp/nuxt
- Auth0 OAuth 2.0 client credentials flow: https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow
- Aspire getting started: https://aspire.dev/get-started/first-app/?aspire-lang=csharp
- Aspire Bun hosting integration: https://aspire.dev/integrations/frameworks/bun-apps/#hosting-integration

## Frontend

- Nuxt 4 web application for the admin interface
- Vue-based UI architecture using Nuxt pages, layouts, and server routes where appropriate
- Tailwind CSS integrated through the Nuxt framework guide for styling
- UI optimized for data-dense operational screens such as dashboards, tables, filters, and detail views

## Backend

- Nuxt server routes for UI access, operational actions, manual upload handling, and audit retrieval
- TypeScript-first full-stack application using Nuxt for both frontend and application backend concerns
- Service boundary between the web application and external ingestion or ETL systems
- Inbound status update API for the processor function or related upstream systems
- Machine-to-machine status reporting from AWS Lambda must authenticate against the web application API using OAuth 2.0 client credentials flow via Auth0

## Software Architecture

- Software architecture design must follow strict Domain-Driven Design
- Domain logic must be isolated from framework, persistence, and transport concerns
- Bounded contexts, aggregates, repositories, application services, and domain services must be modeled explicitly
- UI routes, server handlers, and infrastructure adapters must depend on the domain layer, not the other way around
- External systems such as Auth0, S3, SQS, Lambda, and the billing uploader API must be integrated through infrastructure adapters and anti-corruption boundaries

## Background Processing Context

- Uploaded files are stored in an S3 bucket
- S3 object creation events are emitted to an SQS queue
- An AWS Lambda function consumes SQS messages and performs the ETL operation
- The AWS Lambda function reports ingestion and processing status back to the web application through its API
- Lambda authenticates to the web application API using Auth0 OAuth 2.0 client credentials flow
- The Lambda function calls a third-party billing system uploader API and uploads datasets as CSV files
- Another background job runs every 10 minutes to query the third-party billing system for CSV ingestion progress
- The billing-status polling job reports the ingestion's latest billing-system stage back to the web application through its API
- The third-party billing system later ingests the uploaded CSV files into its own database
- The web application does not own this pipeline, but it must display its status accurately and persist relevant status updates

## Runtime

- Bun as the primary JavaScript and TypeScript runtime
- Bun used for local development, package management, and application execution
- Runtime and tooling choices should stay compatible with Nuxt 4 requirements

## Local Development

- Use Aspire for local development orchestration
- Use the Aspire Bun app hosting integration to run the Nuxt and Bun-based application in local development
- Local development should coordinate application services, infrastructure dependencies, and environment configuration through Aspire where practical
- Provide an option to seed the database with local test data for development and testing workflows

## Testing

- Unit tests should cover domain rules, aggregate behavior, status transitions, and application-service logic in isolation
- Integration tests should cover Prisma repositories, database mappings, API endpoints, audit-field persistence, and machine-to-machine status update flows
- Use Bun's built-in test runner for both unit and integration tests
- Integration tests must use PostgreSQL through Testcontainers for Node.js rather than in-memory substitutes
- External third-party integrations such as the billing system and Auth0 should be mocked or stubbed at the boundary unless a specific end-to-end test requires otherwise

## Data And Storage

- PostgreSQL 18 as the primary relational database
- Prisma ORM for schema management, migrations, and application data access
- Database queries must be implemented through the Prisma library from the application layer
- Do not use database stored procedures or database functions as part of application behavior
- Database storage must use encryption at rest
- Raw uploaded files in S3 should use a 7-year expiry policy
- S3 object storage must use encryption at rest
- Database retention may be shorter than S3 retention and the application design must not assume a recurring cleanup job removes old rows
- Relational database stores operational status, audit trail, partner configuration, channel metadata, and Auth0-linked actor references for user actions
- S3 object storage for uploaded dataset files and stored file references
- Structured logging for processor and application events

## Security And Compliance

- MVP includes authentication using the Auth0 free tier from day one
- Users and roles are managed in Auth0
- Application authorization should rely on Auth0 identities and Auth0-managed role assignments
- Machine-to-machine access for Lambda must use Auth0 client credentials with an API audience and least-privilege scopes
- Machine-to-machine access for the billing-status polling job must also use Auth0 client credentials with an API audience and least-privilege scopes
- Audit logging for all privileged actions
- Encrypt data in transit for browser traffic, machine-to-machine API calls, and external service communication
- Encrypt data at rest for PostgreSQL, S3, and other persistent storage used by the application
- Secret management for application-owned credentials such as database access, storage access, and internal service communication

## Operations

- Background jobs only where needed for application concerns such as status refresh, notifications, or cleanup
- Monitoring and alerting for failed jobs and integration outages
- AWS integration points include S3 event notifications, SQS message flow, and Lambda-driven ETL execution
- Billing-system polling runs on a 10-minute cadence and updates the application with the latest billing-system usage-data file processing status
- UI status refresh uses polling only
- Deployment approach suitable for internal enterprise applications
- Aspire is the preferred local developer orchestration environment and does not define the production deployment architecture

## Candidate Implementation Direction

- Frontend: Nuxt 4
- Styling: Tailwind CSS for Nuxt
- Application runtime: Bun
- Backend: Nuxt server routes with TypeScript
- Architecture: strict DDD with explicit application, domain, and infrastructure layers
- Local development orchestration: Aspire
- Database: PostgreSQL 18
- ORM: Prisma
- Query access: Prisma library only
- Partitioning strategy: no partitioning by default; consider coarse time-based partitioning later only if measured volume justifies it
- Storage: AWS S3
- Background processing: queue-backed workers or scheduled jobs for application-owned tasks only
- Auth: Auth0 free tier from MVP using Auth0-managed users and roles
- Machine-to-machine auth: Auth0 OAuth 2.0 client credentials flow for Lambda-to-API status reporting
- Billing-status polling: scheduled background job every 10 minutes reporting billing ingestion stage through the web application API
- Database migrations: defined in this repository and executed by deployment workflows
- Operator-facing persisted execution detail: operational-level status history, timestamps, execution references, error summaries, and retry counts
- Test runner: Bun test
- Integration testing database: PostgreSQL started through Testcontainers for Node.js

## Implementation Notes For Coding Agent

- Use the official Nuxt 4 installation guide as the source of truth for project bootstrap and framework conventions
- Use the official Bun documentation as the source of truth for runtime and package-management commands
- Use the official Bun test documentation as the source of truth for test runner setup and test execution conventions
- Use the official Tailwind CSS Nuxt framework guide as the source of truth for styling integration
- Use the official Prisma ORM documentation as the source of truth for schema, migration, and client setup
- Implement database reads and writes through Prisma rather than through ad hoc SQL access patterns
- Do not introduce stored procedures or database functions for domain or application behavior
- Use the Prisma seed test data reference as guidance for implementing local database seeding
- Use the Testcontainers PostgreSQL for Node.js documentation as the source of truth for database-backed integration test setup
- Use the Auth0 Nuxt quickstart as the source of truth when authentication is added
- Use the Auth0 client credentials flow documentation as the source of truth for Lambda-to-API authentication
- Use the official Aspire getting started guide as the source of truth for local development setup
- Use the official Aspire Bun hosting integration documentation as the source of truth for hosting the Bun application locally
- Do not build local user and role management as a primary source of truth; use Auth0 identities and role assignments instead
- Keep the domain model framework-agnostic and prevent Prisma models, Auth0 payloads, and HTTP request objects from becoming domain objects
- When framework defaults conflict with generic examples, prefer the official linked framework documentation above
