"""Patient booking endpoints (create/list/cancel/reschedule) via the booking adapter."""
from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response

from auth.deps import get_current_patient
from database import get_db
from models.booking import BookingCreate, serialize_booking
from services import booking_adapter
from services.calendar_invite import build_ics, google_calendar_link

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

SLOT_MINUTES = 30


def _slot_elapsed(b: dict) -> bool:
    """True once the appointment's slot has fully passed (server-local time)."""
    try:
        start = datetime.strptime(
            f"{b.get('appointment_date')} {b.get('time_slot')}", "%Y-%m-%d %I:%M %p"
        )
    except (TypeError, ValueError):
        return False
    return datetime.now() > start + timedelta(minutes=SLOT_MINUTES)


@router.post("")
async def create_booking(
    payload: BookingCreate, patient: dict = Depends(get_current_patient)
) -> dict:
    result = await booking_adapter.book({
        "hospital_id": payload.hospital_id,
        "user_id": patient["id"],
        "doctor_name": payload.doctor_name,
        "service_type": payload.service_type,
        "appointment_date": payload.appointment_date,
        "time_slot": payload.time_slot,
        "patient_name": payload.patient_name or patient.get("name"),
        "patient_phone": payload.patient_phone or patient.get("phone"),
        "notes": payload.notes,
        "channel": "web",
    })
    if not result.get("success"):
        raise HTTPException(409, result.get("message", "Booking failed."))
    return result


@router.get("")
async def my_bookings(patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    cursor = db.bookings.find({"user_id": patient["id"]}).sort("created_at", -1)
    items = [serialize_booking(b) async for b in cursor]

    # Lazily mark elapsed appointments as completed so they move to "Past".
    elapsed_ids = [
        b["id"] for b in items
        if b["status"] in ("booked", "rescheduled") and _slot_elapsed(b)
    ]
    if elapsed_ids:
        await db.bookings.update_many(
            {"_id": {"$in": [ObjectId(i) for i in elapsed_ids]}},
            {"$set": {"status": "completed"}},
        )
        for b in items:
            if b["id"] in elapsed_ids:
                b["status"] = "completed"

    upcoming = [b for b in items if b["status"] in ("booked", "rescheduled")]
    for b in upcoming:
        b["google_calendar_link"] = google_calendar_link(b)
    past = [b for b in items if b["status"] in ("completed", "no_show")]
    cancelled = [b for b in items if b["status"] == "cancelled"]
    return {"upcoming": upcoming, "past": past, "cancelled": cancelled, "all": items}


async def _owned(booking_id: str, patient: dict) -> dict:
    db = get_db()
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(400, "Invalid id.")
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking or booking.get("user_id") != patient["id"]:
        raise HTTPException(404, "Booking not found.")
    return booking


@router.post("/{booking_id}/confirm")
async def confirm_booking(booking_id: str, patient: dict = Depends(get_current_patient)) -> dict:
    """Patient confirms they'll attend — shown to the clinic to cut no-shows."""
    booking = await _owned(booking_id, patient)
    if booking.get("status") not in ("booked", "rescheduled"):
        raise HTTPException(409, "Only upcoming bookings can be confirmed.")
    db = get_db()
    now = datetime.utcnow()
    await db.bookings.update_one(
        {"_id": booking["_id"]}, {"$set": {"confirmed_at": now, "updated_at": now}})
    return {"success": True, "confirmed_at": now.isoformat()}


@router.get("/{booking_id}/calendar.ics")
async def booking_ics(booking_id: str, patient: dict = Depends(get_current_patient)):
    """Download the appointment as an .ics file (Apple/Outlook/Google)."""
    booking = await _owned(booking_id, patient)
    db = get_db()
    hospital = await db.hospitals.find_one({"_id": booking["hospital_id"]})
    ics = build_ics(serialize_booking(booking), hospital)
    if not ics:
        raise HTTPException(422, "This booking has no valid date/time.")
    return Response(content=ics, media_type="text/calendar",
                    headers={"Content-Disposition": "attachment; filename=appointment.ics"})


@router.post("/{booking_id}/cancel")
async def cancel_booking(booking_id: str, patient: dict = Depends(get_current_patient)) -> dict:
    await _owned(booking_id, patient)
    return await booking_adapter.cancel(booking_id)


@router.post("/{booking_id}/reschedule")
async def reschedule_booking(
    booking_id: str, body: dict, patient: dict = Depends(get_current_patient)
) -> dict:
    await _owned(booking_id, patient)
    date, slot = body.get("appointment_date"), body.get("time_slot")
    if not date or not slot:
        raise HTTPException(400, "appointment_date and time_slot are required.")
    return await booking_adapter.reschedule(booking_id, date, slot)
