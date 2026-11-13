# Everything the activity log can record. The log stores the plain string value.
from enum import Enum


class ActivityAction(str, Enum):
    SIGNUP = "signup"
    LOGIN = "login"
    LOGIN_FAILED = "login_failed"
    LOGIN_LOCKED = "login_locked"
    LOGIN_BLOCKED = "login_blocked"  # correct password but the account is banned
    LOGOUT = "logout"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_CHANGE_FAILED = "password_change_failed"
    PROFILE_UPDATED = "profile_updated"

    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_DELETED = "task_deleted"

    GROUP_CREATED = "group_created"
    GROUP_RENAMED = "group_renamed"
    GROUP_DELETED = "group_deleted"
    MEMBER_ADDED = "member_added"
    MEMBER_REMOVED = "member_removed"
    MEMBER_LEFT = "member_left"
    GROUP_TASK_CREATED = "group_task_created"
    GROUP_TASK_UPDATED = "group_task_updated"
    GROUP_TASK_DELETED = "group_task_deleted"

    ROLE_CHANGED = "role_changed"
    USER_BANNED = "user_banned"
    USER_UNBANNED = "user_unbanned"
    ADMIN_TASK_DELETED = "admin_task_deleted"
