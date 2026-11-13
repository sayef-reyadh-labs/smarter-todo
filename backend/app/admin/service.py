# Business rules for the admin endpoints (roles, bans, bulk actions, stats, exports, purge); no HTTP here.
import uuid
from datetime import timedelta

from app.activity.filters import ActivityFilters

from app.activity.repository import ActivityRepository
from app.activity.schemas import ActivityPage, ActivityRead, PurgeResult, SecurityReport, SuspiciousAccount, SuspiciousIp
from app.admin.export import MAX_EXPORT_ROWS, to_csv
from app.admin.filters import GroupFilters, TaskFilters, UserFilters
from app.admin.repository import AdminRepository
from app.admin.schemas import (
    AdminGroupPage,
    AdminGroupRead,
    AdminStats,
    AdminTaskPage,
    AdminTaskRead,
    AdminUserDetail,
    AdminUserPage,
    AdminUserRead,
    BanRequest,
    BulkResult,
    GroupStats,
    RoleUpdate,
    TaskStats,
    UserGroupRead,
    UserStats,
    UserTaskBrief,
    UserTaskCounts,
)
from app.auth.models import AppUser
from app.auth.repository import RefreshTokenRepository
from app.auth.schemas import SessionRead
from app.clock import utc_now
from app.config import settings
from app.errors import BadRequestError, NotFoundError
from app.groups.models import TaskGroup
from app.rbac import SystemRole
from app.tasks.models import Task


class AdminService:
    def __init__(self, repo: AdminRepository, tokens: RefreshTokenRepository, activity: ActivityRepository) -> None:
        self.repo = repo
        self.tokens = tokens
        self.activity = activity

    # ---- activity -------------------------------------------------------------------------------------------

    def list_activity(self, offset: int, limit: int, filters: ActivityFilters) -> ActivityPage:
        return ActivityPage(
            items=self.activity.list(offset, limit, filters),
            total=self.activity.count(filters),
            offset=offset,
            limit=limit,
        )

    # days defaults to the retention setting; with retention off and no days given there is nothing to do.
    def purge_activity(self, days: int | None) -> PurgeResult:
        days = days or settings.ACTIVITY_RETENTION_DAYS
        if days <= 0:
            raise BadRequestError("Give older_than_days; automatic retention is switched off")
        cutoff = utc_now() - timedelta(days=days)
        return PurgeResult(deleted=self.activity.purge_before(cutoff), cutoff=cutoff)

    # Failed logins and hostile requests (bad tokens, denied access) grouped by address and by account.
    def security_report(self, hours: int, min_failures: int) -> SecurityReport:
        since = utc_now() - timedelta(hours=hours)
        return SecurityReport(
            since=since,
            ips=[
                SuspiciousIp(ip_address=ip, failures=n, distinct_accounts=accounts, last_seen=last)
                for ip, n, accounts, last in self.activity.hostile_by_ip(since, min_failures)
            ],
            accounts=[
                SuspiciousAccount(email=email, user_id=user_id, failures=n, distinct_ips=ips, last_seen=last)
                for email, user_id, n, ips, last in self.activity.failed_logins_by_account(since, min_failures)
            ],
        )

    # ---- users ----------------------------------------------------------------------------------------------

    def list_users(self, offset: int, limit: int, filters: UserFilters) -> AdminUserPage:
        users = self.repo.list_users(offset, limit, filters)
        failed = self.activity.failed_login_counts([u.id for u in users], utc_now() - timedelta(days=7))
        return AdminUserPage(
            items=[self._user_read(u, failed.get(u.id, 0)) for u in users],
            total=self.repo.count_users(filters),
            offset=offset,
            limit=limit,
        )

    def user_detail(self, user_id: uuid.UUID) -> AdminUserDetail:
        user = self._get_user(user_id)
        failed = self.activity.failed_login_counts([user.id], utc_now() - timedelta(days=7))
        total, open_, done = self.repo.task_counts(user.id)
        return AdminUserDetail(
            user=self._user_read(user, failed.get(user.id, 0)),
            tasks=UserTaskCounts(total=total, open=open_, done=done),
            groups=[UserGroupRead(id=g.id, name=g.name, role=role) for g, role in self.repo.groups_of_user(user.id)],
            recent_tasks=[
                UserTaskBrief(id=t.id, title=t.title, is_completed=t.is_completed, due_date=t.due_date, group_name=group)
                for t, group in self.repo.recent_tasks_of_user(user.id, 5)
            ],
            sessions=self._sessions(user.id),
            recent_activity=[ActivityRead.model_validate(row) for row in self.activity.list(0, 10, ActivityFilters(user_id=user.id))],
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
        return self._ban(user, data.reason)

    def unban(self, user_id: uuid.UUID) -> AppUser:
        return self._unban(self._get_user(user_id))

    # Same rules as ban, one id at a time; yourself, admins, unknown ids and already banned users are skipped.
    def bulk_ban(self, admin: AppUser, ids: list[uuid.UUID], reason: str | None) -> tuple[list[AppUser], int]:
        users = {u.id: u for u in self.repo.users_by_ids(ids)}
        banned = []
        for user_id in dict.fromkeys(ids):
            user = users.get(user_id)
            if user is None or user.id == admin.id or user.role == SystemRole.ADMIN or user.is_banned:
                continue
            banned.append(self._ban(user, reason))
        return banned, len(dict.fromkeys(ids)) - len(banned)

    def bulk_unban(self, ids: list[uuid.UUID]) -> tuple[list[AppUser], int]:
        users = {u.id: u for u in self.repo.users_by_ids(ids)}
        unbanned = [self._unban(users[i]) for i in dict.fromkeys(ids) if i in users and users[i].is_banned]
        return unbanned, len(dict.fromkeys(ids)) - len(unbanned)

    # Ends every login session of the user (they have to log in again).
    def revoke_user_sessions(self, user_id: uuid.UUID) -> tuple[AppUser, int]:
        user = self._get_user(user_id)
        return user, self.tokens.revoke_others(user.id, None)

    # ---- tasks and groups -----------------------------------------------------------------------------------

    def list_tasks(self, offset: int, limit: int, filters: TaskFilters) -> AdminTaskPage:
        rows = self.repo.list_tasks(offset, limit, filters)
        return AdminTaskPage(
            items=[AdminTaskRead(**task.model_dump(), owner_email=email, group_name=group) for task, email, group in rows],
            total=self.repo.count_tasks(filters),
            offset=offset,
            limit=limit,
        )

    def delete_task(self, task_id: uuid.UUID) -> None:
        task = self.repo.get_task(task_id)
        if task is None:
            raise NotFoundError("Task not found")
        self.repo.delete_task(task)

    def bulk_delete_tasks(self, ids: list[uuid.UUID]) -> BulkResult:
        unique = list(dict.fromkeys(ids))
        deleted = self.repo.delete_tasks(unique)
        return BulkResult(affected=deleted, skipped=len(unique) - deleted)

    def list_groups(self, offset: int, limit: int, filters: GroupFilters) -> AdminGroupPage:
        rows = self.repo.list_groups(offset, limit, filters)
        return AdminGroupPage(
            items=[self._group_read(*row) for row in rows],
            total=self.repo.count_groups(filters),
            offset=offset,
            limit=limit,
        )

    def get_group(self, group_id: uuid.UUID) -> AdminGroupRead:
        row = self.repo.get_group_row(group_id)
        if row is None:
            raise NotFoundError("Group not found")
        return self._group_read(*row)

    # Deletes the group with its tasks and memberships; returns its name for the audit entry.
    def delete_group(self, group_id: uuid.UUID) -> str:
        row = self.repo.get_group_row(group_id)
        if row is None:
            raise NotFoundError("Group not found")
        self.repo.delete_group(group_id)
        return row[0].name

    # ---- exports (CSV text and the number of rows) ----------------------------------------------------------

    def export_users(self, filters: UserFilters) -> tuple[str, int]:
        items = self.list_users(0, MAX_EXPORT_ROWS, filters).items
        headers = ["id", "email", "name", "role", "status", "created_at", "last_login_at", "failed_logins_7d", "ban_reason"]
        rows = [
            [u.id, u.email, u.name, u.role, u.status, u.created_at.isoformat(), u.last_login_at.isoformat() if u.last_login_at else "", u.failed_logins_7d, u.ban_reason]
            for u in items
        ]
        return to_csv(headers, rows), len(rows)

    def export_tasks(self, filters: TaskFilters) -> tuple[str, int]:
        items = self.list_tasks(0, MAX_EXPORT_ROWS, filters).items
        headers = ["id", "title", "description", "due_date", "completed", "owner_email", "group", "created_at"]
        rows = [[t.id, t.title, t.description, t.due_date, t.is_completed, t.owner_email, t.group_name, t.created_at.isoformat()] for t in items]
        return to_csv(headers, rows), len(rows)

    def export_activity(self, filters: ActivityFilters) -> tuple[str, int]:
        items = self.activity.list(0, MAX_EXPORT_ROWS, filters)
        headers = ["time_utc", "email", "action", "entity_type", "entity_id", "detail", "ip_address", "user_agent"]
        rows = [[a.created_at.isoformat(), a.email, a.action, a.entity_type, a.entity_id, a.detail, a.ip_address, a.user_agent] for a in items]
        return to_csv(headers, rows), len(rows)

    # ---- stats ----------------------------------------------------------------------------------------------

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

    # ---- helpers --------------------------------------------------------------------------------------------

    def _get_user(self, user_id: uuid.UUID) -> AppUser:
        user = self.repo.get_user(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user

    def _ban(self, user: AppUser, reason: str | None) -> AppUser:
        patch = {"is_banned": True, "banned_at": utc_now(), "ban_reason": reason or None, "updated_at": utc_now()}
        user = self.repo.update_user(user, patch)
        self.tokens.revoke_all_for_user(user.id)
        return user

    def _unban(self, user: AppUser) -> AppUser:
        patch = {"is_banned": False, "banned_at": None, "ban_reason": None, "updated_at": utc_now()}
        return self.repo.update_user(user, patch)

    def _sessions(self, user_id: uuid.UUID) -> list[SessionRead]:
        return [
            SessionRead(id=t.session_id, user_agent=t.user_agent, ip_address=t.ip_address, started_at=t.started_at, last_used_at=t.last_used_at)
            for t in self.tokens.list_active(user_id)
        ]

    @staticmethod
    def _user_read(user: AppUser, failed_logins_7d: int) -> AdminUserRead:
        read = AdminUserRead.model_validate(user)
        read.failed_logins_7d = failed_logins_7d
        return read

    @staticmethod
    def _group_read(group: TaskGroup, owner_email: str, members: int, tasks: int) -> AdminGroupRead:
        return AdminGroupRead(
            id=group.id, name=group.name, owner_id=group.created_by, owner_email=owner_email, member_count=members, task_count=tasks, created_at=group.created_at
        )
