"""Booking schemas and serialization."""
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from pydantic import BaseModel

BOOKING_STATUSES = ["booked", "cancelled", "rescheduled", "completed"]


class BookingCreate(BaseModel):
    hospital_id: str
    doctor_name: str
    service_type: str
    appointment_date: str  # YYYY-MM-DD
    time_slot: str
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    notes: Optional[str] = None


def serialize_booking(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if doc is None:
        return None
    out = dict(doc)
    out["id"] = str(out.pop("_id")) if "_id" in out else out.get("id")
    for k, v in list(out.items()):
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
    return out
