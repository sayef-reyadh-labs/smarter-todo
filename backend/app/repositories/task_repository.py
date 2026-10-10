from sqlmodel import Session, select

from app.models.task import Task


class TaskRepository:
    """Database access for tasks; no business rules."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, offset: int, limit: int) -> list[Task]:
        statement = select(Task).order_by(Task.created_at.desc(), Task.id.desc()).offset(offset).limit(limit)
        return list(self.session.exec(statement).all())

    def get(self, task_id: int) -> Task | None:
        return self.session.get(Task, task_id)

    def save(self, task: Task) -> Task:
        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)
        return task

    def delete(self, task: Task) -> None:
        self.session.delete(task)
        self.session.commit()
