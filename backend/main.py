import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.database import BACKEND_DIR, create_db_and_tables
from app.routers import tasks

logger = logging.getLogger("smarter_todo")

app = FastAPI(
    title="Smarter Todo API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

app.include_router(tasks.router)

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
if FRONTEND_DIR.is_dir():
    app.frontend("/", directory=FRONTEND_DIR)
