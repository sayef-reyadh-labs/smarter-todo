import uuid
from typing import Annotated

from fastapi import Depends, HTTPException

from app.database import SessionDep
from app.tasks.models import Task
from app.tasks.repository import TaskRepository
from app.tasks.service import TaskService


# Builds the service for this request: session -> repository -> service.
def get_task_service(session: SessionDep) -> TaskService:
    return TaskService(TaskRepository(session))


ServiceDep = Annotated[TaskService, Depends(get_task_service)]


# Resolves {task_id} from the path into a Task, or answers 404; routes just declare TaskDep.
def valid_task(task_id: uuid.UUID, service: ServiceDep) -> Task:
    task = service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


TaskDep = Annotated[Task, Depends(valid_task)]
