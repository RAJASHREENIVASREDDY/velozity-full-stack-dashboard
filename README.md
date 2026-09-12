# Velozity — Real-Time Client Project Dashboard

Internal agency dashboard for managing **clients, projects, tasks, live activity, notifications, and presence** with strict **role-based access control (RBAC)** enforced at the API layer.

## 1. Project overview

A small agency needs one internal tool where admins see everything, project managers (PMs) run only their own projects, and developers work only their assigned tasks — with every status change persisted, broadcast live over WebSockets, and notified in real time. This repo implements that end to end: Express + Prisma + PostgreSQL + Socket.io backend, React + Vite + TanStack Query + socket.io-client frontend, node-cron overdue scheduler, JWT access/refresh auth, Docker Compose for Postgres, seed data, tests, and production build configs.

## 2. Features

- JWT auth: short-lived access token (memory) + rotating HttpOnly refresh cookie
- RBAC: ADMIN / PROJECT_MANAGER / DEVELOPER, ownership-checked on every route
- Clients CRUD (admin), archive-on-delete when projects exist
- Projects: PMs create/manage only their own; admin manages all
- Tasks: create/assign/edit (admin + own-project PM), status-only updates (developer on own tasks)
- Filters: `status`, `priority`, `from`, `to`, `projectId`, `q` — validated, DB-level, reflected in URL
- Persistent ActivityLog on every status change (transactional) + creation logs
- Real-time: `activity:new`, `task:updated`, `notification:new`, `notification:unreadCount`, `presence:onlineCount` — no polling
- Project rooms `project:{id}` with auth-checked join; admin global room
- Offline catch-up: `GET /api/activity?limit=20` role-filtered from Postgres, merged without duplicates
- Notifications: on assignment + on IN_REVIEW (to PM owner), bell + badge + mark read/all
- Presence: multi-tab-safe online count, live on admin dashboard
- Overdue job: node-cron pass marks past-due tasks OVERDUE idempotently
- Dashboards: admin (totals, by-status, overdue, online, global feed), PM (projects, by-priority, due-week, feed), dev (assigned sorted by priority→due, feed)
- Seed: 1 admin, 2 PMs, 4 devs, 3 clients, 3 projects, 18 tasks, overdue cases, activities, notifications

## 3. Technology stack

Frontend: React 18, TypeScript, Vite 5, React Router 6, TanStack Query 5, socket.io-client 4, Axios.
Backend: Node 20, Express 4, TypeScript, Prisma 5, PostgreSQL 16, Socket.io 4, Zod 3, node-cron 3, bcryptjs 2, jsonwebtoken 9.
Infra: Docker + Compose (Postgres + optional API profile), `.env` config, Nginx/Vercel-ready client.

## 4. Architecture

```
client (SPA) ──HTTPS/WSS──> server (Express + Socket.io) ──> PostgreSQL
   │ TanStack Query (server state)     │ routes → middleware → controllers → services → Prisma
   │ socket.io-client (live events)    │ sockets/ (auth, rooms, presence)   │ jobs/ (cron)
```

## 5. Folder structure

```
server/src/{config,controllers,middleware,routes,services,schemas,sockets,jobs,utils,app.ts,server.ts}
server/prisma/{schema.prisma,seed.ts}  server/tests/*.test.ts
client/src/{api,components,context,hooks,layouts,pages,routes,utils,types.ts,App.tsx,main.tsx}
docker-compose.yml  README.md
```

## 6. Database schema description

`User` (role, isActive) → `Project.creator`; `Client` → `Project`; `Project` → `Task[]`; `Task.assignedDeveloper` → `User`; `ActivityLog` (project, task?, actor?, prev/new status, message); `Notification` (recipient, type, task?, project?, read); `RefreshToken` (user, jti unique, tokenHash unique, expiresAt, revoked).

## 7. Relationship explanation

- One client has many projects; one project belongs to one client and one creator (PM/admin).
- One project has many tasks; one task belongs to one project and optionally one developer.
- Activity always belongs to a project and usually a task + actor (null = system/overdue job).
- Notifications always belong to a recipient; optionally reference task/project for deep-linking.
- Refresh tokens belong to a user; rotation revokes the old row and inserts the new one.

## 8. Indexing decisions

Indexed because they are filter/join/sort hot paths: `Task(projectId, assignedDeveloperId, status, priority, dueDate)`, `ActivityLog(projectId, taskId, createdAt)`, `Notification(userId, read, createdAt)`, `RefreshToken(userId, expiresAt)`, `Project(clientId, creatorId)`, `User(role)`.

## 9. Authentication architecture

`POST /api/auth/login` verifies bcrypt hash, issues access JWT (default 15m) + refresh JWT (default 7d, carries `jti`), persists refresh row, sets cookie. `GET /api/auth/me` returns the user from the access token. `POST /api/auth/refresh` verifies cookie JWT, checks DB row (exists, unrevoked, unexpired, hash match), rotates. `POST /api/auth/logout` revokes the row and clears the cookie. Axios sends `Authorization: Bearer` + `withCredentials`, and retries once after silent refresh.

## 10. Refresh token storage approach

HttpOnly cookie `velozity_refresh`, `Path=/api/auth`, `SameSite=Lax` (None when `COOKIE_SECURE=true`), `Secure` in production. Never in localStorage; never readable by JS. Server stores only `sha256(jwt)` + `jti`, so a DB leak does not yield usable tokens. Rotation on every refresh; revocation on logout.

## 11. RBAC strategy

Middleware `authenticate` (JWT → DB user → `req.user`) + `requireRole(...)` + service-level ownership checks (`services/authorization.ts`). Developers get 404 (not 403) for foreign tasks/projects to avoid existence leaks; explicit role violations (e.g. dev hitting project-management or admin endpoints) get 403. Frontend guards are UX-only.

| Example | Result |
|---|---|
| Dev reads another dev's task | 404 |
| PM reads another PM's project | 404 |
| Dev hits `POST /projects` / `POST /tasks` / `GET /projects` | 403 |
| Non-admin hits `/api/users` | 403 |
| Dev patches another field besides `status` | 403 |

## 12. WebSocket architecture

Socket.io with `auth.token` (access JWT) verified on handshake; user loaded from DB. Rooms: `user:{id}` (personal), `project:{id}` (joined only after `canAccessProject` check), `role:ADMIN` (global). Server emits `activity:new`, `task:updated`, `notification:new`, `notification:unreadCount`, `presence:onlineCount`. No polling, no SSE.

## 13. How role-filtered activity works

The server decides recipients — never the client. On status change the controller loads the full activity row and calls `emitActivityToAuthorized`, which emits to `project:{id}` + `role:ADMIN` + `user:{assignee}`. Project-room membership itself is authorization-gated, so PMs only ever sit in their own rooms and developers only in rooms where they hold a task. Admins additionally receive everything via the admin room.

## 14. Offline activity catch-up

`GET /api/activity?limit=20` (default 20, max 100) queries Postgres with role filters: admin = latest global; PM = `project.creatorId = me`; developer = `task.assignedDeveloperId = me`. The client merges `["live-activity"]` socket events with this query by `id` and sorts by `createdAt`, so reconnecting users see the last 20 authorized events plus anything live, with no duplicates.

## 15. Presence implementation

`src/sockets/presence.ts` keeps `userId → socketCount`, so N tabs = 1 online user. Connect/disconnect updates the map and broadcasts `{ onlineCount }` to `role:ADMIN` only (no presence leaks to PM/dev). Admin dashboard displays it live via the `presence:onlineCount` listener.

## 16. Notification architecture

DB-backed `Notification` rows created transactionally with the triggering write: `TASK_ASSIGNED` on create/reassign, `TASK_IN_REVIEW` to the project owner when someone else moves their task to review. Controller pushes via `emitNotificationToUser` to `user:{id}` plus a fresh unread count. UI: bell, badge, dropdown, mark-one/all. Endpoints: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /:id/read`, `PATCH /read-all` — all user-scoped (`where: { userId: me }`).

## 17. Background job implementation

`src/jobs/overdue.job.ts` + `startOverdueJob()` (called from `server.ts`). Cron schedule from `OVERDUE_CRON` (default every minute). Each pass selects `dueDate < now AND status NOT IN (DONE, OVERDUE)` (max 500), flips each to `OVERDUE` in a transaction with one `SYSTEM_MARKED_OVERDUE` ActivityLog (`actorId = null`), then emits it. Idempotent: already-OVERDUE/DONE rows are never re-touched, so no duplicate logs.

## 18. Why Socket.io was selected

Required: authenticated rooms, reconnects, multiplexed event types, and a matching client library. Socket.io gives handshake auth, server-checked room joins, per-room broadcast, and automatic reconnection — exactly the role-filtered feed + presence + notification fan-out needed, without hand-rolling a WS protocol.

## 19. Why node-cron was selected

Required: a real in-process scheduler ("not on page load, not frontend timers"). node-cron is tiny, dependency-free, supports standard cron strings via env (`OVERDUE_CRON`), and runs alongside the API in any Node host — no external queue needed at this scale.

## 20. API documentation/endpoint summary

All JSON: `{ success: true, data }` / `{ success: false, error: { code, message, details? } }`.

- `GET /api/health`
- Auth: `POST /api/auth/login|refresh|logout`, `GET /api/auth/me`
- Users (ADMIN): `GET/POST /api/users`, `GET/PATCH /api/users/:id`
- Clients: `GET /api/clients`, `POST/PATCH/DELETE /api/clients/:id` (create/update/delete = admin; PM/dev read per matrix — devs blocked)
- Projects: `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id` (devs blocked from direct reads)
- Tasks: `GET /api/tasks?status&priority&from&to&projectId&q&page&pageSize`, `POST /tasks`, `GET/PATCH/DELETE /tasks/:id`
- Activity: `GET /api/activity?limit&projectId&taskId`
- Notifications: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- Dashboard: `GET /api/dashboard/admin|pm|dev`

## 21. Local setup

```powershell
# 1) Start Postgres
docker compose up -d
# 2) Configure
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
# 3) Install
npm --prefix server install
npm --prefix client install
# 4) DB
npm --prefix server run db:generate
npm --prefix server run db:push
npm --prefix server run db:seed
# 5) Run (two terminals)
npm --prefix server run dev
npm --prefix client run dev
```

App: client `http://localhost:5173`, API `http://localhost:4000`.

## 22. Docker setup

`docker compose up -d` starts Postgres 16 with volume `pgdata` + healthcheck. Optional API container: `docker compose --profile app up --build`. Client ships as static build (Nginx Dockerfile + `vercel.json` rewrite).

## 23. Database migration

```powershell
npm --prefix server run db:generate
npm --prefix server run db:migrate   # dev (creates migration)
# or
npm --prefix server run db:push      # simple sync for local/dev
```

## 24. Seed command

```powershell
npm --prefix server run db:seed
```

Seeded password (configurable via `SEED_PASSWORD`, default `Velozity123!`): `admin@velozity.local`, `pm1@velozity.local`, `pm2@velozity.local`, `dev1–4@velozity.local`. Passwords are bcrypt-hashed; the script is idempotent (upserts).

## 25. Test command

```powershell
npm --prefix server run test
```

Vitest suites (no DB required): auth/tokens, RBAC matrix, Zod validation + filters, presence multi-tab, overdue idempotency, notification scoping.

## 26. Build command

```powershell
npm --prefix server run build
npm --prefix client run build
npm --prefix server run typecheck
npm --prefix client run typecheck
```

## 27. Deployment instructions

- **Frontend (Vercel):** import `client/`, set `VITE_API_URL=https://<api-host>`, build `npm run build`, output `dist`. SPA rewrite in `vercel.json`.
- **Backend (persistent Node host — Render/Fly/Railway/VPS, NOT plain serverless):** Socket.io needs a long-lived process. Deploy `server/` with `npm run build && npm start`, env: `DATABASE_URL` (managed Postgres), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL=https://<vercel-app>`, `COOKIE_SECURE=true`, `NODE_ENV=production`. Run `prisma migrate deploy` on release. CORS allows only `CLIENT_URL`; cookies are `Secure; SameSite=None`.

## 28. Environment variables

Backend (`server/.env.example`): `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN_DAYS`, `PORT`, `CLIENT_URL`, `NODE_ENV`, `COOKIE_SECURE`, `OVERDUE_CRON`, `SEED_PASSWORD`. Frontend (`client/.env.example`): `VITE_API_URL`. Root `.env.example`: Postgres + compose settings.

## 29. Known limitations

- No Docker daemon in this build environment, so live Postgres/seed/CLI verification below used `prisma validate/generate`, typecheck, unit tests, and builds; run `db:push` + `db:seed` where Docker is available.
- Refresh rotation keeps revoked rows (no periodic purge job yet).
- File uploads, email sending, and audit export are out of scope.
- `bcryptjs` (pure-JS) is used instead of native `bcrypt` for Windows/portability; same API and cost factor.

## 30. Hardest problem, real-time feed, and what I'd do differently (218 words)

The hardest problem was enforcing true per-recipient real-time isolation without leaking data or duplicating logic between HTTP and WebSocket layers. Filtering on the client would have been a security hole, and naïve room broadcasts would have shown PMs each other's projects or developers each other's tasks. I solved it by making authorization a server-side property of room membership and emission: the handshake verifies the JWT against the database, `project:join` re-checks `canAccessProject` (admin always; PM only owner; developer only if assigned a task in that project), and `emitActivityToAuthorized` fans out to exactly `project:{id}` plus the admin room plus the assignee's personal room. HTTP catch-up (`GET /api/activity`) applies the same role filters in Prisma, and the client merges socket and DB feeds by ID, so reconnects are lossless and duplicate-free. Presence reused the same socket map with per-user refcounts for multi-tab correctness, emitting counts only to admins. If I did one thing differently, I would introduce a Redis adapter plus a durable outbox table for socket emissions: currently an emit after commit can theoretically be lost on crash, and multi-instance deploys need shared state for rooms and presence. An outbox with at-least-once delivery and Redis pub/sub would make the live feed and presence horizontally scalable without changing the authorization model.
