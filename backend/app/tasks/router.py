from typing import Annotated

from fastapi import APIRouter, Query

from app.database import SessionDep
from app.tasks import service
from app.tasks.dependencies import TaskDep
from app.tasks.models import Task
from app.tasks.schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


# Create a task; it starts as not completed.
@router.post("", response_model=TaskRead, status_code=201)
def create_task(data: TaskCreate, session: SessionDep) -> Task:
    return service.create_task(session, data)


# List tasks, newest first.
@router.get("", response_model=list[TaskRead])
def list_tasks(
    session: SessionDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Task]:
    return service.list_tasks(session, offset, limit)


# Read one task by id, or 404 if it does not exist.
@router.get("/{task_id}", response_model=TaskRead)
def get_task(task: TaskDep) -> Task:
    return task


# Update only the fields that were sent; the others stay unchanged.
@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task: TaskDep, data: TaskUpdate, session: SessionDep) -> Task:
    return service.update_task(session, task, data)


# Delete a task; 204 means success with no response body.
@router.delete("/{task_id}", status_code=204)
def delete_task(task: TaskDep, session: SessionDep) -> None:
    service.delete_task(session, task)
