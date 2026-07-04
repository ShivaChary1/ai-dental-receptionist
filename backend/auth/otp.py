"""One-time-password issue/verify backed by the `otps` collection."""
import secrets
from datetime import datetime, timedelta, timezone

from auth.security import hash_otp, verify_otp
from config import settings
from database import get_db
from logging_config import get_logger
from services.whatsapp import send_text

log = get_logger("otp")


def _generate_code() -> str:
    upper = 10 ** settings.OTP_LENGTH
    return str(secrets.randbelow(upper)).zfill(settings.OTP_LENGTH)


async def issue_otp(phone: str) -> None:
    """Create and 'send' an OTP for a phone number.

    The code is stored hashed with an expiry. Delivery goes through the WhatsApp
    sender, which in dev (no creds) just logs the message. We also log the code
    explicitly in dev so it can be tested without a live channel.
    """
    code = _generate_code()
    now = datetime.now(timezone.utc)
    db = get_db()
    await db.otps.update_one(
        {"phone": phone},
        {"$set": {
            "phone": phone,
            "code_hash": hash_otp(code),
            "expires_at": now + timedelta(seconds=settings.OTP_TTL_SECONDS),
            "attempts": 0,
            "created_at": now,
        }},
        upsert=True,
    )
    log.info("OTP for %s = %s (valid %ss)", phone, code, settings.OTP_TTL_SECONDS)
    await send_text(phone, f"Your {settings.CLINIC_NAME} verification code is {code}. "
                           f"It expires in {settings.OTP_TTL_SECONDS // 60} minutes.")


async def verify_and_consume(phone: str, code: str) -> bool:
    """Return True if the code is valid; deletes the OTP on success."""
    db = get_db()
    doc = await db.otps.find_one({"phone": phone})
    if not doc:
        return False

    expires_at = doc.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < datetime.now(timezone.utc):
        await db.otps.delete_one({"phone": phone})
        return False

    if doc.get("attempts", 0) >= 5:
        await db.otps.delete_one({"phone": phone})
        return False

    if verify_otp(code, doc.get("code_hash", "")):
        await db.otps.delete_one({"phone": phone})
        return True

    await db.otps.update_one({"phone": phone}, {"$inc": {"attempts": 1}})
    return False
