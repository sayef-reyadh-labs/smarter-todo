# Response shapes for the admin activity list.
import uuid
from datetime import datetime, timezone

from pydantic import field_validator
from sqlmodel import SQLModel


class ActivityRead(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    email: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    detail: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("created_at")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class ActivityPage(SQLModel):
    items: list[ActivityRead]
    total: int
    offset: int
    limit: int
