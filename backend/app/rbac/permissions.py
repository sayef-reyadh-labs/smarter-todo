# Every action that needs permission. A new feature adds a member here and grants it in policies.py.
from enum import Enum


class Permission(str, Enum):
    # System level (checked against app_user.role)
    ADMIN_STATS_VIEW = "admin:stats:view"
    ADMIN_USERS_VIEW = "admin:users:view"
    ADMIN_USERS_MANAGE = "admin:users:manage"  # change role, ban, unban
    ADMIN_TASKS_VIEW = "admin:tasks:view"
    ADMIN_TASKS_DELETE = "admin:tasks:delete"
    ADMIN_ACTIVITY_VIEW = "admin:activity:view"
    ADMIN_GROUPS_VIEW = "admin:groups:view"
    ADMIN_GROUPS_DELETE = "admin:groups:delete"
    ADMIN_ACTIVITY_PURGE = "admin:activity:purge"
    ADMIN_EXPORT = "admin:export"

    # Group level (checked against group_member.role)
    GROUP_VIEW = "group:view"
    GROUP_RENAME = "group:rename"
    GROUP_DELETE = "group:delete"
    GROUP_MEMBERS_VIEW = "group:members:view"
    GROUP_MEMBERS_ADD = "group:members:add"
    GROUP_MEMBERS_REMOVE = "group:members:remove"
    GROUP_TASKS_VIEW = "group:tasks:view"
    GROUP_TASKS_CREATE = "group:tasks:create"
    GROUP_TASKS_UPDATE = "group:tasks:update"  # edit a task and mark it done or open
    GROUP_TASKS_ASSIGN = "group:tasks:assign"  # change who a task is assigned to
    GROUP_TASKS_DELETE = "group:tasks:delete"
    GROUP_PERMISSIONS_MANAGE = "group:permissions:manage"  # decide what each member may do
