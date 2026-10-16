# Milestone 1 API contracts

The browser sends credentials to same-origin `/auth/*` and `/api/v1/*` paths. JSON successes use `{ "data": ... }`. JSON failures use `{ "error": { "code": "...", "message": "...", "details": ... } }`.

| Method and path | Request | Response | Access |
| --- | --- | --- | --- |
| `GET /auth/github/start` | None | Redirect to GitHub | Public |
| `GET /auth/github/callback` | GitHub `code` and `state` | Session cookie and redirect to `/workspaces` | Public, valid OAuth transaction required |
| `POST /auth/logout` | None | `{ data: { signedOut: true } }` | Signed in, same origin |
| `GET /api/v1/me` | None | Current user's ID, GitHub login, name, avatar | Signed in |
| `GET /api/v1/workspaces` | None | Array of caller's workspaces with role | Signed in |
| `POST /api/v1/workspaces` | `name`, `slug`, optional IANA `timeZone` | Workspace with owner role, HTTP 201 | Signed in, same origin |
| `GET /api/v1/workspaces/:workspaceId/tasks` | Optional `cursor` | `{ items, nextCursor }`, at most 20 items | Workspace member |
| `POST /api/v1/workspaces/:workspaceId/tasks` | `title`, optional `description`, `status`, `priority`, `dueDate` (`YYYY-MM-DD`), `assigneeId` | Task, HTTP 201 | Owner, admin, or member; same origin |

Task statuses: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Task due dates are stored as PostgreSQL `DATE` and returned as `YYYY-MM-DD`.

An absent, invalid, expired, or revoked session gets HTTP 401. A viewer write gets 403. Nonmembership gets 404, including when a caller guesses a workspace ID. Invalid request bodies get 400. A duplicate workspace slug gets 409. An assignee outside the workspace gets 400. Secrets and internal error details are never returned to the browser.
