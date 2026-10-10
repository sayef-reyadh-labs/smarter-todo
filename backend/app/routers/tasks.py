from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import Task, TaskCreate, TaskRead, TaskUpdate, utc_now

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

SessionDep = Annotated[Session, Depends(get_session)]


def get_task_or_404(session: Session, task_id: int) -> Task:
    task = session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# Create a task; it starts as not completed.
@router.post("", response_model=TaskRead, status_code=201)
def create_task(data: TaskCreate, session: SessionDep) -> Task:
    task = Task.model_validate(data)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


# List tasks, newest first.
@router.get("", response_model=list[TaskRead])
def list_tasks(
    session: SessionDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Task]:
    statement = select(Task).order_by(Task.created_at.desc(), Task.id.desc()).offset(offset).limit(limit)
    return list(session.exec(statement).all())


# Read one task by id, or 404 if it does not exist.
@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, session: SessionDep) -> Task:
    return get_task_or_404(session, task_id)


# Update only the fields that were sent; the others stay unchanged.
@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, data: TaskUpdate, session: SessionDep) -> Task:
    task = get_task_or_404(session, task_id)
    changes = data.model_dump(exclude_unset=True)
    if changes:
        task.sqlmodel_update(changes)
        task.updated_at = utc_now()
        session.add(task)
        session.commit()
        session.refresh(task)
    return task


# Delete a task; 204 means success with no response body.
@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, session: SessionDep) -> None:
    task = get_task_or_404(session, task_id)
    session.delete(task)
    session.commit()
