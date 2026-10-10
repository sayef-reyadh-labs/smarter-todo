# Smarter Todo

A task app for students: keep your own to-do list, and share task lists with your team for group projects. Built as a REST API with FastAPI and a React frontend, deployed on Vercel.

> **Status:** MVP in progress. The app has a todo list backed by a local SQLite database; the full task API from the design docs in [`docs/`](docs) is still to come.

## Features

**MVP** (demo before mid-term)
- Create, list, view, update, complete and delete tasks through a REST API (`/api/v1/tasks`)
- Input validation with clear error responses
- Interactive API docs at `/api/docs`

**Beta** (demo before final)
- Sign up, log in, log out (JWT access token + refresh token cookie)
- Personal tasks: each user sees only their own
- Profile page: change your name and password
- Group tasks: create a group, add members, share and assign tasks
- Roles: `user` and `admin`; admin dashboard with stats, ban / unban users
- Security: Argon2 password hashing, login lockout, secure cookies, security headers

## Tech stack

| Part | Choice |
|---|---|
| Backend | Python 3.10+, FastAPI, SQLModel |
| Database | Supabase PostgreSQL (production), SQLite (local) |
| Frontend | React + TypeScript + Vite |
| Hosting | Vercel (frontend and backend in one project) |
| Beta extras | Alembic (migrations), PyJWT, pwdlib (Argon2) |

## Documentation

| Doc | What it covers |
|---|---|
| [PRD — Product Requirements Document](docs/01-prd.md) | Goals, features, user stories, milestones |
| [SRS — Software Requirements Specification](docs/02-srs.md) | Functional and non-functional requirements, permissions, acceptance criteria |
| [TDD — Technical Design Document](docs/03-tdd.md) | Architecture, data model, API endpoints, auth and security design |

## Project structure

```
backend/    FastAPI app (routes under /api)
frontend/   Vite + React + TypeScript
docs/       PRD, SRS, TDD (product requirements, software requirements, technical design)
vercel.json Vercel setup: /api/* goes to backend, everything else to frontend
AGENTS.md   Branch, commit and PR conventions
```

## Requirements

- [Python](https://www.python.org/downloads/) 3.10+
- [Node.js](https://nodejs.org/) 22+

> On macOS/Linux, use `python3` instead of `python`.

## Run locally

You need two terminals: one for the backend and one for the frontend. Todos are saved in a local SQLite file, `backend/smarter_todo.db`, which is created automatically on the first run and is not committed.

### First time (initial setup)

Run this once after cloning the repo.

**Backend** (terminal 1):

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
fastapi dev main.py
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

### Running again (after the initial setup)

The virtual environment and `node_modules` already exist, so skip the install steps.

**Backend** (terminal 1):

```bash
cd backend
.venv\Scripts\Activate.ps1      # macOS/Linux: source .venv/bin/activate
fastapi dev main.py
```

**Frontend** (terminal 2):

```bash
cd frontend
npm run dev
```

Run `pip install -r requirements.txt` or `npm install` again only when someone adds or changes a dependency.

Open http://localhost:5173. Vite forwards `/api` requests to the backend on port 8000. API docs: http://localhost:8000/docs.

To run it the way Vercel does instead, from the project root:

```bash
npm install -g vercel
vercel dev -L
```

> Add new Python packages to `backend/requirements.txt`.

> **Reset the data:** stop the backend and delete `backend/smarter_todo.db`.

## Environment variables

Set them in a local `.env` (never committed) and in Vercel under **Project → Settings → Environment Variables**.

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | MVP | Database to use. Leave unset locally to use the SQLite file `backend/smarter_todo.db`. In production use a hosted database such as the Supabase transaction pooler URL (`postgresql+psycopg://...:6543/postgres`). Vercel cannot keep a SQLite file between requests, so without it the deployed app loses its data. |
| `JWT_SECRET` | Beta | Long random string, e.g. `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ACCESS_TOKEN_MINUTES` | Beta | Default `15` |
| `REFRESH_TOKEN_DAYS` | Beta | Default `7` |

Never commit secrets or `.env` files. See [TDD, section 8](docs/03-tdd.md#8-configuration) for the Supabase setup.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Go to https://vercel.com/new, import the repo and click **Deploy**. Keep **Root Directory** as `./`.

Every push to `main` redeploys automatically. Or deploy from your machine with `vercel --prod`.

## Contributing

Every change starts from a GitHub issue. Branch, commit and pull request rules are in [AGENTS.md](AGENTS.md):

- Branch: `sayef/#{issue_number}-{task_title}`
- Commit: `<type>: <summary> (#issue)`, e.g. `feat: add task CRUD endpoints (#4)`
- One pull request per issue, with `Closes #{issue_number}` in the description

## Troubleshooting

- **"Running scripts is disabled" in PowerShell:** run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **`fastapi` not found:** activate the virtual environment first.
- **`ModuleNotFoundError: sqlmodel`:** run `pip install -r requirements.txt` inside the activated virtual environment.
- **Todos look wrong or the database is corrupted:** stop the backend and delete `backend/smarter_todo.db`; it is recreated on the next start.
- **`Request failed: 500` in the app:** the backend isn't running.
- **App at localhost:8000 shows an old version:** delete `frontend/dist`.
- **Vercel build fails:** check **Build Logs** in the Vercel dashboard, and make sure `npm run build` works in `frontend/`.
