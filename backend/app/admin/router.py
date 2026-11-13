# HTTP layer for /api/v1/admin: each route needs one RBAC permission, anyone without it gets 403.
import uuid
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.activity.actions import ActivityAction
from app.activity.dependencies import UserActivityDep
from app.activity.filters import ActivityFiltersDep
from app.activity.schemas import ActivityPage
from app.admin.dependencies import AdminServiceDep
from app.admin.filters import GroupFiltersDep, TaskFiltersDep, UserFiltersDep
from app.admin.schemas import (
    AdminGroupPage,
    AdminStats,
    AdminTaskPage,
    AdminUserPage,
    AdminUserRead,
    BanRequest,
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


@router.get("/users", response_model=AdminUserPage, dependencies=[Depends(require_permission(Permission.ADMIN_USERS_VIEW))])
def list_users(service: AdminServiceDep, filters: UserFiltersDep, offset: Offset = 0, limit: Limit = 20) -> AdminUserPage:
    return service.list_users(offset, limit, filters)


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


@router.post("/users/{user_id}/unban", response_model=AdminUserRead, dependencies=[Depends(require_permission(Permission.ADMIN_USERS_MANAGE))])
def unban_user(user_id: uuid.UUID, service: AdminServiceDep, activity: UserActivityDep) -> AppUser:
    user = service.unban(user_id)
    activity.log(ActivityAction.USER_UNBANNED, entity_type="user", entity_id=user.id, detail=user.email)
    return user


@router.get("/tasks", response_model=AdminTaskPage, dependencies=[Depends(require_permission(Permission.ADMIN_TASKS_VIEW))])
def list_tasks(service: AdminServiceDep, filters: TaskFiltersDep, offset: Offset = 0, limit: Limit = 20) -> AdminTaskPage:
    return service.list_tasks(offset, limit, filters)


@router.get("/groups", response_model=AdminGroupPage, dependencies=[Depends(require_permission(Permission.ADMIN_GROUPS_VIEW))])
def list_groups(service: AdminServiceDep, filters: GroupFiltersDep, offset: Offset = 0, limit: Limit = 20) -> AdminGroupPage:
    return service.list_groups(offset, limit, filters)


@router.delete("/tasks/{task_id}", status_code=HTTPStatus.NO_CONTENT, dependencies=[Depends(require_permission(Permission.ADMIN_TASKS_DELETE))])
def delete_task(task_id: uuid.UUID, service: AdminServiceDep, activity: UserActivityDep) -> None:
    service.delete_task(task_id)
    activity.log(ActivityAction.ADMIN_TASK_DELETED, entity_type="task", entity_id=task_id)


# What users did, newest first; filter by user, action, text and date range.
@router.get("/activity", response_model=ActivityPage, dependencies=[Depends(require_permission(Permission.ADMIN_ACTIVITY_VIEW))])
def list_activity(service: AdminServiceDep, filters: ActivityFiltersDep, offset: Offset = 0, limit: Limit = 20) -> ActivityPage:
    return service.list_activity(offset, limit, filters)


@router.get("/stats", response_model=AdminStats, dependencies=[Depends(require_permission(Permission.ADMIN_STATS_VIEW))])
def get_stats(service: AdminServiceDep) -> AdminStats:
    return service.stats()
