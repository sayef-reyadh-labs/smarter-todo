# HTTP layer for /api/v1/tasks: takes the request, calls the service, returns the response.
from typing import Annotated

from fastapi import APIRouter, Query

from app.tasks.dependencies import ServiceDep, TaskDep
from app.tasks.models import Task
from app.tasks.schemas import TaskCreate, TaskPage, TaskRead, TaskUpdate

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


# Create a task; it starts as not completed.
@router.post("", response_model=TaskRead, status_code=201)
def create_task(data: TaskCreate, service: ServiceDep) -> Task:
    return service.create_task(data)


# List tasks, newest first, with the total so clients know when they reached the end.
@router.get("", response_model=TaskPage)
def list_tasks(
    service: ServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> TaskPage:
    return service.list_tasks(offset, limit)


# Read one task by id, or 404 if it does not exist.
@router.get("/{task_id}", response_model=TaskRead)
def get_task(task: TaskDep) -> Task:
    return task


# Update only the fields that were sent; the others stay unchanged.
@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task: TaskDep, data: TaskUpdate, service: ServiceDep) -> Task:
    return service.update_task(task, data)


# Delete a task; 204 means success with no response body.
@router.delete("/{task_id}", status_code=204)
def delete_task(task: TaskDep, service: ServiceDep) -> None:
    service.delete_task(task)
