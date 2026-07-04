"""Booking adapter: translates a standard internal booking request into whatever
each hospital's CRM expects.

Modes:
- "internal" (default): we own the booking; write to the `bookings` collection.
- "rest": forward to the hospital's own CRM endpoint (built out in Phase 5).

Every outbound/side-effecting call is logged to `adapter_logs` for debugging and
for the Hospital Admin overview.
"""
import re
from datetime import datetime
from typing import Any, Optional

import httpx
from bson import ObjectId

from config import settings
from database import get_db
from logging_config import get_logger

log = get_logger("adapter")


async def _sync_calendars(booking: dict, hospital: dict, *, method: str = "REQUEST",
                          sequence: int = 0) -> None:
    """Push the booking to the doctor's calendar (ICS invite email — Google auto-adds
    it) and email the patient a confirmation with an .ics. Best-effort, never raises."""
    from services import whatsapp
    from services.calendar_invite import build_ics, google_calendar_link
    from services.emailer import send_email

    db = get_db()
    try:
        b = {**booking, "id": str(booking.get("_id") or booking.get("id"))}
        when = f"{b.get('appointment_date')} at {b.get('time_slot')}"
        verb = {"REQUEST": "confirmed" if sequence == 0 else "rescheduled",
                "CANCEL": "cancelled"}.get(method, "updated")

        # Doctor: live calendar invite/cancellation.
        doctor = await db.doctors.find_one({
            "hospital_id": booking["hospital_id"],
            "name": {"$regex": f"^{re.escape(b.get('doctor_name') or '')}$", "$options": "i"},
        })
        organizer = settings.SMTP_FROM or "bookings@smiledesk.local"
        if doctor and doctor.get("email"):
            ics = build_ics(b, hospital, method=method, organizer_email=organizer,
                            attendee_email=doctor["email"], sequence=sequence)
            if ics:
                await send_email(
                    doctor["email"],
                    f"Appointment {verb}: {b.get('patient_name') or 'patient'} on {when}",
                    f"{b.get('patient_name') or 'A patient'} — {b.get('service_type')} on {when}. "
                    "This invite updates your calendar automatically.",
                    ics=ics, ics_method=method)

        # Patient: confirmation email with .ics + WhatsApp note.
        user = None
        if b.get("user_id") and ObjectId.is_valid(str(b["user_id"])):
            user = await db.users.find_one({"_id": ObjectId(str(b["user_id"]))})
        if user and user.get("email") and method != "CANCEL":
            ics = build_ics(b, hospital, method="PUBLISH")
            glink = google_calendar_link(b, hospital)
            await send_email(
                user["email"],
                f"Your appointment is {verb} — {when}",
                f"Your {b.get('service_type')} with {b.get('doctor_name')} at "
                f"{b.get('hospital_name')} is {verb} for {when}.\n"
                + (f"Add to Google Calendar: {glink}\n" if glink else ""),
                ics=ics, ics_method="PUBLISH")
        if b.get("patient_phone"):
            await whatsapp.send_text(
                b["patient_phone"],
                f"SmileDesk: your {b.get('service_type')} with {b.get('doctor_name')} at "
                f"{b.get('hospital_name')} is {verb} for {when}.")
    except Exception as exc:
        log.warning("Calendar sync failed for booking %s: %s",
                    booking.get("_id") or booking.get("id"), exc)


async def _log_call(hospital_id, action: str, request: dict, response: dict,
                    ok: bool, booking_id: Optional[str] = None) -> None:
    db = get_db()
    await db.adapter_logs.insert_one({
        "hospital_id": ObjectId(hospital_id) if ObjectId.is_valid(str(hospital_id)) else hospital_id,
        "booking_id": booking_id,
        "action": action,
        "request": request,
        "response": response,
        "ok": ok,
        "created_at": datetime.utcnow(),
    })


async def _get_hospital(hospital_id: str) -> Optional[dict]:
    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        return None
    return await db.hospitals.find_one({"_id": ObjectId(hospital_id)})


def _norm_date(date: str) -> str:
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date.strip()


async def book(internal_req: dict) -> dict:
    """Create a booking. `internal_req` carries hospital_id, user_id, doctor_name,
    service_type, appointment_date, time_slot, patient_name/phone, channel."""
    db = get_db()
    hospital_id = internal_req["hospital_id"]
    hospital = await _get_hospital(hospital_id)
    if not hospital:
        return {"success": False, "message": "Clinic not found."}
    if hospital.get("status") != "active":
        return {"success": False, "message": "This clinic is not accepting bookings right now."}

    date = _norm_date(internal_req.get("appointment_date", ""))
    config = hospital.get("booking_config") or {"mode": "internal"}
    mode = config.get("mode", "internal")

    # Validate against real availability (hours, blocks/holidays, existing bookings,
    # and the doctor's linked Google Calendar) for internal mode.
    if mode == "internal":
        from services.availability import get_free_slots
        free = await get_free_slots(hospital, internal_req.get("doctor_name") or "", date)
        if internal_req.get("time_slot") not in free:
            hint = f" Available that day: {', '.join(free[:6])}." if free else \
                   " No slots are available that day — try another date."
            return {"success": False,
                    "message": f"{internal_req.get('time_slot')} on {date} isn't available "
                               f"with {internal_req.get('doctor_name')}.{hint}"}

    now = datetime.utcnow()
    doc = {
        "user_id": internal_req.get("user_id"),
        "hospital_id": ObjectId(hospital_id),
        "hospital_name": hospital.get("name"),
        "doctor_name": internal_req.get("doctor_name"),
        "service_type": internal_req.get("service_type"),
        "appointment_date": date,
        "time_slot": internal_req.get("time_slot"),
        "patient_name": internal_req.get("patient_name"),
        "patient_phone": internal_req.get("patient_phone"),
        "notes": internal_req.get("notes"),
        "status": "booked",
        "channel": internal_req.get("channel", "web"),
        "external_ref": None,
        "created_at": now,
        "updated_at": now,
    }

    external_ref = None
    ok = True
    resp: dict[str, Any] = {"mode": mode}
    if mode == "rest":
        external_ref, ok, resp = await _rest_call(hospital, "book", internal_req)
        doc["external_ref"] = external_ref
        if not ok:
            await _log_call(hospital_id, "book", internal_req, resp, ok)
            return {"success": False, "message": "The clinic's booking system rejected the request."}

    result = await db.bookings.insert_one(doc)
    booking_id = str(result.inserted_id)
    doc["_id"] = result.inserted_id
    await _log_call(hospital_id, "book", internal_req, {**resp, "booking_id": booking_id}, ok, booking_id)
    await _sync_calendars(doc, hospital, method="REQUEST", sequence=0)

    # Notify the clinic's staff of the new booking (in-app + log).
    staff = await db.hospital_staff_users.find_one({"hospital_id": ObjectId(hospital_id)})
    if staff:
        from services.notifications import notify
        await notify(audience="hospital", email=staff.get("email"),
                     subject="New booking",
                     body=f"{doc['patient_name'] or 'A patient'} booked {doc['service_type']} "
                          f"with {doc['doctor_name']} on {date} at {doc['time_slot']}.",
                     ref={"booking_id": booking_id})
    return {
        "success": True,
        "booking_id": booking_id,
        "external_ref": external_ref,
        "message": f"Appointment booked with {doc['doctor_name']} on {date} at {doc['time_slot']}.",
    }


async def cancel(booking_id: str) -> dict:
    db = get_db()
    if not ObjectId.is_valid(booking_id):
        return {"success": False, "message": "Invalid booking id."}
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        return {"success": False, "message": "Booking not found."}
    hospital = await _get_hospital(str(booking["hospital_id"]))
    config = (hospital or {}).get("booking_config") or {"mode": "internal"}
    ok, resp = True, {"mode": config.get("mode", "internal")}
    if config.get("mode") == "rest" and booking.get("external_ref"):
        _ref, ok, resp = await _rest_call(hospital, "cancel", {"external_ref": booking["external_ref"]})
    await db.bookings.update_one({"_id": booking["_id"]},
                                 {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}})
    await _log_call(str(booking["hospital_id"]), "cancel", {"booking_id": booking_id}, resp, ok, booking_id)
    if hospital:
        await _sync_calendars(booking, hospital, method="CANCEL",
                              sequence=int(booking.get("calendar_sequence") or 0) + 1)
    return {"success": True, "message": "Your appointment has been cancelled."}


async def reschedule(booking_id: str, new_date: str, new_time_slot: str) -> dict:
    db = get_db()
    if not ObjectId.is_valid(booking_id):
        return {"success": False, "message": "Invalid booking id."}
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        return {"success": False, "message": "Booking not found."}
    hospital = await _get_hospital(str(booking["hospital_id"]))
    config = (hospital or {}).get("booking_config") or {"mode": "internal"}
    date = _norm_date(new_date)
    if hospital and config.get("mode", "internal") == "internal":
        from services.availability import get_free_slots
        free = await get_free_slots(hospital, booking.get("doctor_name") or "", date)
        if new_time_slot not in free:
            hint = f" Available that day: {', '.join(free[:6])}." if free else \
                   " No slots are available that day — try another date."
            return {"success": False,
                    "message": f"{new_time_slot} on {date} isn't available.{hint}"}
    ok, resp = True, {"mode": config.get("mode", "internal")}
    if config.get("mode") == "rest" and booking.get("external_ref"):
        _ref, ok, resp = await _rest_call(
            hospital, "reschedule",
            {"external_ref": booking["external_ref"], "date": date, "time_slot": new_time_slot})
    sequence = int(booking.get("calendar_sequence") or 0) + 1
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"appointment_date": date, "time_slot": new_time_slot,
                  "status": "rescheduled", "calendar_sequence": sequence,
                  "confirmed_at": None, "reminders": {},
                  "updated_at": datetime.utcnow()}})
    if hospital:
        updated = {**booking, "appointment_date": date, "time_slot": new_time_slot}
        await _sync_calendars(updated, hospital, method="REQUEST", sequence=sequence)
    await _log_call(str(booking["hospital_id"]), "reschedule",
                    {"booking_id": booking_id, "date": date, "time_slot": new_time_slot}, resp, ok, booking_id)
    return {"success": True, "message": f"Your appointment was moved to {date} at {new_time_slot}."}


async def _rest_call(hospital: dict, action: str, payload: dict) -> tuple[Optional[str], bool, dict]:
    """Forward a request to a clinic's REST CRM. Maps the standard payload using the
    hospital's payload_template (simple pass-through + template merge)."""
    config = hospital.get("booking_config") or {}
    url = config.get("endpoint_url")
    if not url:
        return None, False, {"error": "No endpoint_url configured."}
    template = config.get("payload_template") or {}
    body = {**template, "action": action, **payload}
    headers = {}
    auth_type, creds = config.get("auth_type"), config.get("credentials")
    if auth_type == "bearer" and creds:
        headers["Authorization"] = f"Bearer {creds}"
    elif auth_type == "api_key" and creds:
        headers["X-API-Key"] = creds
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, json=body, headers=headers)
            r.raise_for_status()
            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"raw": r.text}
            ref = data.get("external_ref") or data.get("id") or data.get("reference")
            return ref, True, data
    except Exception as exc:
        log.exception("REST adapter %s failed for %s: %s", action, hospital.get("name"), exc)
        return None, False, {"error": str(exc)}
