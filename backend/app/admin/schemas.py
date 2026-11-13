# Request and response shapes for the admin endpoints; lists come back as pages with a total, like the task list.
import uuid
from datetime import date, datetime, timezone
from typing import Annotated, Literal

from pydantic import Field, StringConstraints, computed_field, field_validator
from sqlmodel import SQLModel

from app.activity.schemas import ActivityRead
from app.auth.schemas import SessionRead, UserRead
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
    last_login_at: datetime | None = None
    failed_logins_7d: int = 0  # wrong passwords or blocked attempts in the last 7 days

    @computed_field
    @property
    def status(self) -> Literal["active", "banned"]:
        return "banned" if self.is_banned else "active"

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("banned_at", "last_login_at")
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
    owner_email: str
    group_id: uuid.UUID | None = None
    group_name: str | None = None


class AdminTaskPage(SQLModel):
    items: list[AdminTaskRead]
    total: int
    offset: int
    limit: int


class AdminGroupRead(SQLModel):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    owner_email: str
    member_count: int
    task_count: int
    created_at: datetime

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("created_at")
    @classmethod
    def created_at_as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class AdminGroupPage(SQLModel):
    items: list[AdminGroupRead]
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


# Bulk actions: at most BULK_LIMIT ids at once.
BULK_LIMIT = 50
BulkIdList = Annotated[list[uuid.UUID], Field(min_length=1, max_length=BULK_LIMIT)]


class BulkIds(SQLModel):
    ids: BulkIdList


class BulkBan(BulkIds):
    reason: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] | None = None


# affected were changed; skipped were left alone (missing, yourself, another admin, already in that state).
class BulkResult(SQLModel):
    affected: int
    skipped: int


class UserTaskCounts(SQLModel):
    total: int
    open: int
    done: int


class UserGroupRead(SQLModel):
    id: uuid.UUID
    name: str
    role: str


class UserTaskBrief(SQLModel):
    id: uuid.UUID
    title: str
    is_completed: bool
    due_date: date | None = None
    group_name: str | None = None


# Everything the user drawer shows about one person.
class AdminUserDetail(SQLModel):
    user: AdminUserRead
    tasks: UserTaskCounts
    groups: list[UserGroupRead]
    recent_tasks: list[UserTaskBrief]
    sessions: list[SessionRead]
    recent_activity: list[ActivityRead]
