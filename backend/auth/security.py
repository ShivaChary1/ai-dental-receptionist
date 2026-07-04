"""Password/OTP hashing and JWT creation/verification."""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
import jwt

from config import settings
from logging_config import get_logger

log = get_logger("auth")


def _to_bytes(secret: str) -> bytes:
    # bcrypt only uses the first 72 bytes; truncate to stay within its limit.
    return secret.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(password), hashed.encode("utf-8"))
    except Exception:
        return False


# OTP codes are short; hash them the same way so they're never stored in plaintext.
def hash_otp(code: str) -> str:
    return hash_password(code)


def verify_otp(code: str, hashed: str) -> bool:
    return verify_password(code, hashed)


def create_access_token(sub: str, role: str, extra: Optional[dict] = None) -> str:
    """Sign a JWT. `sub` is the user id (or admin email); `role` is patient|admin."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": sub,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


def decode_token(token: str) -> Optional[dict]:
    """Return the decoded claims, or None if invalid/expired."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except jwt.PyJWTError as exc:
        log.info("JWT decode failed: %s", exc)
        return None
