# Request shapes for the profile endpoints; the response is UserRead from the auth schemas.
from sqlmodel import SQLModel

from app.auth.schemas import Name, NewPassword


# Only the name can be changed; the email is the login and stays fixed.
class ProfileUpdate(SQLModel):
    name: Name


class PasswordChange(SQLModel):
    current_password: str
    new_password: NewPassword
