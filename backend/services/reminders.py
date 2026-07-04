"""Appointment reminder loop: 24-hour and 1-hour nudges over in-app, WhatsApp,
and email, each asking the patient to confirm they're coming (cuts no-shows).

Started as an asyncio task from the app lifespan; wakes every minute, scans
active bookings in the next 24h, and stamps `reminders.h24` / `reminders.h1`
so each fires exactly once (also survives restarts).
"""
import asyncio
from datetime import datetime, timedelta

from bson import ObjectId

from database import get_db
from logging_config import get_logger
from services import whatsapp
from services.availability import slot_start
from services.emailer import send_email
from services.notifications import notify

log = get_logger("reminders")

CHECK_INTERVAL = 60  # seconds
WINDOWS = [("h24", timedelta(hours=24)), ("h1", timedelta(hours=1))]


async def _send_reminder(booking: dict, key: str) -> None:
    db = get_db()
    when = f"{booking.get('appointment_date')} at {booking.get('time_slot')}"
    lead = "tomorrow" if key == "h24" else "in about an hour"
    confirmed = bool(booking.get("confirmed_at"))
    ask = "" if confirmed else " Please confirm you're coming from My Bookings in the app."
    body = (f"Reminder: your {booking.get('service_type')} with {booking.get('doctor_name')} "
            f"at {booking.get('hospital_name')} is {lead} — {when}.{ask}")

    user = None
    if booking.get("user_id") and ObjectId.is_valid(str(booking["user_id"])):
        user = await db.users.find_one({"_id": ObjectId(str(booking["user_id"]))})

    await notify(audience="patient", email=(user or {}).get("email"),
                 subject="Appointment reminder", body=body,
                 ref={"booking_id": str(booking["_id"])})
    if booking.get("patient_phone"):
        await whatsapp.send_text(booking["patient_phone"], f"SmileDesk: {body}")
    if user and user.get("email"):
        await send_email(user["email"], f"Reminder — appointment {lead}", body)


async def _tick() -> None:
    db = get_db()
    now = datetime.now()
    horizon = (now + timedelta(hours=25)).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    cursor = db.bookings.find({
        "status": {"$in": ["booked", "rescheduled"]},
        "appointment_date": {"$gte": today, "$lte": horizon},
    })
    async for b in cursor:
        start = slot_start(b.get("appointment_date"), b.get("time_slot"))
        if start is None or start <= now:
            continue
        sent = b.get("reminders") or {}
        for key, delta in WINDOWS:
            if not sent.get(key) and start - now <= delta:
                try:
                    await _send_reminder(b, key)
                    await db.bookings.update_one(
                        {"_id": b["_id"]}, {"$set": {f"reminders.{key}": datetime.utcnow()}})
                except Exception as exc:
                    log.exception("Reminder %s failed for %s: %s", key, b["_id"], exc)


async def reminder_loop() -> None:
    log.info("Reminder loop started (every %ss).", CHECK_INTERVAL)
    while True:
        try:
            await _tick()
        except Exception as exc:
            log.exception("Reminder tick failed: %s", exc)
        await asyncio.sleep(CHECK_INTERVAL)
