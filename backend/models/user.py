"""User document shape and safe serialization."""
from datetime import datetime
from typing import Any, Optional


def new_user_doc(
    email: Optional[str] = None,
    phone: Optional[str] = None,
    name: Optional[str] = None,
    password_hash: Optional[str] = None,
) -> dict:
    now = datetime.utcnow()
    return {
        "email": email.lower() if email else None,
        "phone": phone,
        "name": name,
        "password_hash": password_hash,
        "role": "patient",
        "created_at": now,
        "last_login": now,
    }


def serialize_user(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """JSON-safe user without the password hash."""
    if doc is None:
        return None
    return {
        "id": str(doc["_id"]) if "_id" in doc else doc.get("id"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "name": doc.get("name"),
        "role": doc.get("role", "patient"),
    }
