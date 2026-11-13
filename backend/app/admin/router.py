# HTTP layer for /api/v1/admin: each route needs one RBAC permission, anyone without it gets 403.
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.activity.actions import ActivityAction
from app.activity.dependencies import UserActivityDep
from app.activity.filters import ActivityFiltersDep
from app.activity.schemas import ActivityPage, PurgeResult, SecurityReport
from app.admin.dependencies import AdminServiceDep
from app.admin.filters import GroupFiltersDep, TaskFiltersDep, UserFiltersDep
from app.admin.schemas import (
    AdminGroupPage,
    AdminGroupRead,
    AdminStats,
    AdminTaskPage,
    AdminUserDetail,
    AdminUserPage,
    AdminUserRead,
    BanRequest,
    BulkBan,
    BulkIds,
    BulkResult,
    RoleUpdate,
)
from app.auth.models import AppUser
from app.auth.schemas import UserRead
from app.rbac import Permission
from app.rbac.dependencies import require_permission

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=100)]

# The admin who is acting, for rules that compare them with the target user.
UserManager = Annotated[AppUser, Depends(require_permission(Permission.ADMIN_USERS_MANAGE))]


def needs(permission: Permission) -> Depends:
    return Depends(require_permission(permission))


# A download, never cached; the name carries the day (UTC).
def _csv(text: str, name: str) -> Response:
    day = datetime.now(timezone.utc).date().isoformat()
    return Response(
        content=text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{name}-{day}.csv"', "Cache-Control": "no-store"},
    )


# ---- users ------------------------------------------------------------------------------------------------------
# The fixed paths (export, bulk-...) come before /users/{user_id} so they are not read as an id.


@router.get("/users/export", dependencies=[needs(Permission.ADMIN_EXPORT)])
def export_users(service: AdminServiceDep, filters: UserFiltersDep, activity: UserActivityDep) -> Response:
    text, rows = service.export_users(filters)
    activity.log(ActivityAction.DATA_EXPORTED, entity_type="export", detail=f"users: {rows} rows")
    return _csv(text, "users")


@router.get("/users", response_model=AdminUserPage, dependencies=[needs(Permission.ADMIN_USERS_VIEW)])
def list_users(service: AdminServiceDep, filters: UserFiltersDep, offset: Offset = 0, limit: Limit = 20) -> AdminUserPage:
    return service.list_users(offset, limit, filters)


# Up to 50 users at once; yourself, admins, unknown ids and users already banned are skipped.
@router.post("/users/bulk-ban", response_model=BulkResult)
def bulk_ban(data: BulkBan, admin: UserManager, service: AdminServiceDep, activity: UserActivityDep) -> BulkResult:
    banned, skipped = service.bulk_ban(admin, data.ids, data.reason)
    for user in banned:
        activity.log(ActivityAction.USER_BANNED, entity_type="user", entity_id=user.id, detail=f"{user.email}: {user.ban_reason or 'no reason'} (bulk)")
    return BulkResult(affected=len(banned), skipped=skipped)


@router.post("/users/bulk-unban", response_model=BulkResult, dependencies=[needs(Permission.ADMIN_USERS_MANAGE)])
def bulk_unban(data: BulkIds, service: AdminServiceDep, activity: UserActivityDep) -> BulkResult:
    unbanned, skipped = service.bulk_unban(data.ids)
    for user in unbanned:
        activity.log(ActivityAction.USER_UNBANNED, entity_type="user", entity_id=user.id, detail=f"{user.email} (bulk)")
    return BulkResult(affected=len(unbanned), skipped=skipped)


# One user with their counts, groups, recent tasks, live sessions and recent activity (the dashboard drawer).
@router.get("/users/{user_id}", response_model=AdminUserDetail, dependencies=[needs(Permission.ADMIN_USERS_VIEW)])
def get_user(user_id: uuid.UUID, service: AdminServiceDep) -> AdminUserDetail:
    return service.user_detail(user_id)


# 400 when an admin changes their own role.
@router.patch("/users/{user_id}/role", response_model=UserRead)
def change_role(user_id: uuid.UUID, data: RoleUpdate, admin: UserManager, service: AdminServiceDep, activity: UserActivityDep) -> AppUser:
    user = service.change_role(admin, user_id, data)
    activity.log(ActivityAction.ROLE_CHANGED, entity_type="user", entity_id=user.id, detail=f"{user.email} is now {user.role}")
    return user


# 400 for yourself or another admin; the user's login sessions end immediately.
@router.post("/users/{user_id}/ban", response_model=AdminUserRead)
def ban_user(
    user_id: uuid.UUID, admin: UserManager, service: AdminServiceDep, activity: UserActivityDep, data: BanRequest | None = None
) -> AppUser:
    user = service.ban(admin, user_id, data or BanRequest())
    activity.log(ActivityAction.USER_BANNED, entity_type="user", entity_id=user.id, detail=f"{user.email}: {user.ban_reason or 'no reason'}")
    return user


@router.post("/users/{user_id}/unban", response_model=AdminUserRead, dependencies=[needs(Permission.ADMIN_USERS_MANAGE)])
def unban_user(user_id: uuid.UUID, service: AdminServiceDep, activity: UserActivityDep) -> AppUser:
    user = service.unban(user_id)
    activity.log(ActivityAction.USER_UNBANNED, entity_type="user", entity_id=user.id, detail=user.email)
    return user


# Log the user out everywhere (their access token still works until it expires, within minutes).
@router.post("/users/{user_id}/revoke-sessions", status_code=HTTPStatus.NO_CONTENT, dependencies=[needs(Permission.ADMIN_USERS_MANAGE)])
def revoke_user_sessions(user_id: uuid.UUID, service: AdminServiceDep, activity: UserActivityDep) -> None:
    user, ended = service.revoke_user_sessions(user_id)
    activity.log(ActivityAction.ADMIN_SESSIONS_REVOKED, entity_type="user", entity_id=user.id, detail=f"{user.email}: {ended} session(s)")


# ---- tasks ------------------------------------------------------------------------------------------------------


@router.get("/tasks/export", dependencies=[needs(Permission.ADMIN_EXPORT)])
def export_tasks(service: AdminServiceDep, filters: TaskFiltersDep, activity: UserActivityDep) -> Response:
    text, rows = service.export_tasks(filters)
    activity.log(ActivityAction.DATA_EXPORTED, entity_type="export", detail=f"tasks: {rows} rows")
    return _csv(text, "tasks")


@router.get("/tasks", response_model=AdminTaskPage, dependencies=[needs(Permission.ADMIN_TASKS_VIEW)])
def list_tasks(service: AdminServiceDep, filters: TaskFiltersDep, offset: Offset = 0, limit: Limit = 20) -> AdminTaskPage:
    return service.list_tasks(offset, limit, filters)


# Up to 50 ids; ids that do not exist are skipped.
@router.post("/tasks/bulk-delete", response_model=BulkResult, dependencies=[needs(Permission.ADMIN_TASKS_DELETE)])
def bulk_delete_tasks(data: BulkIds, service: AdminServiceDep, activity: UserActivityDep) -> BulkResult:
    result = service.bulk_delete_tasks(data.ids)
    activity.log(ActivityAction.ADMIN_TASKS_DELETED, entity_type="task", detail=f"{result.affected} task(s)")
    return result


@router.delete("/tasks/{task_id}", status_code=HTTPStatus.NO_CONTENT, dependencies=[needs(Permission.ADMIN_TASKS_DELETE)])
def delete_task(task_id: uuid.UUID, service: AdminServiceDep, activity: UserActivityDep) -> None:
    service.delete_task(task_id)
    activity.log(ActivityAction.ADMIN_TASK_DELETED, entity_type="task", entity_id=task_id)


# ---- groups -----------------------------------------------------------------------------------------------------


@router.get("/groups", response_model=AdminGroupPage, dependencies=[needs(Permission.ADMIN_GROUPS_VIEW)])
def list_groups(service: AdminServiceDep, filters: GroupFiltersDep, offset: Offset = 0, limit: Limit = 20) -> AdminGroupPage:
    return service.list_groups(offset, limit, filters)


@router.get("/groups/{group_id}", response_model=AdminGroupRead, dependencies=[needs(Permission.ADMIN_GROUPS_VIEW)])
def get_group(group_id: uuid.UUID, service: AdminServiceDep) -> AdminGroupRead:
    return service.get_group(group_id)


# Deletes the group with all its tasks and memberships.
@router.delete("/groups/{group_id}", status_code=HTTPStatus.NO_CONTENT, dependencies=[needs(Permission.ADMIN_GROUPS_DELETE)])
def delete_group(group_id: uuid.UUID, service: AdminServiceDep, activity: UserActivityDep) -> None:
    name = service.delete_group(group_id)
    activity.log(ActivityAction.ADMIN_GROUP_DELETED, entity_type="group", entity_id=group_id, detail=name)


# ---- activity and security --------------------------------------------------------------------------------------


@router.get("/activity/export", dependencies=[needs(Permission.ADMIN_EXPORT)])
def export_activity(service: AdminServiceDep, filters: ActivityFiltersDep, activity: UserActivityDep) -> Response:
    text, rows = service.export_activity(filters)
    activity.log(ActivityAction.DATA_EXPORTED, entity_type="export", detail=f"activity: {rows} rows")
    return _csv(text, "activity")


# What users did, newest first; filter by user, action, text and date range.
@router.get("/activity", response_model=ActivityPage, dependencies=[needs(Permission.ADMIN_ACTIVITY_VIEW)])
def list_activity(service: AdminServiceDep, filters: ActivityFiltersDep, offset: Offset = 0, limit: Limit = 20) -> ActivityPage:
    return service.list_activity(offset, limit, filters)


# Delete entries older than older_than_days (default: the retention setting); 400 when both are off.
@router.delete("/activity", response_model=PurgeResult, dependencies=[needs(Permission.ADMIN_ACTIVITY_PURGE)])
def purge_activity(service: AdminServiceDep, activity: UserActivityDep, older_than_days: Annotated[int | None, Query(ge=1, le=3650)] = None) -> PurgeResult:
    result = service.purge_activity(older_than_days)
    activity.log(ActivityAction.ACTIVITY_PURGED, detail=f"{result.deleted} entries before {result.cutoff:%Y-%m-%d}")
    return result


# Addresses and accounts with repeated failed logins or hostile requests in the last `hours`.
@router.get("/security/report", response_model=SecurityReport, dependencies=[needs(Permission.ADMIN_ACTIVITY_VIEW)])
def security_report(
    service: AdminServiceDep,
    hours: Annotated[int, Query(ge=1, le=720)] = 24,
    min_failures: Annotated[int, Query(ge=1, le=1000)] = 3,
) -> SecurityReport:
    return service.security_report(hours, min_failures)


@router.get("/stats", response_model=AdminStats, dependencies=[needs(Permission.ADMIN_STATS_VIEW)])
def get_stats(service: AdminServiceDep) -> AdminStats:
    return service.stats()
