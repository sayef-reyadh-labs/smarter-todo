# Data access layer: every database query for tasks lives here, called only by the service.
import uuid

from sqlmodel import Session, col, func, or_, select

from app.categories.models import Category
from app.clock import utc_now
from app.tasks.filters import TaskListFilters
from app.tasks.models import Task


# Every query is limited to one owner's personal tasks (no group), so a user can never read or change another user's task.
class TaskRepository:
    def __init__(self, session: Session, owner_id: uuid.UUID) -> None:
        self.session = session
        self.owner_id = owner_id

    def _personal(self):
        return (Task.owner_id == self.owner_id, col(Task.group_id).is_(None))

    def _clauses(self, f: TaskListFilters) -> list:
        clauses = list(self._personal())
        if f.q:
            clauses.append(or_(Task.title.icontains(f.q, autoescape=True), Task.description.icontains(f.q, autoescape=True)))
        if f.category_id is not None:
            clauses.append(Task.category_id == f.category_id)
        if f.uncategorized:
            clauses.append(col(Task.category_id).is_(None))
        if f.status == "done":
            clauses.append(col(Task.is_completed).is_(True))
        elif f.status == "open":
            clauses.append(col(Task.is_completed).is_(False))
        elif f.status == "overdue":
            clauses.append(col(Task.is_completed).is_(False))
            clauses.append(Task.due_date < utc_now().date())
        return clauses

    def list(self, offset: int, limit: int, filters: TaskListFilters) -> list[Task]:
        statement = (
            select(Task)
            .where(*self._clauses(filters))
            .order_by(Task.created_at.desc(), Task.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def count(self, filters: TaskListFilters) -> int:
        return self.session.exec(select(func.count()).select_from(Task).where(*self._clauses(filters))).one()

    # True when the category exists and belongs to this owner.
    def category_exists(self, category_id: uuid.UUID) -> bool:
        statement = select(Category.id).where(Category.id == category_id, Category.owner_id == self.owner_id)
        return self.session.exec(statement).first() is not None

    def get(self, task_id: uuid.UUID) -> Task | None:
        return self.session.exec(select(Task).where(Task.id == task_id, *self._personal())).first()

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
