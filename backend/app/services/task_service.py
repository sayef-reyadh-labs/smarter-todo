from sqlmodel import Session, select

from app.models.task import Task, utc_now
from app.schemas.task import TaskCreate, TaskUpdate


class TaskNotFoundError(Exception):
    """Raised when a task id does not exist; the controller maps it to a 404."""


class TaskService:
    """Business rules and database access for tasks; knows nothing about HTTP."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create_task(self, data: TaskCreate) -> Task:
        task = Task.model_validate(data)
        return self._save(task)

    def list_tasks(self, offset: int, limit: int) -> list[Task]:
        statement = select(Task).order_by(Task.created_at.desc(), Task.id.desc()).offset(offset).limit(limit)
        return list(self.session.exec(statement).all())

    def get_task(self, task_id: int) -> Task:
        task = self.session.get(Task, task_id)
        if task is None:
            raise TaskNotFoundError(task_id)
        return task

    def update_task(self, task_id: int, data: TaskUpdate) -> Task:
        task = self.get_task(task_id)
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            return task
        task.sqlmodel_update(changes)
        task.updated_at = utc_now()
        return self._save(task)

    def delete_task(self, task_id: int) -> None:
        self.session.delete(self.get_task(task_id))
        self.session.commit()

    def _save(self, task: Task) -> Task:
        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)
        return task
