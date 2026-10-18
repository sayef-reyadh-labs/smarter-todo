# Data access layer: every database query for tasks lives here, called only by the service.
import uuid

from sqlmodel import Session, func, select

from app.tasks.models import Task


# Every query is limited to one owner, so a user can never read or change another user's task.
class TaskRepository:
    def __init__(self, session: Session, owner_id: uuid.UUID) -> None:
        self.session = session
        self.owner_id = owner_id

    def list(self, offset: int, limit: int) -> list[Task]:
        statement = (
            select(Task)
            .where(Task.owner_id == self.owner_id)
            .order_by(Task.created_at.desc(), Task.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def count(self) -> int:
        return self.session.exec(select(func.count()).select_from(Task).where(Task.owner_id == self.owner_id)).one()

    def get(self, task_id: uuid.UUID) -> Task | None:
        return self.session.exec(select(Task).where(Task.id == task_id, Task.owner_id == self.owner_id)).first()

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
