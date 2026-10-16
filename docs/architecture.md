# Milestone 1 architecture

Patchwork is an npm-workspace modular monolith. `apps/web` renders the UI, `apps/api` owns authentication and all database-facing endpoints, `packages/contracts` shares request validation, and `packages/db` owns the Prisma schema, migrations, and PostgreSQL client factory.

```text
Browser (localhost:3000)
  ├─ Next.js pages
  └─ /auth/* and /api/* → Next.js rewrite → Express (localhost:4000)
                                      ├─ GitHub OAuth App: identity only
                                      └─ Prisma 7 adapter-pg → PostgreSQL
```

The browser uses a single origin. Express stores a SHA-256 hash of each random opaque session token in PostgreSQL and sends the raw token only as a host-only, HttpOnly, SameSite=Lax cookie. Cookies are Secure under HTTPS. POST routes verify the request origin. GitHub OAuth uses a random state value, PKCE S256, and short-lived HttpOnly transaction cookies. The GitHub access token is used to retrieve the user's profile and is not persisted.

Workspace reads and writes are scoped by `WorkspaceMember` in the API service layer. A new workspace and its owner membership are created in one transaction. Task creation checks the actor's role and confirms any assignee is a member of the same workspace. All requests are validated against shared Zod contracts.

The first migration contains only `User`, `Session`, `Workspace`, `WorkspaceMember`, and `Task`. Tasks remain native to Patchwork. Repository connection, task links, activity, health findings, background sync, and notifications are later milestones.

Prisma 7 loads the database URL through `packages/db/prisma.config.ts`, generates a client into an ignored directory, and uses `@prisma/adapter-pg` at runtime. Development and test use separate PostgreSQL databases. The API test runner checks both URLs and the databases they actually reach before running tests that write data.
