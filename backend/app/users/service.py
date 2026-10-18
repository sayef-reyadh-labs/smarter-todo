# Business rules for the logged-in user's profile; no HTTP here.
from app.auth.models import AppUser
from app.auth.repository import RefreshTokenRepository, UserRepository
from app.clock import utc_now
from app.errors import BadRequestError
from app.security import hash_password, verify_password
from app.users.schemas import PasswordChange, ProfileUpdate


class UserService:
    def __init__(self, users: UserRepository, tokens: RefreshTokenRepository) -> None:
        self.users = users
        self.tokens = tokens

    def update_profile(self, user: AppUser, data: ProfileUpdate) -> AppUser:
        return self.users.update(user, {"name": data.name, "updated_at": utc_now()})

    # Every login session is revoked, so the user (and anyone who had the old password) must log in again.
    def change_password(self, user: AppUser, data: PasswordChange) -> None:
        if not verify_password(data.current_password, user.password_hash):
            raise BadRequestError("Current password is incorrect")
        self.users.update(user, {"password_hash": hash_password(data.new_password), "updated_at": utc_now()})
        self.tokens.revoke_all_for_user(user.id)
