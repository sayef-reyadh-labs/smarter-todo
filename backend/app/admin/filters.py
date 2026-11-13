# Query filters of the admin lists: each dependency turns query parameters into one small immutable object.
import uuid
from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, Query

Text = Annotated[str | None, Query(max_length=100)]


# Blank search text means "no search".
def _clean(text: str | None) -> str | None:
    return (text or "").strip() or None


@dataclass(frozen=True)
class UserFilters:
    q: str | None = None  # part of the name or email
    role: str | None = None
    status: str | None = None  # active or banned


@dataclass(frozen=True)
class TaskFilters:
    owner_id: uuid.UUID | None = None
    group_id: uuid.UUID | None = None
    scope: str | None = None  # personal or group
    status: str | None = None  # open, done or overdue
    q: str | None = None  # part of the title


@dataclass(frozen=True)
class GroupFilters:
    owner_id: uuid.UUID | None = None
    q: str | None = None  # part of the name


def user_filters(
    q: Text = None,
    role: Literal["user", "admin"] | None = None,
    status: Literal["active", "banned"] | None = None,
) -> UserFilters:
    return UserFilters(_clean(q), role, status)


def task_filters(
    owner_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
    scope: Literal["personal", "group"] | None = None,
    status: Literal["open", "done", "overdue"] | None = None,
    q: Text = None,
) -> TaskFilters:
    return TaskFilters(owner_id, group_id, scope, status, _clean(q))


def group_filters(owner_id: uuid.UUID | None = None, q: Text = None) -> GroupFilters:
    return GroupFilters(owner_id, _clean(q))


UserFiltersDep = Annotated[UserFilters, Depends(user_filters)]
TaskFiltersDep = Annotated[TaskFilters, Depends(task_filters)]
GroupFiltersDep = Annotated[GroupFilters, Depends(group_filters)]
