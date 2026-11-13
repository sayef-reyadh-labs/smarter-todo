# Data access layer for groups, members and group tasks: every query lives here, called by the services.
import uuid

from sqlmodel import Session, func, select, update

from app.auth.models import AppUser
from app.groups.models import GroupMember, TaskGroup
from app.rbac import GroupRole
from app.tasks.models import Task


class GroupRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    # --- groups and members ---

    # The group and its owner membership are saved together, so a group never exists without an owner.
    def create_group(self, group: TaskGroup) -> TaskGroup:
        self.session.add(group)
        self.session.flush()  # the group row must exist before the membership that points to it
        self.session.add(GroupMember(group_id=group.id, user_id=group.created_by, role=GroupRole.OWNER.value))
        self.session.commit()
        self.session.refresh(group)
        return group

    def list_for_user(self, user_id: uuid.UUID) -> list[tuple[TaskGroup, GroupMember]]:
        statement = (
            select(TaskGroup, GroupMember)
            .join(GroupMember, GroupMember.group_id == TaskGroup.id)
            .where(GroupMember.user_id == user_id)
            .order_by(TaskGroup.created_at.desc(), TaskGroup.id.desc())
        )
        return [(group, member) for group, member in self.session.exec(statement).all()]

    def get_group(self, group_id: uuid.UUID) -> TaskGroup | None:
        return self.session.get(TaskGroup, group_id)

    def get_membership(self, group_id: uuid.UUID, user_id: uuid.UUID) -> GroupMember | None:
        return self.session.get(GroupMember, (group_id, user_id))

    def update_group(self, group: TaskGroup, patch: dict) -> TaskGroup:
        group.sqlmodel_update(patch)
        self.session.add(group)
        self.session.commit()
        self.session.refresh(group)
        return group

    # The database cascades the delete to the group's members and tasks.
    def delete_group(self, group: TaskGroup) -> None:
        self.session.delete(group)
        self.session.commit()

    def list_members(self, group_id: uuid.UUID) -> list[tuple[GroupMember, AppUser]]:
        statement = (
            select(GroupMember, AppUser)
            .join(AppUser, AppUser.id == GroupMember.user_id)
            .where(GroupMember.group_id == group_id)
            .order_by(GroupMember.joined_at, AppUser.email)
        )
        return [(member, user) for member, user in self.session.exec(statement).all()]

    def add_member(self, member: GroupMember) -> GroupMember:
        self.session.add(member)
        self.session.commit()
        self.session.refresh(member)
        return member

    def set_grants(self, member: GroupMember, granted_permissions: str) -> GroupMember:
        member.granted_permissions = granted_permissions
        self.session.add(member)
        self.session.commit()
        self.session.refresh(member)
        return member

    # Their tasks in this group stay, but become unassigned.
    def remove_member(self, member: GroupMember) -> None:
        self.session.exec(
            update(Task)
            .where(Task.group_id == member.group_id, Task.assignee_id == member.user_id)
            .values(assignee_id=None)
        )
        self.session.delete(member)
        self.session.commit()

    # --- group tasks ---

    def list_tasks(self, group_id: uuid.UUID, offset: int, limit: int) -> list[Task]:
        statement = (
            select(Task)
            .where(Task.group_id == group_id)
            .order_by(Task.created_at.desc(), Task.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def count_tasks(self, group_id: uuid.UUID) -> int:
        return self.session.exec(select(func.count()).select_from(Task).where(Task.group_id == group_id)).one()

    def get_task(self, group_id: uuid.UUID, task_id: uuid.UUID) -> Task | None:
        return self.session.exec(select(Task).where(Task.id == task_id, Task.group_id == group_id)).first()

    def save_task(self, task: Task) -> Task:
        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)
        return task

    def delete_task(self, task: Task) -> None:
        self.session.delete(task)
        self.session.commit()
