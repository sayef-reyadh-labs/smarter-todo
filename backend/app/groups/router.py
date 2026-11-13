# HTTP layer for /api/v1/groups: groups, members and group tasks. Outsiders get 404, members without the RBAC permission get 403.
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import CurrentUser
from app.groups.dependencies import GroupServiceDep, GroupTaskServiceDep, MemberDep, require_group_permission
from app.groups.models import GroupMember
from app.groups.schemas import (
    GroupCreate,
    GroupRead,
    GroupTaskCreate,
    GroupTaskPage,
    GroupTaskRead,
    GroupTaskUpdate,
    GroupUpdate,
    MemberAdd,
    MemberRead,
)
from app.rbac import Permission
from app.tasks.models import Task

router = APIRouter(prefix="/api/v1/groups", tags=["groups"])


def needs(permission: Permission) -> Depends:
    return Depends(require_group_permission(permission))


# Routes that need the caller's membership row take it as a parameter; the others only declare the permission.
CanRename = Annotated[GroupMember, needs(Permission.GROUP_RENAME)]
CanDelete = Annotated[GroupMember, needs(Permission.GROUP_DELETE)]
CanAddMember = Annotated[GroupMember, needs(Permission.GROUP_MEMBERS_ADD)]


# Create a group; the caller becomes its owner.
@router.post("", response_model=GroupRead, status_code=201)
def create_group(data: GroupCreate, user: CurrentUser, service: GroupServiceDep) -> GroupRead:
    return service.create_group(user, data)


# The groups the caller belongs to.
@router.get("", response_model=list[GroupRead])
def list_groups(user: CurrentUser, service: GroupServiceDep) -> list[GroupRead]:
    return service.list_groups(user)


@router.get("/{group_id}", response_model=GroupRead, dependencies=[needs(Permission.GROUP_VIEW)])
def get_group(member: MemberDep, service: GroupServiceDep) -> GroupRead:
    return service.get_group(member)


@router.patch("/{group_id}", response_model=GroupRead)
def rename_group(member: CanRename, data: GroupUpdate, service: GroupServiceDep) -> GroupRead:
    return service.rename_group(member, data)


# Deleting a group also deletes its tasks and memberships.
@router.delete("/{group_id}", status_code=204)
def delete_group(member: CanDelete, service: GroupServiceDep) -> None:
    service.delete_group(member)


@router.get("/{group_id}/members", response_model=list[MemberRead], dependencies=[needs(Permission.GROUP_MEMBERS_VIEW)])
def list_members(member: MemberDep, service: GroupServiceDep) -> list[MemberRead]:
    return service.list_members(member.group_id)


# Add a member by email: 404 for an unknown email, 409 if they are already in the group.
@router.post("/{group_id}/members", response_model=MemberRead, status_code=201)
def add_member(member: CanAddMember, data: MemberAdd, service: GroupServiceDep) -> MemberRead:
    return service.add_member(member.group_id, data)


# The owner removes a member, or a member removes themself (leaves); the owner cannot leave (400).
@router.delete("/{group_id}/members/{user_id}", status_code=204)
def remove_member(member: MemberDep, user: CurrentUser, user_id: uuid.UUID, service: GroupServiceDep) -> None:
    service.remove_member(member, user, user_id)


@router.get("/{group_id}/tasks", response_model=GroupTaskPage, dependencies=[needs(Permission.GROUP_TASKS_VIEW)])
def list_group_tasks(
    service: GroupTaskServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> GroupTaskPage:
    return service.list_tasks(offset, limit)


# 422 when assignee_id is not a member of the group.
@router.post("/{group_id}/tasks", response_model=GroupTaskRead, status_code=201, dependencies=[needs(Permission.GROUP_TASKS_CREATE)])
def create_group_task(data: GroupTaskCreate, service: GroupTaskServiceDep) -> Task:
    return service.create_task(data)


@router.get("/{group_id}/tasks/{task_id}", response_model=GroupTaskRead, dependencies=[needs(Permission.GROUP_TASKS_VIEW)])
def get_group_task(task_id: uuid.UUID, service: GroupTaskServiceDep) -> Task:
    return service.get_task(task_id)


@router.patch("/{group_id}/tasks/{task_id}", response_model=GroupTaskRead, dependencies=[needs(Permission.GROUP_TASKS_UPDATE)])
def update_group_task(task_id: uuid.UUID, data: GroupTaskUpdate, service: GroupTaskServiceDep) -> Task:
    return service.update_task(service.get_task(task_id), data)


# Only the task's creator or the group owner can delete it.
@router.delete("/{group_id}/tasks/{task_id}", status_code=204)
def delete_group_task(task_id: uuid.UUID, service: GroupTaskServiceDep) -> None:
    service.delete_task(service.get_task(task_id))
