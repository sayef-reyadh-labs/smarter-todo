import uuid

from app.tasks.models import Task, utc_now
from app.tasks.repository import TaskRepository
from app.tasks.schemas import TaskCreate, TaskPage, TaskUpdate


# Business rules only: no HTTP and no database calls, everything stored goes through the repository.
class TaskService:
    def __init__(self, repo: TaskRepository) -> None:
        self.repo = repo

    def list_tasks(self, offset: int, limit: int) -> TaskPage:
        return TaskPage(items=self.repo.list(offset, limit), total=self.repo.count(), offset=offset, limit=limit)

    def get_task(self, task_id: uuid.UUID) -> Task | None:
        return self.repo.get(task_id)

    def create_task(self, data: TaskCreate) -> Task:
        return self.repo.create(Task.model_validate(data))

    def update_task(self, task: Task, data: TaskUpdate) -> Task:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            return task
        changes["updated_at"] = utc_now()
        return self.repo.update(task, changes)

    def delete_task(self, task: Task) -> None:
        self.repo.delete(task)
