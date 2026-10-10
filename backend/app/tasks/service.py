from sqlmodel import Session, select

from app.tasks.models import Task, utc_now
from app.tasks.schemas import TaskCreate, TaskUpdate


def list_tasks(session: Session, offset: int, limit: int) -> list[Task]:
    statement = select(Task).order_by(Task.created_at.desc(), Task.id.desc()).offset(offset).limit(limit)
    return list(session.exec(statement).all())


def get_task(session: Session, task_id: int) -> Task | None:
    return session.get(Task, task_id)


def create_task(session: Session, data: TaskCreate) -> Task:
    return _save(session, Task.model_validate(data))


def update_task(session: Session, task: Task, data: TaskUpdate) -> Task:
    changes = data.model_dump(exclude_unset=True)
    if not changes:
        return task
    task.sqlmodel_update(changes)
    task.updated_at = utc_now()
    return _save(session, task)


def delete_task(session: Session, task: Task) -> None:
    session.delete(task)
    session.commit()


def _save(session: Session, task: Task) -> Task:
    session.add(task)
    session.commit()
    session.refresh(task)
    return task
