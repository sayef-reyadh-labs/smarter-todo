# The engine: which role may do what. No database and no HTTP in this file.
import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable

from app.errors import ForbiddenError
from app.rbac.permissions import Permission


# Who is acting. resource_owner_id is set when the action targets one resource that has an owner.
@dataclass(frozen=True)
class Subject:
    user_id: uuid.UUID
    role: str
    resource_owner_id: uuid.UUID | None = None


# An extra condition for one permission; it must pass in addition to the role grant.
Rule = Callable[[Subject], bool]


class Policy:
    def __init__(self) -> None:
        self._grants: dict[str, set[Permission]] = defaultdict(set)
        self._own_grants: dict[str, set[Permission]] = defaultdict(set)
        self._rules: dict[Permission, list[Rule]] = defaultdict(list)

    # The role may always use these permissions.
    def grant(self, role: str, *permissions: Permission) -> "Policy":
        self._grants[role].update(permissions)
        return self

    # The role may use these permissions only on a resource it owns (Subject.resource_owner_id == user_id).
    def grant_if_own(self, role: str, *permissions: Permission) -> "Policy":
        self._own_grants[role].update(permissions)
        return self

    # Adds a condition for a permission, e.g. "not on a banned resource"; every rule must pass.
    def require(self, permission: Permission, rule: Rule) -> "Policy":
        self._rules[permission].append(rule)
        return self

    def allows(self, subject: Subject, permission: Permission) -> bool:
        role = str(getattr(subject.role, "value", subject.role))
        granted = permission in self._grants[role]
        if not granted and permission in self._own_grants[role]:
            granted = subject.resource_owner_id == subject.user_id
        return granted and all(rule(subject) for rule in self._rules[permission])

    def authorize(self, subject: Subject, permission: Permission, message: str = "Forbidden") -> None:
        if not self.allows(subject, permission):
            raise ForbiddenError(message)
