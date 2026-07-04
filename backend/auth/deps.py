"""FastAPI auth dependencies (Bearer token → current user / admin)."""
from typing import Optional

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.security import decode_token
from database import get_db
from models.user import serialize_user

# auto_error=False lets us build an "optional" dependency for the public chat.
_bearer = HTTPBearer(auto_error=False)


async def _user_from_claims(claims: dict) -> Optional[dict]:
    if claims.get("role") != "patient":
        return None
    sub = claims.get("sub")
    if not sub or not ObjectId.is_valid(sub):
        return None
    db = get_db()
    doc = await db.users.find_one({"_id": ObjectId(sub)})
    return serialize_user(doc) if doc else None


async def optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict]:
    """Return the logged-in patient, or None. Never raises — used by public chat."""
    if not creds:
        return None
    claims = decode_token(creds.credentials)
    if not claims:
        return None
    return await _user_from_claims(claims)


async def get_current_patient(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """Require a valid patient token; 401 otherwise."""
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated.")
    claims = decode_token(creds.credentials)
    if not claims:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    user = await _user_from_claims(claims)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found.")
    return user


def _require_claims(creds: Optional[HTTPAuthorizationCredentials]) -> dict:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated.")
    claims = decode_token(creds.credentials)
    if not claims:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    return claims


async def require_superadmin(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """Require the platform super-admin token."""
    claims = _require_claims(creds)
    if claims.get("role") != "superadmin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Super admin access required.")
    return {"email": claims.get("sub"), "role": "superadmin"}


# Backwards-compatible alias: the existing single-tenant dashboard/knowledge routes
# use require_admin. The seeded .env account is now the super admin, so accept it.
async def require_admin(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    claims = _require_claims(creds)
    if claims.get("role") not in ("admin", "superadmin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required.")
    return {"email": claims.get("sub"), "role": claims.get("role")}


async def require_hospital_staff(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """Require a hospital-staff token; returns the staff doc + hospital_id."""
    claims = _require_claims(creds)
    if claims.get("role") != "hospital":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Hospital staff access required.")
    sub = claims.get("sub")
    if not sub or not ObjectId.is_valid(sub):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token.")
    db = get_db()
    staff = await db.hospital_staff_users.find_one({"_id": ObjectId(sub)})
    if not staff:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Staff account not found.")
    return {
        "id": str(staff["_id"]),
        "email": staff.get("email"),
        "name": staff.get("name"),
        "hospital_id": str(staff.get("hospital_id")),
        "role": "hospital",
    }
