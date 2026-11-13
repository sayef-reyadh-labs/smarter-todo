# Request and response shapes for the admin endpoints; lists come back as pages with a total, like the task list.
import uuid
from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import StringConstraints, computed_field, field_validator
from sqlmodel import SQLModel

from app.auth.schemas import UserRead
from app.tasks.schemas import TaskRead


class RoleUpdate(SQLModel):
    role: Literal["user", "admin"]


class BanRequest(SQLModel):
    reason: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None


# UserRead plus what the dashboard needs to show who is banned.
class AdminUserRead(UserRead):
    is_banned: bool
    banned_at: datetime | None = None
    ban_reason: str | None = None

    @computed_field
    @property
    def status(self) -> Literal["active", "banned"]:
        return "banned" if self.is_banned else "active"

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("banned_at")
    @classmethod
    def banned_at_as_utc(cls, value: datetime | None) -> datetime | None:
        return value.replace(tzinfo=timezone.utc) if value is not None and value.tzinfo is None else value


class AdminUserPage(SQLModel):
    items: list[AdminUserRead]
    total: int
    offset: int
    limit: int


# A task as an admin sees it: any owner and any group, so both are shown.
class AdminTaskRead(TaskRead):
    owner_id: uuid.UUID
    group_id: uuid.UUID | None = None


class AdminTaskPage(SQLModel):
    items: list[AdminTaskRead]
    total: int
    offset: int
    limit: int


class UserStats(SQLModel):
    total: int
    admins: int
    banned: int
    new_last_7_days: int


class TaskStats(SQLModel):
    total: int
    completed: int
    created_last_7_days: int


class GroupStats(SQLModel):
    total: int


class AdminStats(SQLModel):
    users: UserStats
    tasks: TaskStats
    groups: GroupStats
