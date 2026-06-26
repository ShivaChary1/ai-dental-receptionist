"""Thin appointments read endpoints (also surfaced for general use)."""
from fastapi import APIRouter, HTTPException

from database import get_db
from models.appointment import serialize

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.get("/by-phone/{phone}")
async def appointments_by_phone(phone: str) -> dict:
    db = get_db()
    cursor = db.appointments.find({"patient_phone": phone}).sort("created_at", -1)
    return {"items": [serialize(a) async for a in cursor]}
