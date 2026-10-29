# Data access layer for accounts and refresh tokens: every query lives here, called by the services.
import uuid

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select, update

from app.auth.models import AppUser, RefreshToken
from app.clock import utc_now
from app.errors import ConflictError


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, user_id: uuid.UUID) -> AppUser | None:
        return self.session.get(AppUser, user_id)

    def get_by_email(self, email: str) -> AppUser | None:
        return self.session.exec(select(AppUser).where(AppUser.email == email)).first()

    def create(self, user: AppUser) -> AppUser:
        self.session.add(user)
        try:
            self.session.commit()
        except IntegrityError:
            # Two signups with the same email at the same moment: the unique index lets only one win.
            self.session.rollback()
            raise ConflictError("Email already registered")
        self.session.refresh(user)
        return user

    def update(self, user: AppUser, patch: dict) -> AppUser:
        user.sqlmodel_update(patch)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user


class RefreshTokenRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, token: RefreshToken) -> RefreshToken:
        self.session.add(token)
        self.session.commit()
        return token

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self.session.exec(select(RefreshToken).where(RefreshToken.token_hash == token_hash)).first()

    def revoke(self, token: RefreshToken) -> None:
        token.revoked_at = utc_now()
        self.session.add(token)
        self.session.commit()

    # Used on password change, and when a revoked token is presented again (it was probably stolen).
    def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        statement = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, col(RefreshToken.revoked_at).is_(None))
            .values(revoked_at=utc_now())
        )
        self.session.exec(statement)
        self.session.commit()
