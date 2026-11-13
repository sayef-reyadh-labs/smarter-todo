# Data access layer for the admin endpoints: filtered queries across every user, task and group, unlike the owner-scoped task repository.
import uuid

from sqlmodel import Session, func, or_, select

from app.admin.filters import GroupFilters, TaskFilters, UserFilters
from app.auth.models import AppUser
from app.clock import utc_now
from app.groups.models import GroupMember, TaskGroup
from app.tasks.models import Task


class AdminRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_users(self, offset: int, limit: int, filters: UserFilters) -> list[AppUser]:
        statement = (
            select(AppUser)
            .where(*self._user_clauses(filters))
            .order_by(AppUser.created_at.desc(), AppUser.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def count_users(self, filters: UserFilters) -> int:
        return self.count(AppUser, *self._user_clauses(filters))

    def get_user(self, user_id: uuid.UUID) -> AppUser | None:
        return self.session.get(AppUser, user_id)

    def update_user(self, user: AppUser, patch: dict) -> AppUser:
        user.sqlmodel_update(patch)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    # Each row is (task, owner email, group name or None for a personal task).
    def list_tasks(self, offset: int, limit: int, filters: TaskFilters) -> list[tuple[Task, str, str | None]]:
        statement = (
            select(Task, AppUser.email, TaskGroup.name)
            .join(AppUser, AppUser.id == Task.owner_id)
            .join(TaskGroup, TaskGroup.id == Task.group_id, isouter=True)
            .where(*self._task_clauses(filters))
            .order_by(Task.created_at.desc(), Task.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return [(task, email, group) for task, email, group in self.session.exec(statement).all()]

    def count_tasks(self, filters: TaskFilters) -> int:
        return self.count(Task, *self._task_clauses(filters))

    def get_task(self, task_id: uuid.UUID) -> Task | None:
        return self.session.get(Task, task_id)

    def delete_task(self, task: Task) -> None:
        self.session.delete(task)
        self.session.commit()

    # Each row is (group, owner email, member count, task count).
    def list_groups(self, offset: int, limit: int, filters: GroupFilters) -> list[tuple[TaskGroup, str, int, int]]:
        members = select(func.count(GroupMember.user_id)).where(GroupMember.group_id == TaskGroup.id).scalar_subquery()
        tasks = select(func.count(Task.id)).where(Task.group_id == TaskGroup.id).scalar_subquery()
        statement = (
            select(TaskGroup, AppUser.email, members, tasks)
            .join(AppUser, AppUser.id == TaskGroup.created_by)
            .where(*self._group_clauses(filters))
            .order_by(TaskGroup.created_at.desc(), TaskGroup.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return [(group, email, m, t) for group, email, m, t in self.session.exec(statement).all()]

    def count_groups(self, filters: GroupFilters) -> int:
        return self.count(TaskGroup, *self._group_clauses(filters))

    # COUNT(*) of one table with optional filters, used by the lists and the dashboard.
    def count(self, model: type, *filters) -> int:
        return self.session.exec(select(func.count()).select_from(model).where(*filters)).one()

    @staticmethod
    def _user_clauses(f: UserFilters) -> list:
        clauses = []
        if f.q:
            clauses.append(or_(AppUser.email.icontains(f.q, autoescape=True), AppUser.name.icontains(f.q, autoescape=True)))
        if f.role:
            clauses.append(AppUser.role == f.role)
        if f.status:
            clauses.append(AppUser.is_banned.is_(f.status == "banned"))
        return clauses

    @staticmethod
    def _task_clauses(f: TaskFilters) -> list:
        clauses = []
        if f.owner_id is not None:
            clauses.append(Task.owner_id == f.owner_id)
        if f.group_id is not None:
            clauses.append(Task.group_id == f.group_id)
        if f.scope == "personal":
            clauses.append(Task.group_id.is_(None))
        elif f.scope == "group":
            clauses.append(Task.group_id.is_not(None))
        if f.status == "done":
            clauses.append(Task.is_completed.is_(True))
        elif f.status == "open":
            clauses.append(Task.is_completed.is_(False))
        elif f.status == "overdue":
            clauses.append(Task.is_completed.is_(False))
            clauses.append(Task.due_date < utc_now().date())
        if f.q:
            clauses.append(Task.title.icontains(f.q, autoescape=True))
        return clauses

    @staticmethod
    def _group_clauses(f: GroupFilters) -> list:
        clauses = []
        if f.owner_id is not None:
            clauses.append(TaskGroup.created_by == f.owner_id)
        if f.q:
            clauses.append(TaskGroup.name.icontains(f.q, autoescape=True))
        return clauses
