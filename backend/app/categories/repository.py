# Data access for categories; every query is limited to one owner, so nobody can touch another user's categories.
import uuid

from sqlmodel import Session, col, func, select, update

from app.categories.models import Category
from app.tasks.models import Task


class CategoryRepository:
    def __init__(self, session: Session, owner_id: uuid.UUID) -> None:
        self.session = session
        self.owner_id = owner_id

    # Each row is (category, number of personal tasks in it), alphabetical.
    def list_with_counts(self) -> list[tuple[Category, int]]:
        counts = (
            select(func.count(Task.id))
            .where(Task.category_id == Category.id, col(Task.group_id).is_(None))
            .scalar_subquery()
        )
        statement = select(Category, counts).where(Category.owner_id == self.owner_id).order_by(func.lower(Category.name))
        return [(category, n) for category, n in self.session.exec(statement).all()]

    def count(self) -> int:
        return self.session.exec(select(func.count()).select_from(Category).where(Category.owner_id == self.owner_id)).one()

    def get(self, category_id: uuid.UUID) -> Category | None:
        return self.session.exec(select(Category).where(Category.id == category_id, Category.owner_id == self.owner_id)).first()

    # Names are unique per owner ignoring case.
    def find_by_name(self, name: str) -> Category | None:
        statement = select(Category).where(Category.owner_id == self.owner_id, func.lower(Category.name) == name.lower())
        return self.session.exec(statement).first()

    def create(self, category: Category) -> Category:
        self.session.add(category)
        self.session.commit()
        self.session.refresh(category)
        return category

    def rename(self, category: Category, name: str) -> Category:
        category.name = name
        self.session.add(category)
        self.session.commit()
        self.session.refresh(category)
        return category

    # The tasks stay, uncategorized.
    def delete(self, category: Category) -> None:
        self.session.exec(update(Task).where(Task.category_id == category.id).values(category_id=None))
        self.session.delete(category)
        self.session.commit()

    def task_count(self, category_id: uuid.UUID) -> int:
        statement = select(func.count()).select_from(Task).where(Task.category_id == category_id, col(Task.group_id).is_(None))
        return self.session.exec(statement).one()
