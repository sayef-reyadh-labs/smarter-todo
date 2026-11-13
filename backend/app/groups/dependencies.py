# Per-request wiring for groups: membership checks (404 for outsiders), RBAC permission checks (403) and the services.
import uuid
from typing import Annotated, Callable

from fastapi import Depends

from app.auth.dependencies import CurrentUser
from app.auth.repository import UserRepository
from app.database import SessionDep
from app.errors import NotFoundError
from app.groups.models import GroupMember
from app.groups.repository import GroupRepository
from app.groups.service import GroupService, GroupTaskService
from app.rbac import GROUP_POLICY, Permission, Subject


# A group the caller is not in answers 404, so its existence is not revealed.
def get_membership(group_id: uuid.UUID, user: CurrentUser, session: SessionDep) -> GroupMember:
    member = GroupRepository(session).get_membership(group_id, user.id)
    if member is None:
        raise NotFoundError("Group not found")
    return member


MemberDep = Annotated[GroupMember, Depends(get_membership)]


# Use as Depends(require_group_permission(Permission.X)); runs after the membership check.
def require_group_permission(permission: Permission) -> Callable[[MemberDep], GroupMember]:
    def check(member: MemberDep) -> GroupMember:
        GROUP_POLICY.authorize(Subject(member.user_id, member.role), permission, "Group owner only")
        return member

    return check


def get_group_service(session: SessionDep) -> GroupService:
    return GroupService(GroupRepository(session), UserRepository(session))


GroupServiceDep = Annotated[GroupService, Depends(get_group_service)]


def get_group_task_service(session: SessionDep, member: MemberDep, user: CurrentUser) -> GroupTaskService:
    return GroupTaskService(GroupRepository(session), member, user)


GroupTaskServiceDep = Annotated[GroupTaskService, Depends(get_group_task_service)]
