from typing import Annotated

from fastapi import Depends, HTTPException

from app.database import SessionDep
from app.tasks import service
from app.tasks.models import Task


# Resolves {task_id} from the path into a Task, or answers 404; routes just declare TaskDep.
def valid_task(task_id: int, session: SessionDep) -> Task:
    task = service.get_task(session, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


TaskDep = Annotated[Task, Depends(valid_task)]
