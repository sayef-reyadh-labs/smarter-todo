from datetime import date, datetime, timezone
from typing import Annotated

from pydantic import StringConstraints, field_validator
from sqlmodel import Field, SQLModel

# Spaces are trimmed before the length check, so "   " is rejected.
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class TaskBase(SQLModel):
    title: Title
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(SQLModel):
    title: Title | None = None
    description: str | None = Field(default=None, max_length=1000)
    due_date: date | None = None
    is_completed: bool | None = None

    # description and due_date may be cleared with null; title and is_completed may not.
    @field_validator("title", "is_completed")
    @classmethod
    def not_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("cannot be null")
        return value


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
