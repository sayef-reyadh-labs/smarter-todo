from datetime import date, datetime, timezone
from typing import Annotated

from pydantic import StringConstraints, field_validator, model_validator
from sqlmodel import Field, SQLModel

# Spaces are trimmed before the length check, so "   " is rejected.
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TaskBase(SQLModel):
    title: Title
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None


# table=True maps this class to the `task` table.
class Task(TaskBase, table=True):
    # AUTOINCREMENT stops SQLite from reusing the id of a deleted task, like Postgres.
    __table_args__ = {"sqlite_autoincrement": True}

    id: int | None = Field(default=None, primary_key=True)
    is_completed: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(SQLModel):
    title: Title | None = None
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None
    is_completed: bool | None = None

    # description and due_date may be cleared with null; title and is_completed may not.
    @model_validator(mode="after")
    def reject_null_required_fields(self) -> "TaskUpdate":
        for name in ("title", "is_completed"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class TaskRead(TaskBase):
    id: int
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("created_at", "updated_at")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
