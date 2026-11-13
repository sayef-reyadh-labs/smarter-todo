# Per-request wiring for categories: session + logged-in user -> repository -> service.
from typing import Annotated

from fastapi import Depends

from app.auth.dependencies import CurrentUser
from app.categories.repository import CategoryRepository
from app.categories.service import CategoryService
from app.database import SessionDep


def get_category_service(session: SessionDep, user: CurrentUser) -> CategoryService:
    return CategoryService(CategoryRepository(session, user.id))


CategoryServiceDep = Annotated[CategoryService, Depends(get_category_service)]
