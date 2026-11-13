# HTTP layer for /api/v1/tasks: takes the request, calls the service, returns the response.
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Query

from app.activity.actions import ActivityAction
from app.activity.dependencies import UserActivityDep
from app.tasks.dependencies import ServiceDep, TaskDep
from app.tasks.filters import TaskListFiltersDep
from app.tasks.models import Task
from app.tasks.schemas import PersonalTaskCreate, PersonalTaskUpdate, TaskPage, TaskRead

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


# Create a task; it starts as not completed. 422 when category_id is not one of your categories.
@router.post("", response_model=TaskRead, status_code=HTTPStatus.CREATED)
def create_task(data: PersonalTaskCreate, service: ServiceDep, activity: UserActivityDep) -> Task:
    task = service.create_task(data)
    activity.log(ActivityAction.TASK_CREATED, entity_type="task", entity_id=task.id, detail=task.title)
    return task


# List tasks, newest first, with the total so clients know when they reached the end.
# Filters: q (title or description), category_id, uncategorized, status (open, done, overdue).
@router.get("", response_model=TaskPage)
def list_tasks(
    service: ServiceDep,
    filters: TaskListFiltersDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> TaskPage:
    return service.list_tasks(offset, limit, filters)


# Read one task by id, or 404 if it does not exist.
@router.get("/{task_id}", response_model=TaskRead)
def get_task(task: TaskDep) -> Task:
    return task


# Update only the fields that were sent; the others stay unchanged.
@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task: TaskDep, data: PersonalTaskUpdate, service: ServiceDep, activity: UserActivityDep) -> Task:
    updated = service.update_task(task, data)
    activity.log(ActivityAction.TASK_UPDATED, entity_type="task", entity_id=updated.id, detail=updated.title)
    return updated


# Delete a task; 204 means success with no response body.
@router.delete("/{task_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_task(task: TaskDep, service: ServiceDep, activity: UserActivityDep) -> None:
    task_id, title = task.id, task.title
    service.delete_task(task)
    activity.log(ActivityAction.TASK_DELETED, entity_type="task", entity_id=task_id, detail=title)
