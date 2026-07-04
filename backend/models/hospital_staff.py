"""Hospital staff (clinic-side login) document shape and serialization."""
from datetime import datetime
from typing import Any


def new_staff_doc(hospital_id, email: str, name: str, password_hash: str) -> dict:
    now = datetime.utcnow()
    return {
        "hospital_id": hospital_id,
        "email": email.lower(),
        "name": name,
        "password_hash": password_hash,
        "role": "hospital",
        "created_at": now,
        "last_login": now,
    }


def serialize_staff(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if doc is None:
        return None
    return {
        "id": str(doc["_id"]) if "_id" in doc else doc.get("id"),
        "email": doc.get("email"),
        "name": doc.get("name"),
        "hospital_id": str(doc.get("hospital_id")) if doc.get("hospital_id") else None,
        "role": "hospital",
    }
