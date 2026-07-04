"""In-app notification feeds for patients and hospital staff."""
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from auth.deps import get_current_patient, require_hospital_staff
from database import get_db

router = APIRouter(prefix="/api", tags=["notifications"])


def _serialize(n: dict) -> dict:
    return {
        "id": str(n["_id"]),
        "subject": n.get("subject"),
        "body": n.get("body"),
        "read": n.get("read", False),
        "created_at": n.get("created_at").isoformat() if n.get("created_at") else None,
    }


@router.get("/patients/notifications")
async def patient_notifications(patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    # Patient notifications are addressed by their email or phone.
    ors = [{"audience": "patient", "email": patient.get("email")}]
    cursor = db.notifications.find({"$or": ors}).sort("created_at", -1).limit(50)
    return {"items": [_serialize(n) async for n in cursor]}


@router.get("/hospital/notifications")
async def hospital_notifications(staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    cursor = db.notifications.find(
        {"audience": "hospital", "email": staff.get("email")}
    ).sort("created_at", -1).limit(50)
    return {"items": [_serialize(n) async for n in cursor]}


@router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str) -> dict:
    db = get_db()
    if not ObjectId.is_valid(notif_id):
        raise HTTPException(400, "Invalid id.")
    await db.notifications.update_one({"_id": ObjectId(notif_id)}, {"$set": {"read": True}})
    return {"success": True}
