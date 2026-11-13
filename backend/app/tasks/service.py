# Business rules for tasks (due date check, updated_at); called by the router, stores data via the repository.
import uuid
from datetime import date

from app.clock import utc_now
from app.errors import ConflictError, UnprocessableError
from app.tasks.filters import TaskListFilters
from app.tasks.models import Task
from app.tasks.repository import TaskRepository
from app.tasks.schemas import PersonalTaskCreate, PersonalTaskUpdate, TaskPage


class TaskRuleError(ConflictError):
    """A business rule was broken; main.py turns it into a 409 response."""


# Shared with group tasks, so personal and group tasks follow the same rule.
def check_due_date(due_date: date | None) -> None:
    if due_date and due_date < date.today():
        raise TaskRuleError("Due date cannot be in the past")


# Business rules only: no HTTP and no database calls, everything stored goes through the repository.
class TaskService:
    def __init__(self, repo: TaskRepository) -> None:
        self.repo = repo

    def list_tasks(self, offset: int, limit: int, filters: TaskListFilters) -> TaskPage:
        return TaskPage(items=self.repo.list(offset, limit, filters), total=self.repo.count(filters), offset=offset, limit=limit)

    def get_task(self, task_id: uuid.UUID) -> Task | None:
        return self.repo.get(task_id)

    def create_task(self, data: PersonalTaskCreate) -> Task:
        check_due_date(data.due_date)
        self._check_category(data.category_id)
        return self.repo.create(Task.model_validate(data, update={"owner_id": self.repo.owner_id}))

    def update_task(self, task: Task, data: PersonalTaskUpdate) -> Task:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            return task
        # Checked only when the date is sent, so completing an overdue task still works.
        if "due_date" in changes:
            check_due_date(changes["due_date"])
        if "category_id" in changes:
            self._check_category(changes["category_id"])
        changes["updated_at"] = utc_now()
        return self.repo.update(task, changes)

    def delete_task(self, task: Task) -> None:
        self.repo.delete(task)

    # A task can only use one of its owner's own categories.
    def _check_category(self, category_id: uuid.UUID | None) -> None:
        if category_id is not None and not self.repo.category_exists(category_id):
            raise UnprocessableError("category_id must be one of your categories")
