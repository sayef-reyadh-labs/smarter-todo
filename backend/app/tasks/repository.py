# Data access layer: every database query for tasks lives here, called only by the service.
import uuid

from sqlmodel import Session, func, select

from app.tasks.models import Task


# The only class that knows where tasks are stored; the service calls it and never sees SQL.
class TaskRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, offset: int, limit: int) -> list[Task]:
        statement = select(Task).order_by(Task.created_at.desc(), Task.id.desc()).offset(offset).limit(limit)
        return list(self.session.exec(statement).all())

    def count(self) -> int:
        return self.session.exec(select(func.count()).select_from(Task)).one()

    def get(self, task_id: uuid.UUID) -> Task | None:
        return self.session.get(Task, task_id)

    def create(self, task: Task) -> Task:
        return self._save(task)

    def update(self, task: Task, patch: dict) -> Task:
        task.sqlmodel_update(patch)
        return self._save(task)

    def delete(self, task: Task) -> None:
        self.session.delete(task)
        self.session.commit()

    def _save(self, task: Task) -> Task:
        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)
        return task
