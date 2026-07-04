"""Notification stub: logs and persists in-app notifications.

In production this would send email/SMS. For now it logs and stores a document
in `notifications` so the app can surface an in-app feed.
"""
from datetime import datetime

from database import get_db
from logging_config import get_logger

log = get_logger("notify")


async def notify(
    *,
    audience: str,          # "hospital" | "patient" | "superadmin"
    subject: str,
    body: str,
    email: str | None = None,
    ref: dict | None = None,
) -> None:
    db = get_db()
    doc = {
        "audience": audience,
        "email": email,
        "subject": subject,
        "body": body,
        "ref": ref or {},
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(doc)
    log.info("[NOTIFY:%s] to=%s | %s — %s", audience, email, subject, body)
