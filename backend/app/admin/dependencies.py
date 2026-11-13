# Per-request wiring for the admin endpoints: session -> repositories -> service.
from typing import Annotated

from fastapi import Depends

from app.admin.repository import AdminRepository
from app.admin.service import AdminService
from app.activity.repository import ActivityRepository
from app.auth.repository import RefreshTokenRepository
from app.database import SessionDep


def get_admin_service(session: SessionDep) -> AdminService:
    return AdminService(AdminRepository(session), RefreshTokenRepository(session), ActivityRepository(session))


AdminServiceDep = Annotated[AdminService, Depends(get_admin_service)]
