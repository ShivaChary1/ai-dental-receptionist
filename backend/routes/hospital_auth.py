"""Hospital staff authentication."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from auth.deps import require_hospital_staff
from auth.security import create_access_token, verify_password
from database import get_db
from logging_config import get_logger
from models.auth import LoginRequest, TokenResponse, UserPublic
from models.hospital_staff import serialize_staff

router = APIRouter(prefix="/api/hospital", tags=["hospital-auth"])
log = get_logger("hospital-auth")


@router.post("/login", response_model=TokenResponse)
async def hospital_login(payload: LoginRequest) -> TokenResponse:
    db = get_db()
    staff = await db.hospital_staff_users.find_one({"email": payload.email.lower()})
    if not staff or not verify_password(payload.password, staff.get("password_hash", "")):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")
    await db.hospital_staff_users.update_one(
        {"_id": staff["_id"]}, {"$set": {"last_login": datetime.utcnow()}}
    )
    public = serialize_staff(staff)
    token = create_access_token(sub=public["id"], role="hospital",
                                extra={"hospital_id": public["hospital_id"]})
    log.info("Hospital staff logged in: %s (hospital %s)", public["email"], public["hospital_id"])
    return TokenResponse(access_token=token, role="hospital", user=UserPublic(**{
        "id": public["id"], "email": public["email"], "name": public["name"], "role": "hospital",
    }))


@router.get("/me", response_model=UserPublic)
async def hospital_me(staff: dict = Depends(require_hospital_staff)) -> UserPublic:
    return UserPublic(id=staff["id"], email=staff["email"], name=staff["name"], role="hospital")
