# Database engine and the per-request Session that the repository uses.
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import event
from sqlalchemy.pool import NullPool
from sqlmodel import Session, create_engine

from app.config import settings

DATABASE_URL = settings.database_url

if DATABASE_URL.startswith("sqlite"):
    # check_same_thread=False: FastAPI runs sync routes in a thread pool.
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    # SQLite ignores foreign keys unless asked; this makes deleting a group delete its tasks, like PostgreSQL.
    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")
else:
    # Supabase's transaction pooler does the pooling and rejects prepared statements.
    engine = create_engine(DATABASE_URL, poolclass=NullPool, connect_args={"prepare_threshold": None})


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
