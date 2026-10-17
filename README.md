# Patchwork

Patchwork connects a small team's planned tasks to engineering activity. Milestone 1 establishes GitHub login, isolated workspaces, and persistent tasks. Repository integration, the activity timeline, and explainable health findings follow in later milestones.

## Prerequisites

- Node.js 24.13.0 and npm 11 (use `.nvmrc`)
- Docker Desktop with Docker Compose, or an equivalent local PostgreSQL 17 instance
- A GitHub OAuth App for sign-in only (see below)

## Local setup

1. Copy `.env.example` to `.env`. Choose a local database password and use the same value in `POSTGRES_PASSWORD`, `DATABASE_URL`, and `TEST_DATABASE_URL`. Keep `.env` private.
2. Run `npm install` from the repository root.
3. Run `npm run db:up`. Wait until PostgreSQL is healthy.
4. Create the separate test database once: `docker compose exec db createdb -U patchwork patchwork_test`. If you changed `POSTGRES_USER`, use that value instead.
5. Run `npm run db:migrate`, `npm run db:migrate:test`, and `npm run db:generate`.
6. Run `npm run dev`, then open `http://localhost:3000`.

The test database must be distinct from the development database. The test runner checks this before running database integration tests.
Prisma migrations are committed under `packages/db/prisma/migrations`. For a future schema change, validate the schema first, then run `npm run db:migrate` and give the migration a descriptive name when prompted. The test migration command refuses a database name that matches development or does not end in `_test`.

## GitHub login setup

Create a **GitHub OAuth App** under GitHub Developer settings. For local development, set its homepage URL to `http://localhost:3000` and authorization callback URL to `http://localhost:3000/auth/github/callback`. Put its client ID and client secret in `.env`. Milestone 1 requests only profile access and does not request repository scopes. A separate GitHub App will be used for selected-repository access in a later milestone.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

The API tests use `patchwork_test` and clear only that database's application rows between cases. They refuse to run if the test URL points to the development database. A GitHub OAuth App and its real credentials are required for a live sign-in check; automated tests use a mock GitHub response.

See `docs/architecture.md` and `docs/api-contracts.md` for the current design and endpoint contracts.

Do not commit `.env` or any real credential. `main` is the integration branch; use small feature branches and review changes before committing or merging.
The web app uses Next.js's supported Webpack mode for local development and builds because Turbopack's CSS worker could not bind a local port in the current environment.

<!-- Contribution by Pagavath D P -->
<!-- Contribution by Man Mohit Kumar -->