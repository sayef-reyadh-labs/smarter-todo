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
        self._check_title_is_free(data.title)
        return self.repo.create(Task.model_validate(data))

    def update_task(self, task: Task, data: TaskUpdate) -> Task:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            return task
        # Only rules touched by this change are checked, so completing an overdue task still works.
        if "due_date" in changes:
            self._check_due_date(changes["due_date"])
        reopened = changes.get("is_completed") is False and task.is_completed
        if "title" in changes or reopened:
            if not changes.get("is_completed", task.is_completed):
                self._check_title_is_free(changes.get("title", task.title), exclude=task)
        changes["updated_at"] = utc_now()
        return self.repo.update(task, changes)

    def delete_task(self, task: Task) -> None:
        self.repo.delete(task)

    def _check_due_date(self, due_date: date | None) -> None:
        if due_date and due_date < date.today():
            raise TaskRuleError("Due date cannot be in the past")

    def _check_title_is_free(self, title: str, exclude: Task | None = None) -> None:
        if self.repo.find_open_by_title(title, exclude_id=exclude.id if exclude else None):
            raise TaskRuleError("An open task with this title already exists")
