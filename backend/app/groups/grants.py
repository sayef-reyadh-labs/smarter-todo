# Per-member group permissions: the owner decides which delegable permissions each member has (stored as text).
from app.groups.models import GroupMember
from app.rbac import DELEGABLE_GROUP_PERMISSIONS, GROUP_POLICY, Permission, Subject


# Unknown or non-delegable values in the database are ignored, so a bad row can never grant more than intended.
def parse_grants(text: str | None) -> frozenset[Permission]:
    wanted = {value for value in (text or "").split(",") if value}
    return frozenset(p for p in DELEGABLE_GROUP_PERMISSIONS if p.value in wanted)


def format_grants(permissions: list[Permission] | frozenset[Permission]) -> str:
    return ",".join(p.value for p in DELEGABLE_GROUP_PERMISSIONS if p in permissions)


# The subject to hand to GROUP_POLICY for this member.
def member_subject(member: GroupMember, resource_owner_id=None) -> Subject:
    return Subject(member.user_id, member.role, resource_owner_id=resource_owner_id, granted=parse_grants(member.granted_permissions))


# The delegable permissions this member can use right now (the owner has all of them), for the UI.
def effective_permissions(member: GroupMember) -> list[str]:
    allowed = GROUP_POLICY.permissions_for(member_subject(member))
    return [p.value for p in DELEGABLE_GROUP_PERMISSIONS if p in allowed]
