# Technical Design Document (TDD) — Smarter Todo

| Field | Value |
|---|---|
| Product | Smarter Todo |
| Version | MVP + Beta |
| Releases | MVP — Mid-term, Beta — Final |
| Status | Draft |
| Related docs | [Product Requirements Document (PRD)](01-prd.md), [Software Requirements Specification (SRS)](02-srs.md) |

Sections and tables are marked **MVP** or **Beta**. Build the MVP parts for the mid-term; the Beta parts extend them for the final.

**Documents in this set**

| Short form | Full form | Purpose | File |
|---|---|---|---|
| PRD | Product Requirements Document | What we build and why | [01-prd.md](01-prd.md) |
| SRS | Software Requirements Specification | Exact requirements, permissions and acceptance criteria | [02-srs.md](02-srs.md) |
| TDD | Technical Design Document | How we build it: architecture, data model, API (this document) | [03-tdd.md](03-tdd.md) |

## 1. Overview

- **MVP:** a FastAPI REST API for task CRUD, stored in a SQL database through SQLModel, deployed together with the Vite + React frontend as one Vercel project.
- **Beta:** the same app gains users and login (JWT), global roles (`user`/`admin`), groups with per-group roles (`owner`/`member`), and security hardening. Schema changes are managed with Alembic.

## 2. Tech stack

| Layer | Choice | Why | Release |
|---|---|---|---|
| API | FastAPI | Validation, OpenAPI docs and type hints out of the box; already in the repo template | MVP |
| ORM / models | SQLModel | One class works as both the Pydantic schema and the database table; made by the FastAPI author | MVP |
| Database (production) | PostgreSQL on Supabase | Free tier, managed Postgres with a web dashboard (table editor, SQL editor), built-in connection pooler for serverless | MVP |
| DB driver | `psycopg[binary]` (psycopg 3) | Standard Postgres driver for SQLAlchemy/SQLModel | MVP |
| Database (local) | SQLite | No setup needed | MVP |
| Frontend | Vite + React + TypeScript | Already in the repo template | MVP |
| Hosting | Vercel | Frontend and backend in one project (`vercel.json`), auto deploy from GitHub | MVP |
| Migrations | Alembic | Versioned schema changes as the model grows from 1 to 5 tables | Beta |
| JWT | PyJWT | Sign and verify access tokens | Beta |
| Password hashing | `pwdlib[argon2]` | Argon2 hashing, recommended in the FastAPI docs | Beta |

## 3. Architecture

```mermaid
flowchart LR
    Browser[Browser] -->|"/"| FE[React app<br/>Vercel static]
    Browser -->|"/api/*"| BE[FastAPI<br/>Vercel function]
    FE -->|fetch /api/v1/tasks| BE
    BE -->|SQLModel| DB[(PostgreSQL<br/>Supabase)]
```

`vercel.json` already routes `/api/*` to the backend service and everything else to the frontend, so every backend route must start with `/api`. For the same reason the API docs are served at `/api/docs` (not FastAPI's default `/docs`):

```python
app = FastAPI(title="Smarter Todo API", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
```

### 3.1 Request flow — MVP

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Controller (task_controller.py)
    participant S as Schemas (Pydantic)
    participant V as Service (task_service.py)
    participant D as Database (SQLModel Session)
    C->>R: POST /api/v1/tasks {title}
    R->>S: validate TaskCreate
    S-->>R: valid / 422
    R->>V: create_task(data)
    V->>D: session.add(task), commit
    D-->>V: task with id
    V-->>R: task
    R-->>C: 201 TaskRead
```

### 3.2 Login and refresh flow — Beta

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth router
    participant D as Database
    C->>A: POST /api/v1/auth/login {email, password}
    A->>D: find user, check lockout, verify Argon2 hash
    A->>D: store hash of new refresh token
    A-->>C: 200 {access_token} + Set-Cookie refresh_token (HttpOnly)
    Note over C: send Authorization: Bearer access_token on each request
    C->>A: POST /api/v1/auth/refresh (cookie)
    A->>D: look up token hash, revoke it, store new one
    A-->>C: 200 {access_token} + new refresh_token cookie
```

## 4. Project structure

```
backend/
  main.py              # creates the app, includes controllers, health check, serves the frontend build
  app/
    core/
      config.py        # settings from env vars (DATABASE_URL; Beta: JWT secret, token lifetimes)
      database.py      # engine, get_session(), create_db_and_tables()
      security.py      # (Beta) password hashing, JWT create/verify, refresh tokens
      deps.py          # (Beta) get_current_user, require_admin, get_membership, require_group_owner
    models/
      task.py          # Task table
      user.py          # (Beta) AppUser, RefreshToken, groups, members
    schemas/
      task.py          # TaskCreate / TaskUpdate / TaskRead (request and response shapes)
    services/
      task_service.py  # business rules and database queries (no HTTP); raises TaskNotFoundError
    controllers/
      task_controller.py   # /api/v1/tasks: parses the request, calls the service, shapes the response
      auth_controller.py   # (Beta) /api/v1/auth/*
      user_controller.py   # (Beta) /api/v1/users/me
      admin_controller.py  # (Beta) /api/v1/admin/*
      group_controller.py  # (Beta) /api/v1/groups/* (members and group tasks)
  alembic/             # (Beta) migration scripts
  alembic.ini          # (Beta)
  requirements.txt
frontend/
  src/
    App.tsx            # routes, Ant Design theme and dark-mode state
    pages/             # HomePage, TaskDetailsPage, AboutPage (Beta: Login, Signup, Groups, Profile, AdminDashboard)
    components/        # TaskForm, TaskList, TaskStats
    layouts/           # AppLayout (navigation, dark-mode switch)
    services/          # api.ts (every backend call)
    types/             # Task, TaskInput, TaskPatch
    utils/             # form helpers and validation rules
docs/
  01-prd.md
  02-srs.md
  03-tdd.md
```

The backend follows an MVC-style layering: **controller** (validate input, check permissions through dependencies, call the service) → **service** (business rules and database queries through the SQLModel session, knows nothing about HTTP) → **model** (table). Schemas define the request and response shapes. `main.py` maps `TaskNotFoundError` to `404`.

## 5. Data model

### 5.1 `task` table — MVP

| Column | Type | Rules |
|---|---|---|
| `id` | integer | Primary key, auto increment |
| `title` | varchar(200) | Not null |
| `description` | varchar(1000) | Nullable |
| `due_date` | date | Nullable |
| `is_completed` | boolean | Not null, default `false` |
| `created_at` | timestamp (UTC) | Not null, set on insert |
| `updated_at` | timestamp (UTC) | Not null, set on insert and every update |

```mermaid
erDiagram
    TASK {
        int id PK
        string title
        string description
        date due_date
        bool is_completed
        datetime created_at
        datetime updated_at
    }
```

### 5.2 Full data model — Beta

`user` and `group` are reserved words in PostgreSQL, so the tables are named `app_user` and `task_group`.

**`app_user`**

| Column | Type | Rules |
|---|---|---|
| `id` | integer | Primary key |
| `email` | varchar(254) | Unique, stored lowercase |
| `name` | varchar(100) | Not null |
| `password_hash` | varchar | Argon2 hash, never returned by the API |
| `role` | varchar(10) | `user` or `admin`, default `user` |
| `failed_login_count` | integer | Default 0 |
| `locked_until` | timestamp (UTC) | Nullable |
| `is_banned` | boolean | Default `false` |
| `banned_at` | timestamp (UTC) | Nullable |
| `ban_reason` | varchar(500) | Nullable |
| `created_at`, `updated_at` | timestamp (UTC) | Not null |

**`refresh_token`**

| Column | Type | Rules |
|---|---|---|
| `id` | integer | Primary key |
| `user_id` | integer | FK → `app_user.id`, on delete cascade |
| `token_hash` | char(64) | SHA-256 of the token, unique |
| `expires_at` | timestamp (UTC) | Not null (now + 7 days) |
| `revoked_at` | timestamp (UTC) | Nullable |
| `created_at` | timestamp (UTC) | Not null |

**`task_group`**

| Column | Type | Rules |
|---|---|---|
| `id` | integer | Primary key |
| `name` | varchar(100) | Not null |
| `created_by` | integer | FK → `app_user.id` |
| `created_at`, `updated_at` | timestamp (UTC) | Not null |

**`group_member`**

| Column | Type | Rules |
|---|---|---|
| `group_id` | integer | PK part, FK → `task_group.id`, on delete cascade |
| `user_id` | integer | PK part, FK → `app_user.id`, on delete cascade |
| `role` | varchar(10) | `owner` or `member` |
| `joined_at` | timestamp (UTC) | Not null |

**`task` (new columns in Beta)**

| Column | Type | Rules |
|---|---|---|
| `owner_id` | integer | FK → `app_user.id`, not null: the user who created the task |
| `group_id` | integer | FK → `task_group.id`, nullable, on delete cascade. `null` = personal task |
| `assignee_id` | integer | FK → `app_user.id`, nullable. Only for group tasks; must be a group member |

Indexes: `task(owner_id, group_id)`, `task(group_id)`, `group_member(user_id)`, `refresh_token(user_id)`.

```mermaid
erDiagram
    APP_USER ||--o{ TASK : creates
    APP_USER ||--o{ REFRESH_TOKEN : has
    APP_USER ||--o{ GROUP_MEMBER : joins
    TASK_GROUP ||--o{ GROUP_MEMBER : has
    TASK_GROUP ||--o{ TASK : contains
    APP_USER |o--o{ TASK : "assigned to"
    APP_USER {
        int id PK
        string email UK
        string name
        string password_hash
        string role
        int failed_login_count
        datetime locked_until
        bool is_banned
        datetime banned_at
        string ban_reason
    }
    REFRESH_TOKEN {
        int id PK
        int user_id FK
        string token_hash UK
        datetime expires_at
        datetime revoked_at
    }
    TASK_GROUP {
        int id PK
        string name
        int created_by FK
    }
    GROUP_MEMBER {
        int group_id PK
        int user_id PK
        string role
    }
    TASK {
        int id PK
        string title
        string description
        date due_date
        bool is_completed
        int owner_id FK
        int group_id FK
        int assignee_id FK
    }
```

**Who can see a task:**
- Personal task (`group_id` is null): only `owner_id` (and admins).
- Group task (`group_id` set): every member of that group (and admins).

### 5.3 Schemas

| Schema | Used for | Fields | Release |
|---|---|---|---|
| `TaskCreate` | `POST` task body | `title`, `description?`, `due_date?` (+ `assignee_id?` for group tasks) | MVP |
| `TaskUpdate` | `PATCH` task body | all optional: `title`, `description`, `due_date`, `is_completed` (+ `assignee_id` for group tasks) | MVP |
| `TaskRead` | Task responses | all task columns | MVP |
| `SignupRequest` | Sign up | `email`, `name`, `password` | Beta |
| `LoginRequest` | Log in | `email`, `password` | Beta |
| `TokenResponse` | Login / refresh | `access_token`, `token_type: "bearer"`, `expires_in` | Beta |
| `UserRead` | User responses | `id`, `email`, `name`, `role`, `created_at` (never `password_hash`) | Beta |
| `RoleUpdate` | Change role | `role` | Beta |
| `ProfileUpdate` | Change own name | `name` | Beta |
| `PasswordChange` | Change own password | `current_password`, `new_password` | Beta |
| `AdminUserRead` | Admin user list | `UserRead` + `is_banned`, `banned_at`, `ban_reason` | Beta |
| `BanRequest` | Ban a user | `reason?` | Beta |
| `AdminStats` | Dashboard | `users {total, admins, banned, new_last_7_days}`, `tasks {total, completed, created_last_7_days}`, `groups {total}` | Beta |
| `GroupCreate` / `GroupUpdate` | Create / rename group | `name` | Beta |
| `GroupRead` | Group responses | `id`, `name`, `created_by`, `my_role`, `created_at` | Beta |
| `MemberAdd` | Add member | `email` | Beta |
| `MemberRead` | Member list | `user_id`, `name`, `email`, `role`, `joined_at` | Beta |

MVP sketch:

```python
class TaskBase(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None

class Task(TaskBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    is_completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskCreate(TaskBase): ...

class TaskUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None
    is_completed: bool | None = None

class TaskRead(TaskBase):
    id: int
    is_completed: bool
    created_at: datetime
    updated_at: datetime
```

`title` is trimmed before validation so `"   "` is rejected.

## 6. REST API design

Base path: `/api/v1`. All bodies are JSON.

### 6.1 Endpoints — MVP

In the MVP no login is needed. In the Beta the same task endpoints require a token and only work on the caller's personal tasks.

| Method | Path | Body | Success | Errors | FR |
|---|---|---|---|---|---|
| `POST` | `/api/v1/tasks` | `TaskCreate` | `201` `TaskRead` | `422` | FR-01, FR-07 |
| `GET` | `/api/v1/tasks?offset=0&limit=20` | — | `200` `TaskRead[]` | `422` | FR-02, FR-03 |
| `GET` | `/api/v1/tasks/{id}` | — | `200` `TaskRead` | `404` | FR-04 |
| `PATCH` | `/api/v1/tasks/{id}` | `TaskUpdate` | `200` `TaskRead` | `404`, `422` | FR-05, FR-07 |
| `DELETE` | `/api/v1/tasks/{id}` | — | `204` | `404` | FR-06 |
| `GET` | `/api/health` | — | `200` `{"status":"ok"}` | — | FR-10 |

### 6.2 Endpoints — Beta

"Who" uses the roles from the [SRS permission matrix (section 3.9)](02-srs.md#39-permission-matrix--beta). Every endpoint except auth, health and docs needs `Authorization: Bearer <access_token>` (`401` without it).

**Auth and profile**

| Method | Path | Who | Body | Success | Errors | FR |
|---|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/signup` | Guest | `SignupRequest` | `201` `UserRead` | `409`, `422` | FR-12 |
| `POST` | `/api/v1/auth/login` | Guest | `LoginRequest` | `200` `TokenResponse` + cookie | `401`, `429` | FR-13, FR-34 |
| `POST` | `/api/v1/auth/refresh` | Refresh cookie | — | `200` `TokenResponse` + new cookie | `401` | FR-14 |
| `POST` | `/api/v1/auth/logout` | Refresh cookie | — | `204`, cookie cleared | — | FR-15 |
| `GET` | `/api/v1/users/me` | User | — | `200` `UserRead` | `401` | FR-16 |
| `PATCH` | `/api/v1/users/me` | User | `ProfileUpdate` | `200` `UserRead` | `422` | FR-40 |
| `POST` | `/api/v1/users/me/password` | User | `PasswordChange` | `204` (all sessions logged out) | `400` (wrong current password), `422` | FR-41 |

**Personal tasks** — same five endpoints as the MVP, now scoped to the caller (`owner_id = me`, `group_id is null`). Other users' tasks return `404` (FR-17 – FR-19).

**Admin**

| Method | Path | Who | Body | Success | Errors | FR |
|---|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/users?offset&limit` | Admin | — | `200` `UserRead[]` | `403` | FR-21 |
| `PATCH` | `/api/v1/admin/users/{user_id}/role` | Admin | `RoleUpdate` | `200` `UserRead` | `400` (own role), `403`, `404` | FR-22 |
| `GET` | `/api/v1/admin/tasks?offset&limit` | Admin | — | `200` `TaskRead[]` | `403` | FR-23 |
| `DELETE` | `/api/v1/admin/tasks/{task_id}` | Admin | — | `204` | `403`, `404` | FR-23 |
| `GET` | `/api/v1/admin/stats` | Admin | — | `200` `AdminStats` | `403` | FR-35 |
| `POST` | `/api/v1/admin/users/{user_id}/ban` | Admin | `BanRequest` | `200` `AdminUserRead` | `400` (self / other admin), `403`, `404` | FR-36 |
| `POST` | `/api/v1/admin/users/{user_id}/unban` | Admin | — | `200` `AdminUserRead` | `403`, `404` | FR-38 |

`GET /api/v1/admin/users` returns `AdminUserRead[]` so the dashboard can show who is banned (FR-39).

**Groups**

| Method | Path | Who | Body | Success | Errors | FR |
|---|---|---|---|---|---|---|
| `POST` | `/api/v1/groups` | User | `GroupCreate` | `201` `GroupRead` | `422` | FR-25 |
| `GET` | `/api/v1/groups` | User | — | `200` `GroupRead[]` (my groups) | — | FR-26 |
| `GET` | `/api/v1/groups/{group_id}` | Member | — | `200` `GroupRead` | `404` | FR-33 |
| `PATCH` | `/api/v1/groups/{group_id}` | Owner | `GroupUpdate` | `200` `GroupRead` | `403`, `404` | FR-27 |
| `DELETE` | `/api/v1/groups/{group_id}` | Owner | — | `204` | `403`, `404` | FR-27 |
| `GET` | `/api/v1/groups/{group_id}/members` | Member | — | `200` `MemberRead[]` | `404` | FR-28 |
| `POST` | `/api/v1/groups/{group_id}/members` | Owner | `MemberAdd` | `201` `MemberRead` | `403`, `404`, `409` | FR-28 |
| `DELETE` | `/api/v1/groups/{group_id}/members/{user_id}` | Owner, or the member themself | — | `204` | `400` (owner leaving), `403`, `404` | FR-29 |
| `GET` | `/api/v1/groups/{group_id}/tasks?offset&limit` | Member | — | `200` `TaskRead[]` | `404` | FR-30 |
| `POST` | `/api/v1/groups/{group_id}/tasks` | Member | `TaskCreate` | `201` `TaskRead` | `404`, `422` | FR-30, FR-31 |
| `GET` | `/api/v1/groups/{group_id}/tasks/{task_id}` | Member | — | `200` `TaskRead` | `404` | FR-30 |
| `PATCH` | `/api/v1/groups/{group_id}/tasks/{task_id}` | Member | `TaskUpdate` | `200` `TaskRead` | `404`, `422` | FR-30, FR-31 |
| `DELETE` | `/api/v1/groups/{group_id}/tasks/{task_id}` | Task creator or owner | — | `204` | `403`, `404` | FR-32 |

### 6.3 Examples

Create:

```http
POST /api/v1/tasks
Content-Type: application/json

{ "title": "Read chapter 3", "due_date": "2026-10-20" }
```

```http
201 Created

{
  "id": 1,
  "title": "Read chapter 3",
  "description": null,
  "due_date": "2026-10-20",
  "is_completed": false,
  "created_at": "2026-10-08T10:00:00Z",
  "updated_at": "2026-10-08T10:00:00Z"
}
```

Mark complete:

```http
PATCH /api/v1/tasks/1
Content-Type: application/json

{ "is_completed": true }
```

Log in (Beta):

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "a@x.com", "password": "correct horse battery" }
```

```http
200 OK
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800

{ "access_token": "eyJhbGciOi...", "token_type": "bearer", "expires_in": 900 }
```

### 6.4 Error format

Use FastAPI's default format so there is no custom code to maintain:

```json
{ "detail": "Task not found" }
```

Validation errors (`422`) use FastAPI's built-in list format, which names the failing field:

```json
{ "detail": [ { "loc": ["body", "title"], "msg": "String should have at least 1 character", "type": "string_too_short" } ] }
```

A catch-all exception handler returns `500` with `{"detail": "Internal server error"}` and logs the real error (NFR-07).

### 6.5 Design rules
- Plural nouns for resources (`/tasks`, `/groups`, `/members`), no verbs in paths (except the `auth` actions).
- Nested paths show ownership: a group's tasks live under `/groups/{group_id}/tasks`.
- `PATCH` for partial update; only fields sent are changed (`model_dump(exclude_unset=True)`).
- Lists are ordered by `created_at` descending and take `offset` / `limit`.
- `404` (not `403`) when the caller is not allowed to know a resource exists; `403` when they can see it but not do the action.
- `/api/v1` prefix so a future `v2` of the API can live next to it.

## 7. Database access

- `core/database.py` creates one engine from `settings.database_url` (the `DATABASE_URL` env var, defaulting to `backend/smarter_todo.db` locally).
- `get_session()` is a FastAPI dependency that yields a `Session` per request.
- MVP: tables are created on startup with `SQLModel.metadata.create_all(engine)`.
- Beta: `create_all` is removed and the schema is managed by Alembic (section 12).
- On Vercel, connect through Supabase's **transaction pooler** (Supavisor, port `6543`), because each serverless function opens its own connections.
- The transaction pooler does not support prepared statements, so the engine is created with `poolclass=NullPool` (the pooler does the pooling) and `connect_args={"prepare_threshold": None}` for psycopg.
- URL format: `postgresql+psycopg://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`.
- Only the Postgres database is used. Supabase Auth, Storage and the auto-generated REST API are not used; login is our own (section 10) and all access goes through our FastAPI backend.
- Row Level Security (RLS) is not used because the browser never talks to Supabase directly; permissions are enforced in FastAPI. Keep the Supabase `anon` and `service_role` keys out of the frontend.

## 8. Configuration

| Variable | Local | Vercel | Release |
|---|---|---|---|
| `DATABASE_URL` | not set (SQLite default) | Supabase transaction pooler URL (port `6543`) | MVP |
| `POSTGRES_URL` | not set | Set by the Supabase integration on Vercel; used when `DATABASE_URL` is not set | MVP |
| `JWT_SECRET` | any long random string in `.env` | Random 32+ byte secret (`python -c "import secrets; print(secrets.token_urlsafe(48))"`) | Beta |
| `ACCESS_TOKEN_MINUTES` | `15` | `15` | Beta |
| `REFRESH_TOKEN_DAYS` | `7` | `7` | Beta |
| `MIGRATION_DATABASE_URL` | not needed | Not on Vercel. Used only on a developer machine to run Alembic against Supabase (session pooler, port `5432`) | Beta |

No secrets are committed. `.env` stays in `.gitignore`.

Supabase setup (one time):
1. Create a project at supabase.com and save the database password.
2. **Connect** -> **Transaction pooler** -> copy the URI, and change the scheme to `postgresql+psycopg://`.
3. In Vercel -> Project -> **Settings** -> **Environment Variables**, add it as `DATABASE_URL`.
4. Add `psycopg[binary]` to `backend/requirements.txt`.

Free-tier Supabase projects pause after a week with no activity; open the dashboard and restore the project before a demo if needed.

## 9. Deployment

```mermaid
flowchart LR
    Dev[git push] --> GH[GitHub]
    GH -->|Vercel Git integration| Prod[Vercel production URL]
    Prod --> DB[(Supabase)]
```

- The repo is connected to Vercel through the Vercel GitHub integration (already set up by the template); a push to `main` deploys to production.
- Environment variables from section 8 are set in the Vercel project settings.
- (Beta) Before merging a change that includes a new migration, run `alembic upgrade head` against Supabase (section 12), then merge so Vercel deploys the matching code.

## 10. Auth and RBAC design — Beta

### 10.1 Tokens

| Token | Format | Lifetime | Where it lives |
|---|---|---|---|
| Access token | JWT, HS256, claims `sub` (user id), `role`, `iat`, `exp` | 15 min | Frontend memory; sent as `Authorization: Bearer` |
| Refresh token | Random 32 bytes (`secrets.token_urlsafe`) | 7 days | `refresh_token` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth`); DB keeps only its SHA-256 hash |

- **Refresh rotation:** each refresh revokes the old token and issues a new one. If a revoked token is used again, all of that user's refresh tokens are revoked (it was probably stolen).
- **Logout:** revokes the current refresh token and clears the cookie. The access token simply expires within 15 minutes.
- The `role` claim is only informational; permission checks always use the role loaded from the database, so a role change applies on the next request.

### 10.2 Passwords and login lockout

- Hash with `pwdlib` (Argon2). Verify on login; never log or return the hash.
- Unknown email and wrong password both return `401 "Invalid email or password"`, so emails cannot be discovered.
- Wrong password: `failed_login_count += 1`. At 5, set `locked_until = now + 15 min` and reset the count. While `locked_until > now`, login returns `429`. A successful login resets the count.
- Stored in the database (not in memory) because serverless functions do not share memory.

### 10.3 Permission dependencies

Permissions are FastAPI dependencies, so each route declares what it needs:

```python
bearer = HTTPBearer()

def get_current_user(creds=Depends(bearer), session: Session = Depends(get_session)) -> AppUser:
    payload = decode_access_token(creds.credentials)   # 401 if invalid or expired
    user = session.get(AppUser, int(payload["sub"]))
    if user is None:
        raise HTTPException(401, "Invalid token")
    if user.is_banned:
        raise HTTPException(403, "Account banned")   # checked on every request, not only at login
    return user

def require_admin(user: AppUser = Depends(get_current_user)) -> AppUser:
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    return user

def get_membership(group_id: int, user=Depends(get_current_user), session=Depends(get_session)) -> GroupMember:
    member = session.get(GroupMember, (group_id, user.id))
    if member is None:
        raise HTTPException(404, "Group not found")   # hide groups the user is not in
    return member

def require_group_owner(member: GroupMember = Depends(get_membership)) -> GroupMember:
    if member.role != "owner":
        raise HTTPException(403, "Group owner only")
    return member
```

| Route group | Dependency |
|---|---|
| `/api/v1/tasks/*`, `/api/v1/users/me/*`, `POST/GET /api/v1/groups` | `get_current_user` |
| `/api/v1/admin/*` | `require_admin` |
| `GET /groups/{id}`, `/groups/{id}/members` (GET), `/groups/{id}/tasks/*` | `get_membership` |
| `PATCH/DELETE /groups/{id}`, `POST /groups/{id}/members` | `require_group_owner` |

Row-level rules that depend on the data are checked inside the route:
- Personal tasks: query with `owner_id == user.id AND group_id IS NULL`; not found → `404`.
- Delete group task: allowed if `task.owner_id == user.id` or membership role is `owner`.
- Remove member: allowed if caller is owner, or `user_id == caller` (leave); owner leaving → `400`.
- Assignee: must exist in `group_member` for that group, otherwise `422`. Removing a member sets their assigned tasks in that group to `assignee_id = null`.
- Change role: `user_id == caller` → `400`.
- Ban: target is the caller or an admin → `400`. Otherwise set `is_banned = true`, `banned_at = now`, `ban_reason`, and revoke all the user's refresh tokens in the same transaction. Unban clears the three fields.
- Login and refresh also reject banned users with `403`.
- Change password: verify `current_password` (`400` if wrong), hash `new_password`, revoke all the user's refresh tokens; the client then logs in again.

### 10.4 Admin dashboard stats

One endpoint, plain `COUNT` queries (no extra tables):

```python
week_ago = datetime.now(timezone.utc) - timedelta(days=7)
stats = AdminStats(
    users={
        "total": count(AppUser),
        "admins": count(AppUser, AppUser.role == "admin"),
        "banned": count(AppUser, AppUser.is_banned),
        "new_last_7_days": count(AppUser, AppUser.created_at >= week_ago),
    },
    tasks={
        "total": count(Task),
        "completed": count(Task, Task.is_completed),
        "created_last_7_days": count(Task, Task.created_at >= week_ago),
    },
    groups={"total": count(TaskGroup)},
)
```

`count(model, *filters)` is a small helper around `select(func.count()).select_from(model).where(*filters)`.

## 11. Security — Beta

| Area | Design |
|---|---|
| Passwords | Argon2 via `pwdlib`, minimum 8 characters |
| Tokens | Section 10.1; `JWT_SECRET` only in env vars |
| Cookies | `HttpOnly`, `Secure`, `SameSite=Strict`, path-limited |
| CORS | Not enabled: frontend and API share the Vercel origin; locally Vite proxies `/api` |
| Security headers | Added for all routes in `vercel.json` (below) |
| Brute force | Login lockout (section 10.2) |
| Injection | SQLModel/SQLAlchemy parameterised queries only |
| Errors | Catch-all handler returns a generic `500`; details only in logs |
| Data exposure | Response schemas (`UserRead`, `TaskRead`) list fields explicitly; `password_hash` and token hashes are never in a response schema |

```json
"headers": [
  {
    "source": "/(.*)",
    "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" }
    ]
  }
]
```

## 12. Migrations — Beta

- Add Alembic in `backend/alembic/`, with `target_metadata = SQLModel.metadata`.
- Revision `0001_mvp`: the MVP `task` table. On the existing Supabase database (created by `create_all`), run `alembic stamp 0001_mvp` once instead of upgrading.
- Revision `0002_beta`: create `app_user` (including lockout and ban columns), `refresh_token`, `task_group`, `group_member`; delete existing MVP demo tasks (they have no owner); add `owner_id` (not null), `group_id`, `assignee_id` and indexes to `task`.
- Run migrations from a developer machine: `MIGRATION_DATABASE_URL=... alembic upgrade head` (Supabase session pooler, port `5432`), then merge the code.
- After `0002_beta`, remove `create_all` from startup.
- Promote the first admin in the Supabase table editor: set `role = 'admin'` on your `app_user` row.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Serverless cold starts make the first request slow | Acceptable; measure NFR-01 excluding cold start |
| Too many DB connections from serverless functions | Use Supabase transaction pooler (port `6543`) with `NullPool` |
| Free-tier project pauses when idle | Check the Supabase dashboard before demos; any API activity keeps it awake |
| Code deployed before its migration ran (or the reverse) | Always run `alembic upgrade head` before merging a migration; keep migrations additive where possible |
| JWT secret leaked | Only in Vercel env vars; rotating it logs everyone out (acceptable) |
| Permission bug exposes another user's data | All permission checks go through the dependencies in section 10.3; review every new route against the [SRS permission matrix](02-srs.md#39-permission-matrix--beta) |
| No automated tests or CI yet | Review each PR manually against the [SRS acceptance criteria](02-srs.md#5-acceptance-criteria); tests and CI are planned after this semester's scope |
