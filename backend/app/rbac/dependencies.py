# FastAPI wiring for system-level permissions; group permissions live in app/groups/dependencies.py.
from typing import Callable

from app.auth.dependencies import CurrentUser
from app.auth.models import AppUser
from app.rbac.permissions import Permission
from app.rbac.policies import SYSTEM_POLICY
from app.rbac.policy import Subject


# Use as Depends(require_permission(Permission.X)). The role comes from the database on every request.
def require_permission(permission: Permission) -> Callable[[CurrentUser], AppUser]:
    def check(user: CurrentUser) -> AppUser:
        SYSTEM_POLICY.authorize(Subject(user.id, user.role), permission, "Admin only")
        return user

    return check
