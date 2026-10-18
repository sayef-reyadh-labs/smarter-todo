# The `task` database table; only the repository reads and writes it.
import uuid
from datetime import date, datetime

from sqlmodel import Field, SQLModel

from app.auth import models as _auth_models  # noqa: F401  (registers the app_user table that owner_id points to)
from app.clock import utc_now


# table=True maps this class to the `task` table.
class Task(SQLModel, table=True):
    # UUIDs are generated here, so ids are not guessable and don't depend on the database.
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None
    is_completed: bool = False
    owner_id: uuid.UUID = Field(foreign_key="app_user.id", index=True)  # the user who created the task
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
