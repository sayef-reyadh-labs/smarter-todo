# HTTP layer for /api/v1/groups: groups, members and group tasks. Outsiders get 404, members without the RBAC permission get 403.
import uuid
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.activity.actions import ActivityAction
from app.activity.dependencies import UserActivityDep
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
    MemberPermissionsUpdate,
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
CanManagePermissions = Annotated[GroupMember, needs(Permission.GROUP_PERMISSIONS_MANAGE)]


# Create a group; the caller becomes its owner.
@router.post("", response_model=GroupRead, status_code=HTTPStatus.CREATED)
def create_group(data: GroupCreate, user: CurrentUser, service: GroupServiceDep, activity: UserActivityDep) -> GroupRead:
    group = service.create_group(user, data)
    activity.log(ActivityAction.GROUP_CREATED, entity_type="group", entity_id=group.id, detail=group.name)
    return group


# The groups the caller belongs to.
@router.get("", response_model=list[GroupRead])
def list_groups(user: CurrentUser, service: GroupServiceDep) -> list[GroupRead]:
    return service.list_groups(user)


@router.get("/{group_id}", response_model=GroupRead, dependencies=[needs(Permission.GROUP_VIEW)])
def get_group(member: MemberDep, service: GroupServiceDep) -> GroupRead:
    return service.get_group(member)


@router.patch("/{group_id}", response_model=GroupRead)
def rename_group(member: CanRename, data: GroupUpdate, service: GroupServiceDep, activity: UserActivityDep) -> GroupRead:
    group = service.rename_group(member, data)
    activity.log(ActivityAction.GROUP_RENAMED, entity_type="group", entity_id=group.id, detail=group.name)
    return group


# Deleting a group also deletes its tasks and memberships.
@router.delete("/{group_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_group(member: CanDelete, service: GroupServiceDep, activity: UserActivityDep) -> None:
    group_id, name = member.group_id, service.get_group(member).name
    service.delete_group(member)
    activity.log(ActivityAction.GROUP_DELETED, entity_type="group", entity_id=group_id, detail=name)


@router.get("/{group_id}/members", response_model=list[MemberRead], dependencies=[needs(Permission.GROUP_MEMBERS_VIEW)])
def list_members(member: MemberDep, service: GroupServiceDep) -> list[MemberRead]:
    return service.list_members(member.group_id)


# Add a member by email: 404 for an unknown email, 409 if they are already in the group.
@router.post("/{group_id}/members", response_model=MemberRead, status_code=HTTPStatus.CREATED)
def add_member(member: CanAddMember, data: MemberAdd, service: GroupServiceDep, activity: UserActivityDep) -> MemberRead:
    added = service.add_member(member.group_id, data)
    activity.log(ActivityAction.MEMBER_ADDED, entity_type="user", entity_id=added.user_id, detail=added.email)
    return added


# The owner decides what a member may do with tasks: send the full list of delegable permissions.
# Deleting tasks is never delegable. 400 for the owner's own row, 404 for a non-member.
@router.patch("/{group_id}/members/{user_id}/permissions", response_model=MemberRead)
def set_member_permissions(
    member: CanManagePermissions, user_id: uuid.UUID, data: MemberPermissionsUpdate, service: GroupServiceDep, activity: UserActivityDep
) -> MemberRead:
    updated = service.set_member_permissions(member.group_id, user_id, list(data.permissions))
    shown = ", ".join(p.removeprefix("group:tasks:") for p in updated.permissions) or "read only"
    activity.log(ActivityAction.MEMBER_PERMISSIONS_CHANGED, entity_type="user", entity_id=user_id, detail=f"{updated.email}: {shown}")
    return updated


# The owner removes a member, or a member removes themself (leaves); the owner cannot leave (400).
@router.delete("/{group_id}/members/{user_id}", status_code=HTTPStatus.NO_CONTENT)
def remove_member(member: MemberDep, user: CurrentUser, user_id: uuid.UUID, service: GroupServiceDep, activity: UserActivityDep) -> None:
    group_name = service.get_group(member).name
    service.remove_member(member, user, user_id)
    action = ActivityAction.MEMBER_LEFT if user_id == user.id else ActivityAction.MEMBER_REMOVED
    activity.log(action, entity_type="user", entity_id=user_id, detail=f"group {group_name}")


@router.get("/{group_id}/tasks", response_model=GroupTaskPage, dependencies=[needs(Permission.GROUP_TASKS_VIEW)])
def list_group_tasks(
    service: GroupTaskServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> GroupTaskPage:
    return service.list_tasks(offset, limit)


# 422 when assignee_id is not a member of the group.
@router.post("/{group_id}/tasks", response_model=GroupTaskRead, status_code=HTTPStatus.CREATED, dependencies=[needs(Permission.GROUP_TASKS_CREATE)])
def create_group_task(data: GroupTaskCreate, service: GroupTaskServiceDep, activity: UserActivityDep) -> Task:
    task = service.create_task(data)
    activity.log(ActivityAction.GROUP_TASK_CREATED, entity_type="task", entity_id=task.id, detail=task.title)
    return task


@router.get("/{group_id}/tasks/{task_id}", response_model=GroupTaskRead, dependencies=[needs(Permission.GROUP_TASKS_VIEW)])
def get_group_task(task_id: uuid.UUID, service: GroupTaskServiceDep) -> Task:
    return service.get_task(task_id)


@router.patch("/{group_id}/tasks/{task_id}", response_model=GroupTaskRead)
def update_group_task(task_id: uuid.UUID, data: GroupTaskUpdate, service: GroupTaskServiceDep, activity: UserActivityDep) -> Task:
    task = service.update_task(service.get_task(task_id), data)
    activity.log(ActivityAction.GROUP_TASK_UPDATED, entity_type="task", entity_id=task.id, detail=task.title)
    return task


# Only the task's creator or the group owner can delete it.
@router.delete("/{group_id}/tasks/{task_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_group_task(task_id: uuid.UUID, service: GroupTaskServiceDep, activity: UserActivityDep) -> None:
    task = service.get_task(task_id)
    title = task.title
    service.delete_task(task)
    activity.log(ActivityAction.GROUP_TASK_DELETED, entity_type="task", entity_id=task_id, detail=title)
