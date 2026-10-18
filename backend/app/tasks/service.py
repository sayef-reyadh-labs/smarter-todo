# Business rules for tasks (due date check, updated_at); called by the router, stores data via the repository.
import uuid
from datetime import date

from app.tasks.models import Task, utc_now
from app.tasks.repository import TaskRepository
from app.tasks.schemas import TaskCreate, TaskPage, TaskUpdate


class TaskRuleError(Exception):
    """A business rule was broken; main.py turns it into a 409 response."""


# Business rules only: no HTTP and no database calls, everything stored goes through the repository.
class TaskService:
    def __init__(self, repo: TaskRepository) -> None:
        self.repo = repo

    def list_tasks(self, offset: int, limit: int) -> TaskPage:
        return TaskPage(items=self.repo.list(offset, limit), total=self.repo.count(), offset=offset, limit=limit)

    def get_task(self, task_id: uuid.UUID) -> Task | None:
        return self.repo.get(task_id)

    def create_task(self, data: TaskCreate) -> Task:
        self._check_due_date(data.due_date)
        return self.repo.create(Task.model_validate(data))

    def update_task(self, task: Task, data: TaskUpdate) -> Task:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            return task
        # Checked only when the date is sent, so completing an overdue task still works.
        if "due_date" in changes:
            self._check_due_date(changes["due_date"])
        changes["updated_at"] = utc_now()
        return self.repo.update(task, changes)

    def delete_task(self, task: Task) -> None:
        self.repo.delete(task)

    def _check_due_date(self, due_date: date | None) -> None:
        if due_date and due_date < date.today():
            raise TaskRuleError("Due date cannot be in the past")
