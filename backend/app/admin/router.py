# HTTP layer for /api/v1/admin: every route needs a logged-in admin, anyone else gets 403.
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.admin.dependencies import AdminServiceDep
from app.admin.schemas import (
    AdminStats,
    AdminTaskPage,
    AdminUserPage,
    AdminUserRead,
    BanRequest,
    RoleUpdate,
)
from app.auth.dependencies import AdminUser, require_admin
from app.auth.models import AppUser
from app.auth.schemas import UserRead

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])

Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=100)]


@router.get("/users", response_model=AdminUserPage)
def list_users(service: AdminServiceDep, offset: Offset = 0, limit: Limit = 20) -> AdminUserPage:
    return service.list_users(offset, limit)


# 400 when an admin changes their own role.
@router.patch("/users/{user_id}/role", response_model=UserRead)
def change_role(user_id: uuid.UUID, data: RoleUpdate, admin: AdminUser, service: AdminServiceDep) -> AppUser:
    return service.change_role(admin, user_id, data)


# 400 for yourself or another admin; the user's login sessions end immediately.
@router.post("/users/{user_id}/ban", response_model=AdminUserRead)
def ban_user(user_id: uuid.UUID, admin: AdminUser, service: AdminServiceDep, data: BanRequest | None = None) -> AppUser:
    return service.ban(admin, user_id, data or BanRequest())


@router.post("/users/{user_id}/unban", response_model=AdminUserRead)
def unban_user(user_id: uuid.UUID, service: AdminServiceDep) -> AppUser:
    return service.unban(user_id)


@router.get("/tasks", response_model=AdminTaskPage)
def list_tasks(service: AdminServiceDep, offset: Offset = 0, limit: Limit = 20) -> AdminTaskPage:
    return service.list_tasks(offset, limit)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: uuid.UUID, service: AdminServiceDep) -> None:
    service.delete_task(task_id)


@router.get("/stats", response_model=AdminStats)
def get_stats(service: AdminServiceDep) -> AdminStats:
    return service.stats()
