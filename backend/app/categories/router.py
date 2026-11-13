# HTTP layer for /api/v1/categories: your own labels for personal tasks.
import uuid
from http import HTTPStatus

from fastapi import APIRouter

from app.activity.actions import ActivityAction
from app.activity.dependencies import UserActivityDep
from app.categories.dependencies import CategoryServiceDep
from app.categories.schemas import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(service: CategoryServiceDep) -> list[CategoryRead]:
    return service.list_categories()


# 409 for a duplicate name (ignoring case) or when the limit is reached.
@router.post("", response_model=CategoryRead, status_code=HTTPStatus.CREATED)
def create_category(data: CategoryCreate, service: CategoryServiceDep, activity: UserActivityDep) -> CategoryRead:
    category = service.create(data)
    activity.log(ActivityAction.CATEGORY_CREATED, entity_type="category", entity_id=category.id, detail=category.name)
    return category


@router.patch("/{category_id}", response_model=CategoryRead)
def rename_category(category_id: uuid.UUID, data: CategoryUpdate, service: CategoryServiceDep, activity: UserActivityDep) -> CategoryRead:
    category = service.rename(category_id, data)
    activity.log(ActivityAction.CATEGORY_RENAMED, entity_type="category", entity_id=category.id, detail=category.name)
    return category


# The tasks that used the category stay, with no category.
@router.delete("/{category_id}", status_code=HTTPStatus.NO_CONTENT)
def delete_category(category_id: uuid.UUID, service: CategoryServiceDep, activity: UserActivityDep) -> None:
    category = service.delete(category_id)
    activity.log(ActivityAction.CATEGORY_DELETED, entity_type="category", entity_id=category.id, detail=category.name)
