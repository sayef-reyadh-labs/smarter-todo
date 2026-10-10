from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.pool import NullPool
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

DATABASE_URL = settings.database_url

if DATABASE_URL.startswith("sqlite"):
    # check_same_thread=False: FastAPI runs sync routes in a thread pool.
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Supabase's transaction pooler does the pooling and rejects prepared statements.
    engine = create_engine(DATABASE_URL, poolclass=NullPool, connect_args={"prepare_threshold": None})


def create_db_and_tables() -> None:
    """Create missing tables; existing data is kept."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
