"""Hospital + doctor serialization helpers."""
from datetime import datetime
from typing import Any

from bson import ObjectId


def serialize_hospital(doc: dict[str, Any] | None, extra: dict | None = None) -> dict[str, Any] | None:
    if doc is None:
        return None
    out = dict(doc)
    out["id"] = str(out.pop("_id")) if "_id" in out else out.get("id")
    for k, v in list(out.items()):
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
    # Never leak stored CRM credentials to public/patient callers.
    bc = out.get("booking_config")
    if isinstance(bc, dict) and "credentials" in bc:
        bc = dict(bc)
        bc["credentials"] = "***" if bc.get("credentials") else None
        out["booking_config"] = bc
    if extra:
        out.update(extra)
    return out


def serialize_doctor(doc: dict[str, Any] | None, public: bool = False) -> dict[str, Any] | None:
    if doc is None:
        return None
    out = dict(doc)
    out["id"] = str(out.pop("_id")) if "_id" in out else out.get("id")
    if isinstance(out.get("hospital_id"), ObjectId):
        out["hospital_id"] = str(out["hospital_id"])
    if isinstance(out.get("created_at"), datetime):
        out["created_at"] = out["created_at"].isoformat()
    if public:
        # The iCal URL is a secret address; never expose it (or emails) publicly.
        out.pop("calendar_ical_url", None)
        out.pop("email", None)
    return out
