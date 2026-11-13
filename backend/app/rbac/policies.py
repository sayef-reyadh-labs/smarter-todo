# The permission matrix: the single place that says what each role may do.
from app.rbac.permissions import Permission as P
from app.rbac.policy import Policy
from app.rbac.roles import GroupRole, SystemRole

SYSTEM_POLICY = Policy().grant(
    SystemRole.ADMIN.value,
    P.ADMIN_STATS_VIEW,
    P.ADMIN_USERS_VIEW,
    P.ADMIN_USERS_MANAGE,
    P.ADMIN_TASKS_VIEW,
    P.ADMIN_TASKS_DELETE,
    P.ADMIN_ACTIVITY_VIEW,
    P.ADMIN_GROUPS_VIEW,
    P.ADMIN_GROUPS_DELETE,
    P.ADMIN_ACTIVITY_PURGE,
    P.ADMIN_EXPORT,
)

# What a group owner may hand to individual members. Deleting tasks, renaming and members stay owner-only.
DELEGABLE_GROUP_PERMISSIONS = (P.GROUP_TASKS_CREATE, P.GROUP_TASKS_UPDATE, P.GROUP_TASKS_ASSIGN)

# Every member can read the group; creating, editing and assigning tasks are delegated per member.
_MEMBER_PERMISSIONS = (P.GROUP_VIEW, P.GROUP_MEMBERS_VIEW, P.GROUP_TASKS_VIEW)

GROUP_POLICY = (
    Policy()
    .grant(GroupRole.MEMBER.value, *_MEMBER_PERMISSIONS)
    # A member can leave (remove themself).
    .grant_if_own(GroupRole.MEMBER.value, P.GROUP_MEMBERS_REMOVE)
    .grant(
        GroupRole.OWNER.value,
        *_MEMBER_PERMISSIONS,
        *DELEGABLE_GROUP_PERMISSIONS,
        P.GROUP_RENAME,
        P.GROUP_DELETE,
        P.GROUP_MEMBERS_ADD,
        P.GROUP_MEMBERS_REMOVE,
        P.GROUP_TASKS_DELETE,
        P.GROUP_PERMISSIONS_MANAGE,
    )
)
