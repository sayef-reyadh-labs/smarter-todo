# Request and response shapes for groups, members and group tasks.
import uuid
from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import Field, field_validator
from sqlmodel import SQLModel

from app.auth.schemas import Email, Name
from app.tasks.schemas import TaskCreate, TaskRead, TaskUpdate


class GroupCreate(SQLModel):
    name: Name


class GroupUpdate(SQLModel):
    name: Name


# my_role is the caller's role in this group, so the same group looks different to its owner and its members.
# my_permissions are the delegable permissions the caller can use here (the owner has all of them).
class GroupRead(SQLModel):
    id: uuid.UUID
    name: str
    created_by: uuid.UUID
    my_role: str
    my_permissions: list[str] = []
    created_at: datetime

    # SQLite returns naive datetimes; they are stored as UTC.
    @field_validator("created_at")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class MemberAdd(SQLModel):
    email: Email


class MemberRead(SQLModel):
    user_id: uuid.UUID
    name: str
    email: str
    role: str
    permissions: list[str] = []  # delegable permissions this member can use
    joined_at: datetime

    @field_validator("joined_at")
    @classmethod
    def as_utc(cls, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


# What an owner can give a member; deleting tasks and managing the group are never delegable.
DelegablePermission = Literal["group:tasks:create", "group:tasks:update", "group:tasks:assign"]


# The full list: anything not listed is taken away.
class MemberPermissionsUpdate(SQLModel):
    permissions: Annotated[list[DelegablePermission], Field(max_length=3)]


# A group task may be assigned to one member (assignee_id) or to nobody.
class GroupTaskCreate(TaskCreate):
    assignee_id: uuid.UUID | None = None


class GroupTaskUpdate(TaskUpdate):
    assignee_id: uuid.UUID | None = None


class GroupTaskRead(TaskRead):
    owner_id: uuid.UUID
    group_id: uuid.UUID
    assignee_id: uuid.UUID | None = None


class GroupTaskPage(SQLModel):
    items: list[GroupTaskRead]
    total: int
    offset: int
    limit: int
