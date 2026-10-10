from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app.core.database import get_session
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.task_service import TaskNotFoundError, TaskService

# The controller reads the request, calls the service and shapes the response.
router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


# Routers can't hold exception handlers; main.py registers this one on the app.
async def task_not_found_handler(request: Request, exc: TaskNotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": "Task not found"})


def get_task_service(session: Annotated[Session, Depends(get_session)]) -> TaskService:
    return TaskService(session)


ServiceDep = Annotated[TaskService, Depends(get_task_service)]


# Create a task; it starts as not completed.
@router.post("", response_model=TaskRead, status_code=201)
def create_task(payload: TaskCreate, service: ServiceDep) -> Task:
    return service.create_task(payload)


# List tasks, newest first.
@router.get("", response_model=list[TaskRead])
def list_tasks(
    service: ServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Task]:
    return service.list_tasks(offset, limit)


# Read one task by id, or 404 if it does not exist.
@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, service: ServiceDep) -> Task:
    return service.get_task(task_id)


# Update only the fields that were sent; the others stay unchanged.
@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, service: ServiceDep) -> Task:
    return service.update_task(task_id, payload)


# Delete a task; 204 means success with no response body.
@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, service: ServiceDep) -> None:
    service.delete_task(task_id)
