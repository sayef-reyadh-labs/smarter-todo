# Business rules for the admin endpoints (roles, bans, stats, removing tasks); no HTTP here.
import uuid
from datetime import timedelta

from app.activity.repository import ActivityRepository
from app.activity.schemas import ActivityPage
from app.admin.repository import AdminRepository
from app.admin.schemas import (
    AdminStats,
    AdminTaskPage,
    AdminUserPage,
    BanRequest,
    GroupStats,
    RoleUpdate,
    TaskStats,
    UserStats,
)
from app.auth.models import AppUser
from app.auth.repository import RefreshTokenRepository
from app.clock import utc_now
from app.errors import BadRequestError, NotFoundError
from app.groups.models import TaskGroup
from app.rbac import SystemRole
from app.tasks.models import Task


class AdminService:
    def __init__(self, repo: AdminRepository, tokens: RefreshTokenRepository, activity: ActivityRepository) -> None:
        self.repo = repo
        self.tokens = tokens
        self.activity = activity

    def list_activity(self, offset: int, limit: int, user_id: uuid.UUID | None, action: str | None) -> ActivityPage:
        return ActivityPage(
            items=self.activity.list(offset, limit, user_id, action),
            total=self.activity.count(user_id, action),
            offset=offset,
            limit=limit,
        )

    def list_users(self, offset: int, limit: int) -> AdminUserPage:
        return AdminUserPage(
            items=self.repo.list_users(offset, limit),
            total=self.repo.count(AppUser),
            offset=offset,
            limit=limit,
        )

    # An admin cannot change their own role, so the system always keeps at least one admin.
    def change_role(self, admin: AppUser, user_id: uuid.UUID, data: RoleUpdate) -> AppUser:
        if user_id == admin.id:
            raise BadRequestError("You cannot change your own role")
        return self.repo.update_user(self._get_user(user_id), {"role": data.role, "updated_at": utc_now()})

    # Banning also ends every login session of that user.
    def ban(self, admin: AppUser, user_id: uuid.UUID, data: BanRequest) -> AppUser:
        if user_id == admin.id:
            raise BadRequestError("You cannot ban yourself")
        user = self._get_user(user_id)
        if user.role == SystemRole.ADMIN:
            raise BadRequestError("You cannot ban an admin; demote them first")
        patch = {"is_banned": True, "banned_at": utc_now(), "ban_reason": data.reason or None, "updated_at": utc_now()}
        user = self.repo.update_user(user, patch)
        self.tokens.revoke_all_for_user(user.id)
        return user

    def unban(self, user_id: uuid.UUID) -> AppUser:
        patch = {"is_banned": False, "banned_at": None, "ban_reason": None, "updated_at": utc_now()}
        return self.repo.update_user(self._get_user(user_id), patch)

    def list_tasks(self, offset: int, limit: int) -> AdminTaskPage:
        return AdminTaskPage(
            items=self.repo.list_tasks(offset, limit),
            total=self.repo.count(Task),
            offset=offset,
            limit=limit,
        )

    def delete_task(self, task_id: uuid.UUID) -> None:
        task = self.repo.get_task(task_id)
        if task is None:
            raise NotFoundError("Task not found")
        self.repo.delete_task(task)

    def stats(self) -> AdminStats:
        count = self.repo.count
        week_ago = utc_now() - timedelta(days=7)
        return AdminStats(
            users=UserStats(
                total=count(AppUser),
                admins=count(AppUser, AppUser.role == SystemRole.ADMIN.value),
                banned=count(AppUser, AppUser.is_banned),
                new_last_7_days=count(AppUser, AppUser.created_at >= week_ago),
            ),
            tasks=TaskStats(
                total=count(Task),
                completed=count(Task, Task.is_completed),
                created_last_7_days=count(Task, Task.created_at >= week_ago),
            ),
            groups=GroupStats(total=count(TaskGroup)),
        )

    def _get_user(self, user_id: uuid.UUID) -> AppUser:
        user = self.repo.get_user(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user
