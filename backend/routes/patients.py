"""Patient SaaS: profile management and favorites."""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.deps import get_current_patient
from database import get_db
from models.hospital import serialize_hospital

router = APIRouter(prefix="/api/patients", tags=["patients"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    medical_notes: Optional[str] = None
    location: Optional[dict] = None  # {lat, lng}
    # Personal
    date_of_birth: Optional[str] = None  # ISO date
    gender: Optional[str] = None
    address: Optional[str] = None
    # Health profile
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    conditions: Optional[str] = None
    last_dental_visit: Optional[str] = None  # ISO date
    # Emergency contact + insurance
    emergency_contact: Optional[dict] = None  # {name, phone, relation}
    insurance: Optional[dict] = None  # {provider, policy_number}


_PROFILE_FIELDS = (
    "email", "phone", "name", "medical_notes", "location",
    "date_of_birth", "gender", "address",
    "blood_group", "allergies", "medications", "conditions", "last_dental_visit",
    "emergency_contact", "insurance",
)


def _profile(user: dict) -> dict:
    out = {field: user.get(field) for field in _PROFILE_FIELDS}
    out["id"] = str(user["_id"])
    out["favorites"] = [str(f) for f in user.get("favorites", [])]
    return out


@router.get("/me")
async def get_profile(patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(patient["id"])})
    if not user:
        raise HTTPException(404, "Account not found.")
    return _profile(user)


@router.put("/me")
async def update_profile(payload: ProfileUpdate, patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    await db.users.update_one({"_id": ObjectId(patient["id"])}, {"$set": update})
    user = await db.users.find_one({"_id": ObjectId(patient["id"])})
    return _profile(user)


@router.post("/favorites/{hospital_id}")
async def toggle_favorite(hospital_id: str, patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(400, "Invalid id.")
    user = await db.users.find_one({"_id": ObjectId(patient["id"])})
    favorites = [str(f) for f in user.get("favorites", [])]
    if hospital_id in favorites:
        favorites.remove(hospital_id)
        favorited = False
    else:
        favorites.append(hospital_id)
        favorited = True
    await db.users.update_one(
        {"_id": ObjectId(patient["id"])},
        {"$set": {"favorites": [ObjectId(f) for f in favorites]}},
    )
    return {"favorited": favorited, "favorites": favorites}


@router.get("/favorites")
async def list_favorites(patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(patient["id"])})
    ids = user.get("favorites", [])
    if not ids:
        return {"items": []}
    cursor = db.hospitals.find({"_id": {"$in": ids}, "status": "active"})
    return {"items": [serialize_hospital(h) async for h in cursor]}
