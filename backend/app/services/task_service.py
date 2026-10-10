from app.models.task import Task, utc_now
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate


class TaskNotFoundError(Exception):
    """Raised when a task id does not exist; the controller maps it to a 404."""


class TaskService:
    """Business rules for tasks; knows nothing about HTTP or SQL."""

    def __init__(self, repo: TaskRepository) -> None:
        self.repo = repo

    def create_task(self, data: TaskCreate) -> Task:
        return self.repo.save(Task.model_validate(data))

    def list_tasks(self, offset: int, limit: int) -> list[Task]:
        return self.repo.list(offset, limit)

    def get_task(self, task_id: int) -> Task:
        task = self.repo.get(task_id)
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
        return self.repo.save(task)

    def delete_task(self, task_id: int) -> None:
        self.repo.delete(self.get_task(task_id))
