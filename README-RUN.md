# Run Smarter Todo Locally

This project has two parts:

- `backend/`: FastAPI API with a local SQLite database
- `frontend/`: React and Vite web app

Run each part in a separate PowerShell terminal.

## Prerequisites

- Python 3.10 or newer
- Node.js 22 or newer

## First-time setup

### Backend

From the repository root:

```powershell
Set-Location backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m fastapi dev main.py
```

The API runs at:

- App health check: http://localhost:8000/api/health
- API documentation: http://localhost:8000/docs

If PowerShell prevents activation, run the dependency installation and server commands with the Python executable from the virtual environment:

```powershell
Set-Location backend
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m fastapi dev main.py
```

### Frontend

Open a second PowerShell terminal at the repository root:

```powershell
Set-Location frontend
npm.cmd install
npm.cmd run dev
```

The web app runs at http://localhost:5173.

On Windows systems where `npm` is blocked because it resolves to `npm.ps1`, use `npm.cmd` as shown above. This does not require changing the PowerShell execution policy.

## Subsequent runs

Backend terminal:

```powershell
Set-Location backend
.venv\Scripts\Activate.ps1
python -m fastapi dev main.py
```

Frontend terminal:

```powershell
Set-Location frontend
npm.cmd run dev
```

Open http://localhost:5173 in a browser. Vite forwards `/api` requests to the backend on port 8000.

## Local data

The backend creates `backend/smarter_todo.db` automatically. To reset all local tasks, stop the backend and delete that file, then start the backend again.

## Troubleshooting

- `ModuleNotFoundError`: activate `.venv` and run `python -m pip install -r requirements.txt`.
- `npm.ps1 cannot be loaded`: use `npm.cmd` instead of `npm`.
- Frontend requests fail: confirm the backend is running on port 8000.
- Port already in use: stop the existing process or start the affected development server on another port.
