# Business rules for groups, members and group tasks; no HTTP here, only errors from app/errors.py.
import uuid

from app.auth.models import AppUser
from app.auth.repository import UserRepository
from app.clock import utc_now
from app.errors import BadRequestError, ConflictError, NotFoundError, UnprocessableError
from app.groups.grants import effective_permissions, format_grants, member_subject
from app.groups.models import GroupMember, TaskGroup
from app.groups.repository import GroupRepository
from app.groups.schemas import (
    GroupCreate,
    GroupRead,
    GroupTaskCreate,
    GroupTaskPage,
    GroupTaskUpdate,
    GroupUpdate,
    MemberAdd,
    MemberRead,
)
from app.rbac import GROUP_POLICY, GroupRole, Permission, Subject
from app.tasks.models import Task
from app.tasks.service import check_due_date


def _group_read(group: TaskGroup, member: GroupMember) -> GroupRead:
    return GroupRead(
        id=group.id,
        name=group.name,
        created_by=group.created_by,
        my_role=member.role,
        my_permissions=effective_permissions(member),
        created_at=group.created_at,
    )


def _member_read(member: GroupMember, user: AppUser) -> MemberRead:
    return MemberRead(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=member.role,
        permissions=effective_permissions(member),
        joined_at=member.joined_at,
    )


class GroupService:
    def __init__(self, repo: GroupRepository, users: UserRepository) -> None:
        self.repo = repo
        self.users = users

    # The creator becomes the owner.
    def create_group(self, user: AppUser, data: GroupCreate) -> GroupRead:
        group = self.repo.create_group(TaskGroup(name=data.name, created_by=user.id))
        return _group_read(group, self._membership(group.id, user.id))

    def list_groups(self, user: AppUser) -> list[GroupRead]:
        return [_group_read(group, member) for group, member in self.repo.list_for_user(user.id)]

    def get_group(self, member: GroupMember) -> GroupRead:
        return _group_read(self._group(member.group_id), member)

    def rename_group(self, member: GroupMember, data: GroupUpdate) -> GroupRead:
        group = self.repo.update_group(self._group(member.group_id), {"name": data.name, "updated_at": utc_now()})
        return _group_read(group, member)

    def delete_group(self, member: GroupMember) -> None:
        self.repo.delete_group(self._group(member.group_id))

    def list_members(self, group_id: uuid.UUID) -> list[MemberRead]:
        return [_member_read(member, user) for member, user in self.repo.list_members(group_id)]

    def add_member(self, group_id: uuid.UUID, data: MemberAdd) -> MemberRead:
        user = self.users.get_by_email(data.email)
        if user is None:
            raise NotFoundError("No user with that email")
        if self.repo.get_membership(group_id, user.id) is not None:
            raise ConflictError("That user is already a member")
        member = self.repo.add_member(GroupMember(group_id=group_id, user_id=user.id, role=GroupRole.MEMBER.value))
        return _member_read(member, user)

    # The owner replaces the delegable permissions of one member; the owner row itself cannot be changed.
    def set_member_permissions(self, group_id: uuid.UUID, user_id: uuid.UUID, permissions: list[str]) -> MemberRead:
        target = self.repo.get_membership(group_id, user_id)
        user = self.users.get(user_id)
        if target is None or user is None:
            raise NotFoundError("Member not found")
        if target.role == GroupRole.OWNER:
            raise BadRequestError("The owner always has every permission")
        wanted = frozenset(Permission(p) for p in permissions)
        return _member_read(self.repo.set_grants(target, format_grants(wanted)), user)

    # The owner can remove anyone; a member can only remove themself (leave). The owner cannot leave.
    def remove_member(self, actor_member: GroupMember, actor: AppUser, user_id: uuid.UUID) -> None:
        subject = Subject(actor.id, actor_member.role, resource_owner_id=user_id)
        GROUP_POLICY.authorize(subject, Permission.GROUP_MEMBERS_REMOVE, "Group owner only")
        target = self.repo.get_membership(actor_member.group_id, user_id)
        if target is None:
            raise NotFoundError("Member not found")
        if target.role == GroupRole.OWNER:
            raise BadRequestError("The owner cannot leave; delete the group instead")
        self.repo.remove_member(target)

    def _membership(self, group_id: uuid.UUID, user_id: uuid.UUID) -> GroupMember:
        member = self.repo.get_membership(group_id, user_id)
        if member is None:
            raise NotFoundError("Group not found")
        return member

    def _group(self, group_id: uuid.UUID) -> TaskGroup:
        group = self.repo.get_group(group_id)
        if group is None:
            raise NotFoundError("Group not found")
        return group


class GroupTaskService:
    def __init__(self, repo: GroupRepository, member: GroupMember, user: AppUser) -> None:
        self.repo = repo
        self.member = member
        self.user = user
        self.group_id = member.group_id

    def list_tasks(self, offset: int, limit: int) -> GroupTaskPage:
        return GroupTaskPage(
            items=self.repo.list_tasks(self.group_id, offset, limit),
            total=self.repo.count_tasks(self.group_id),
            offset=offset,
            limit=limit,
        )

    def get_task(self, task_id: uuid.UUID) -> Task:
        task = self.repo.get_task(self.group_id, task_id)
        if task is None:
            raise NotFoundError("Task not found")
        return task

    # Creating needs the create permission (checked by the route); handing the task to someone also needs assign.
    def create_task(self, data: GroupTaskCreate) -> Task:
        if data.assignee_id is not None:
            self._authorize(Permission.GROUP_TASKS_ASSIGN, "You may not assign tasks in this group")
        check_due_date(data.due_date)
        self._check_assignee(data.assignee_id)
        task = Task.model_validate(data, update={"owner_id": self.user.id, "group_id": self.group_id})
        return self.repo.save_task(task)

    # Field level: changing the assignee needs assign, changing anything else (including done) needs update.
    def update_task(self, task: Task, data: GroupTaskUpdate) -> Task:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            return task
        if "assignee_id" in changes:
            self._authorize(Permission.GROUP_TASKS_ASSIGN, "You may not assign tasks in this group")
        if set(changes) - {"assignee_id"}:
            self._authorize(Permission.GROUP_TASKS_UPDATE, "You may not edit tasks in this group")
        if "due_date" in changes:
            check_due_date(changes["due_date"])
        if "assignee_id" in changes:
            self._check_assignee(changes["assignee_id"])
        task.sqlmodel_update({**changes, "updated_at": utc_now()})
        return self.repo.save_task(task)

    # Only the group owner can delete tasks; it cannot be delegated.
    def delete_task(self, task: Task) -> None:
        self._authorize(Permission.GROUP_TASKS_DELETE, "Only the group owner can delete tasks")
        self.repo.delete_task(task)

    def _authorize(self, permission: Permission, message: str) -> None:
        GROUP_POLICY.authorize(member_subject(self.member), permission, message)

    def _check_assignee(self, assignee_id: uuid.UUID | None) -> None:
        if assignee_id is not None and self.repo.get_membership(self.group_id, assignee_id) is None:
            raise UnprocessableError("assignee_id must be a member of the group")
