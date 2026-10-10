import os
from collections.abc import Iterator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

BACKEND_DIR = Path(__file__).resolve().parent.parent
# Vercel's filesystem is read-only except /tmp, which is wiped between invocations.
DB_DIR = Path("/tmp") if os.getenv("VERCEL") else BACKEND_DIR
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(DB_DIR / 'smarter_todo.db').as_posix()}")

# check_same_thread=False: FastAPI runs sync routes in a thread pool.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables() -> None:
    """Create missing tables; existing data is kept."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
