# Query filters of the personal task list: search text, category and status.
import uuid
from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, Query


@dataclass(frozen=True)
class TaskListFilters:
    q: str | None = None  # part of the title or description
    category_id: uuid.UUID | None = None
    uncategorized: bool = False  # only tasks with no category
    status: str | None = None  # open, done or overdue


def task_list_filters(
    q: Annotated[str | None, Query(max_length=100)] = None,
    category_id: uuid.UUID | None = None,
    uncategorized: bool = False,
    status: Literal["open", "done", "overdue"] | None = None,
) -> TaskListFilters:
    return TaskListFilters((q or "").strip() or None, category_id, uncategorized, status)


TaskListFiltersDep = Annotated[TaskListFilters, Depends(task_list_filters)]
