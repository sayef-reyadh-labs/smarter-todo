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
)

_MEMBER_PERMISSIONS = (
    P.GROUP_VIEW,
    P.GROUP_MEMBERS_VIEW,
    P.GROUP_TASKS_VIEW,
    P.GROUP_TASKS_CREATE,
    P.GROUP_TASKS_UPDATE,
)

GROUP_POLICY = (
    Policy()
    .grant(GroupRole.MEMBER.value, *_MEMBER_PERMISSIONS)
    # A member can leave (remove themself) and delete tasks they created.
    .grant_if_own(GroupRole.MEMBER.value, P.GROUP_MEMBERS_REMOVE, P.GROUP_TASKS_DELETE)
    .grant(
        GroupRole.OWNER.value,
        *_MEMBER_PERMISSIONS,
        P.GROUP_RENAME,
        P.GROUP_DELETE,
        P.GROUP_MEMBERS_ADD,
        P.GROUP_MEMBERS_REMOVE,
        P.GROUP_TASKS_DELETE,
    )
)
