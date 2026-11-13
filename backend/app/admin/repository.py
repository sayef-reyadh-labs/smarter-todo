# Data access layer for the admin endpoints: queries across every user and every task, unlike the owner-scoped task repository.
import uuid

from sqlmodel import Session, func, select

from app.auth.models import AppUser
from app.tasks.models import Task


class AdminRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_users(self, offset: int, limit: int) -> list[AppUser]:
        statement = select(AppUser).order_by(AppUser.created_at.desc(), AppUser.id.desc()).offset(offset).limit(limit)
        return list(self.session.exec(statement).all())

    def get_user(self, user_id: uuid.UUID) -> AppUser | None:
        return self.session.get(AppUser, user_id)

    def update_user(self, user: AppUser, patch: dict) -> AppUser:
        user.sqlmodel_update(patch)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def list_tasks(self, offset: int, limit: int) -> list[Task]:
        statement = select(Task).order_by(Task.created_at.desc(), Task.id.desc()).offset(offset).limit(limit)
        return list(self.session.exec(statement).all())

    def get_task(self, task_id: uuid.UUID) -> Task | None:
        return self.session.get(Task, task_id)

    def delete_task(self, task: Task) -> None:
        self.session.delete(task)
        self.session.commit()

    # COUNT(*) of one table with optional filters, used by the lists and the dashboard.
    def count(self, model: type, *filters) -> int:
        return self.session.exec(select(func.count()).select_from(model).where(*filters)).one()
