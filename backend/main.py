import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import BACKEND_DIR
from app.database import create_db_and_tables
from app.tasks.router import router as tasks_router

logger = logging.getLogger("smarter_todo")

app = FastAPI(
    title="Smarter Todo API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

app.include_router(tasks_router)

# Run at import (not in a lifespan hook) so it also works on serverless hosts.
create_db_and_tables()


# Log the real error, but never send stack traces or database details to the client.
@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


FRONTEND_DIR = BACKEND_DIR.parent / "frontend" / "dist"

# dist/ only exists after `npm run build`; in dev the Vite server serves the UI.
# fallback="index.html" lets React Router handle client-side routes such as /tasks/1.
if FRONTEND_DIR.is_dir():
    app.frontend("/", directory=FRONTEND_DIR, fallback="index.html")
