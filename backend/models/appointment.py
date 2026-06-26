"""Appointment models and serialization helpers."""
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from pydantic import BaseModel, Field

APPOINTMENT_STATUSES = ["scheduled", "completed", "cancelled", "rescheduled"]


class AppointmentUpdate(BaseModel):
    """Partial update payload from the dashboard."""

    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    doctor_name: Optional[str] = None
    service_type: Optional[str] = None
    appointment_date: Optional[str] = None
    time_slot: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def serialize(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """Convert a Mongo document into a JSON-safe dict."""
    if doc is None:
        return None
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, ObjectId):
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
        elif isinstance(value, list):
            out[key] = [str(v) if isinstance(v, ObjectId) else v for v in value]
    return out
