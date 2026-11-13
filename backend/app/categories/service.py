# Business rules for categories: unique names per user, at most MAX_CATEGORIES each; no HTTP here.
import uuid

from app.categories.models import Category
from app.categories.repository import CategoryRepository
from app.categories.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from app.errors import ConflictError, NotFoundError

MAX_CATEGORIES = 30


class CategoryService:
    def __init__(self, repo: CategoryRepository) -> None:
        self.repo = repo

    def list_categories(self) -> list[CategoryRead]:
        return [self._read(category, n) for category, n in self.repo.list_with_counts()]

    def create(self, data: CategoryCreate) -> CategoryRead:
        if self.repo.find_by_name(data.name) is not None:
            raise ConflictError("You already have a category with that name")
        if self.repo.count() >= MAX_CATEGORIES:
            raise ConflictError(f"You can have at most {MAX_CATEGORIES} categories")
        category = self.repo.create(Category(owner_id=self.repo.owner_id, name=data.name))
        return self._read(category, 0)

    def rename(self, category_id: uuid.UUID, data: CategoryUpdate) -> CategoryRead:
        category = self._get(category_id)
        existing = self.repo.find_by_name(data.name)
        if existing is not None and existing.id != category.id:
            raise ConflictError("You already have a category with that name")
        category = self.repo.rename(category, data.name)
        return self._read(category, self.repo.task_count(category.id))

    def delete(self, category_id: uuid.UUID) -> Category:
        category = self._get(category_id)
        self.repo.delete(category)
        return category

    def _get(self, category_id: uuid.UUID) -> Category:
        category = self.repo.get(category_id)
        if category is None:
            raise NotFoundError("Category not found")
        return category

    @staticmethod
    def _read(category: Category, task_count: int) -> CategoryRead:
        return CategoryRead(id=category.id, name=category.name, task_count=task_count, created_at=category.created_at)
