# Passwords (Argon2), access tokens (JWT) and refresh tokens; no database and no HTTP in this file.
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from functools import cache

import jwt
from pwdlib import PasswordHash

from app.config import settings

ALGORITHM = "HS256"

# Argon2 is deliberately slow and adds a random salt, so equal passwords get different hashes.
_hasher = PasswordHash.recommended()

# Stored hashes are "v1$<argon2 hash of HMAC-SHA256(pepper, password)>"; older ones are plain Argon2.
_PEPPERED_PREFIX = "v1$"


def _peppered(password: str) -> str:
    return hmac.new(settings.password_pepper.encode(), password.encode(), hashlib.sha256).hexdigest()


def hash_password(password: str) -> str:
    return _PEPPERED_PREFIX + _hasher.hash(_peppered(password))


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith(_PEPPERED_PREFIX):
        return _hasher.verify(_peppered(password), password_hash[len(_PEPPERED_PREFIX) :])
    return _hasher.verify(password, password_hash)


# True for hashes made before the pepper existed; login replaces them after a correct password.
def password_needs_upgrade(password_hash: str) -> bool:
    return not password_hash.startswith(_PEPPERED_PREFIX)


@cache
def _dummy_hash() -> str:
    return hash_password("not-a-real-password")


# Login calls this for an unknown email so it takes as long as a wrong password and reveals nothing.
def verify_against_dummy(password: str) -> None:
    verify_password(password, _dummy_hash())


# Access token: a signed JWT the client sends as "Authorization: Bearer <token>". It expires quickly.
def create_access_token(user_id: uuid.UUID, role: str) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(claims, settings.jwt_secret, algorithm=ALGORITHM)


# Raises jwt.PyJWTError when the signature is wrong or the token has expired.
def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM], options={"require": ["sub", "exp"]})


# Refresh token: a random string, not a JWT, so the server can revoke it. Only its hash is stored.
def new_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
