# The roles a user can have. The database stores the plain string values.
from enum import Enum


# Account-wide role, stored in app_user.role.
class SystemRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


# Role inside one group, stored in group_member.role.
class GroupRole(str, Enum):
    OWNER = "owner"
    MEMBER = "member"
