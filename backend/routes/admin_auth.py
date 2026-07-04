"""Platform super-admin authentication (single seeded account from .env)."""
import secrets

from fastapi import APIRouter, Depends, HTTPException, status

from auth.deps import require_superadmin
from auth.security import create_access_token
from config import settings
from logging_config import get_logger
from models.auth import AdminLoginRequest, TokenResponse, UserPublic

router = APIRouter(prefix="/api/superadmin", tags=["superadmin-auth"])
log = get_logger("superadmin")


@router.post("/login", response_model=TokenResponse)
async def superadmin_login(payload: AdminLoginRequest) -> TokenResponse:
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Super admin login is not configured. Set ADMIN_EMAIL/ADMIN_PASSWORD in .env.",
        )
    email_ok = secrets.compare_digest(payload.email.lower(), settings.ADMIN_EMAIL.lower())
    pw_ok = secrets.compare_digest(payload.password, settings.ADMIN_PASSWORD)
    if not (email_ok and pw_ok):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials.")

    token = create_access_token(sub=settings.ADMIN_EMAIL.lower(), role="superadmin")
    log.info("Super admin logged in: %s", settings.ADMIN_EMAIL)
    return TokenResponse(
        access_token=token,
        role="superadmin",
        user=UserPublic(email=settings.ADMIN_EMAIL.lower(), name="Super Admin", role="superadmin"),
    )


@router.get("/me", response_model=UserPublic)
async def superadmin_me(admin: dict = Depends(require_superadmin)) -> UserPublic:
    return UserPublic(email=admin["email"], name="Super Admin", role="superadmin")
