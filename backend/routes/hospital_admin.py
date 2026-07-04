"""Hospital Admin dashboard — scoped to the logged-in staff member's hospital."""
import re
from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.deps import require_hospital_staff
from database import get_db
from models.booking import serialize_booking
from models.hospital import serialize_doctor, serialize_hospital

router = APIRouter(prefix="/api/hospital", tags=["hospital-admin"])

_STOPWORDS = set("the a an and or to of for i my me is are do can you your with on at in "
                 "have has need want book appointment please hi hello it that this get".split())


def _hid(staff: dict) -> ObjectId:
    return ObjectId(staff["hospital_id"])


# ---------- Overview ----------
@router.get("/overview")
async def overview(staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    hid = _hid(staff)
    hid_str = staff["hospital_id"]
    total_bookings = await db.bookings.count_documents({"hospital_id": hid})
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_cancels = await db.bookings.count_documents(
        {"hospital_id": hid, "status": "cancelled", "updated_at": {"$gte": week_ago}})
    convo_count = await db.conversations.count_documents({"hospital_id": hid_str, "kind": "clinic"})

    recent_bookings = await db.bookings.find({"hospital_id": hid}).sort("created_at", -1).limit(8).to_list(8)
    recent_convos = await db.conversations.find(
        {"hospital_id": hid_str, "kind": "clinic"}).sort("last_active", -1).limit(8).to_list(8)
    recent_logs = await db.adapter_logs.find({"hospital_id": hid}).sort("created_at", -1).limit(8).to_list(8)

    return {
        "total_bookings": total_bookings,
        "cancellations_this_week": recent_cancels,
        "conversations": convo_count,
        "recent_bookings": [serialize_booking(b) for b in recent_bookings],
        "recent_conversations": [_convo_summary(c) for c in recent_convos],
        "recent_adapter_calls": [
            {"action": l.get("action"), "ok": l.get("ok"),
             "created_at": l.get("created_at").isoformat() if l.get("created_at") else None}
            for l in recent_logs
        ],
    }


def _convo_summary(c: dict) -> dict:
    msgs = c.get("messages", [])
    return {
        "id": str(c["_id"]),
        "patient_name": c.get("patient_name") or "Patient",
        "message_count": len(msgs),
        "last_message": (msgs[-1]["content"][:100] if msgs else ""),
        "last_active": c.get("last_active").isoformat() if c.get("last_active") else None,
    }


# ---------- Bookings ----------
@router.get("/bookings")
async def list_bookings(
    status: Optional[str] = None, staff: dict = Depends(require_hospital_staff)
) -> dict:
    db = get_db()
    query = {"hospital_id": _hid(staff)}
    if status:
        query["status"] = status
    cursor = db.bookings.find(query).sort("created_at", -1)
    return {"items": [serialize_booking(b) async for b in cursor]}


class BookingStatusBody(BaseModel):
    status: str


@router.post("/bookings/{booking_id}/status")
async def set_booking_status(
    booking_id: str, body: BookingStatusBody, staff: dict = Depends(require_hospital_staff)
) -> dict:
    """Clinic marks attendance: completed (visited) or no_show. Only after the slot."""
    from routes.bookings import _slot_elapsed

    if body.status not in ("completed", "no_show"):
        raise HTTPException(400, "Status must be 'completed' or 'no_show'.")
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(400, "Invalid id.")
    db = get_db()
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id), "hospital_id": _hid(staff)})
    if not booking:
        raise HTTPException(404, "Booking not found.")
    if booking.get("status") == "cancelled":
        raise HTTPException(409, "Cancelled bookings can't be updated.")
    if booking.get("status") in ("booked", "rescheduled") and not _slot_elapsed(booking):
        raise HTTPException(409, "Attendance can only be marked after the appointment time.")
    await db.bookings.update_one(
        {"_id": booking["_id"]},
        {"$set": {"status": body.status, "updated_at": datetime.utcnow()}},
    )
    return {"success": True, "status": body.status}


# ---------- Conversations ----------
@router.get("/conversations")
async def list_conversations(staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    cursor = db.conversations.find(
        {"hospital_id": staff["hospital_id"], "kind": "clinic"}).sort("last_active", -1)
    return {"items": [_convo_summary(c) async for c in cursor]}


@router.get("/conversations/{convo_id}")
async def get_conversation(convo_id: str, staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    if not ObjectId.is_valid(convo_id):
        raise HTTPException(400, "Invalid id.")
    c = await db.conversations.find_one({"_id": ObjectId(convo_id)})
    if not c or c.get("hospital_id") != staff["hospital_id"]:
        raise HTTPException(404, "Conversation not found.")
    return {
        "id": str(c["_id"]),
        "patient_name": c.get("patient_name") or "Patient",
        "messages": [{"role": m["role"], "content": m["content"]} for m in c.get("messages", [])],
    }


# ---------- Profile & doctors ----------
class ProfileUpdate(BaseModel):
    description: Optional[str] = None
    address: Optional[str] = None
    hours: Optional[dict] = None
    services: Optional[list[str]] = None
    photos: Optional[list[str]] = None
    insurance_accepted: Optional[list[str]] = None
    booking_config: Optional[dict] = None


class DoctorIn(BaseModel):
    name: str
    photo: Optional[str] = None
    qualification: Optional[str] = None
    years_experience: Optional[int] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None
    # Google Calendar "Secret address in iCal format" — busy events on it block slots,
    # and bookings are pushed to the doctor as calendar invites via `email`.
    calendar_ical_url: Optional[str] = None
    # Weekly hours, e.g. {"mon": "09:00-18:00", "sun": "off"}. None = clinic hours.
    working_hours: Optional[dict] = None


@router.get("/profile")
async def get_profile(staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    h = await db.hospitals.find_one({"_id": _hid(staff)})
    if not h:
        raise HTTPException(404, "Hospital not found.")
    out = serialize_hospital(h)
    doctors = await db.doctors.find({"hospital_id": h["_id"]}).to_list(length=None)
    out["doctors"] = [serialize_doctor(d) for d in doctors]
    return out


@router.put("/profile")
async def update_profile(payload: ProfileUpdate, staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    await db.hospitals.update_one({"_id": _hid(staff)}, {"$set": update})
    return await get_profile(staff)


@router.post("/doctors")
async def add_doctor(payload: DoctorIn, staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    doc = payload.model_dump()
    doc.update({"hospital_id": _hid(staff), "created_at": datetime.utcnow()})
    result = await db.doctors.insert_one(doc)
    return serialize_doctor(await db.doctors.find_one({"_id": result.inserted_id}))


@router.put("/doctors/{doctor_id}")
async def update_doctor(doctor_id: str, payload: DoctorIn, staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    if not ObjectId.is_valid(doctor_id):
        raise HTTPException(400, "Invalid id.")
    result = await db.doctors.update_one(
        {"_id": ObjectId(doctor_id), "hospital_id": _hid(staff)},
        {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(404, "Doctor not found.")
    return serialize_doctor(await db.doctors.find_one({"_id": ObjectId(doctor_id)}))


@router.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str, staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    if not ObjectId.is_valid(doctor_id):
        raise HTTPException(400, "Invalid id.")
    result = await db.doctors.delete_one({"_id": ObjectId(doctor_id), "hospital_id": _hid(staff)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Doctor not found.")
    return {"success": True}


# ---------- Schedule: blocks/holidays + availability preview ----------
class BlockIn(BaseModel):
    date: str                          # YYYY-MM-DD
    doctor_name: Optional[str] = None  # None = whole clinic (holiday)
    all_day: bool = True
    slots: Optional[list[str]] = None  # specific slots when all_day is False
    reason: Optional[str] = None


def _serialize_block(b: dict) -> dict:
    return {
        "id": str(b["_id"]),
        "date": b.get("date"),
        "doctor_name": b.get("doctor_name"),
        "all_day": bool(b.get("all_day")),
        "slots": b.get("slots") or [],
        "reason": b.get("reason"),
    }


@router.get("/blocks")
async def list_blocks(staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    today = datetime.now().strftime("%Y-%m-%d")
    cursor = db.schedule_blocks.find(
        {"hospital_id": _hid(staff), "date": {"$gte": today}}).sort("date", 1)
    return {"items": [_serialize_block(b) async for b in cursor]}


@router.post("/blocks")
async def add_block(payload: BlockIn, staff: dict = Depends(require_hospital_staff)) -> dict:
    try:
        datetime.strptime(payload.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD.")
    if not payload.all_day and not payload.slots:
        raise HTTPException(400, "Pick specific slots or mark the block all-day.")
    db = get_db()
    doc = payload.model_dump()
    doc.update({"hospital_id": _hid(staff), "created_at": datetime.utcnow()})
    result = await db.schedule_blocks.insert_one(doc)
    return _serialize_block(await db.schedule_blocks.find_one({"_id": result.inserted_id}))


@router.delete("/blocks/{block_id}")
async def delete_block(block_id: str, staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    if not ObjectId.is_valid(block_id):
        raise HTTPException(400, "Invalid id.")
    result = await db.schedule_blocks.delete_one(
        {"_id": ObjectId(block_id), "hospital_id": _hid(staff)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Block not found.")
    return {"success": True}


@router.get("/availability")
async def availability_preview(
    doctor_name: str, date: str, staff: dict = Depends(require_hospital_staff)
) -> dict:
    """What patients (and the AI agent) currently see for this doctor/date."""
    from services.availability import get_free_slots

    db = get_db()
    h = await db.hospitals.find_one({"_id": _hid(staff)})
    if not h:
        raise HTTPException(404, "Hospital not found.")
    slots = await get_free_slots(h, doctor_name, date)
    return {"doctor_name": doctor_name, "date": date, "slots": slots}


# ---------- Insights ----------
@router.get("/insights")
async def insights(staff: dict = Depends(require_hospital_staff)) -> dict:
    db = get_db()
    hid = _hid(staff)
    hid_str = staff["hospital_id"]

    bookings = await db.bookings.find({"hospital_id": hid}).to_list(length=None)
    convos = await db.conversations.find({"hospital_id": hid_str, "kind": "clinic"}).to_list(length=None)

    total_bookings = len(bookings)
    cancelled = sum(1 for b in bookings if b.get("status") == "cancelled")
    rescheduled = sum(1 for b in bookings if b.get("status") == "rescheduled")

    # Conversation volume over the last 14 days.
    vol = Counter()
    for c in convos:
        d = c.get("started_at")
        if d:
            vol[d.strftime("%Y-%m-%d")] += 1
    volume_series = [{"date": k, "count": vol[k]} for k in sorted(vol)][-14:]

    # Peak booking times (by slot) and per-doctor distribution.
    by_slot = Counter(b.get("time_slot", "?") for b in bookings)
    by_doctor = Counter(b.get("doctor_name", "?") for b in bookings)

    # Common patient words across conversation user messages.
    words = Counter()
    for c in convos:
        for m in c.get("messages", []):
            if m.get("role") == "user":
                for w in re.findall(r"[a-zA-Z]{4,}", m.get("content", "").lower()):
                    if w not in _STOPWORDS:
                        words[w] += 1

    return {
        "totals": {
            "bookings": total_bookings,
            "conversations": len(convos),
            "cancelled": cancelled,
            "rescheduled": rescheduled,
            "booking_conversion_rate": round(total_bookings / len(convos), 2) if convos else 0,
            "cancel_reschedule_rate": round((cancelled + rescheduled) / total_bookings, 2) if total_bookings else 0,
        },
        "conversation_volume": volume_series,
        "peak_slots": [{"slot": k, "count": v} for k, v in by_slot.most_common(8)],
        "per_doctor": [{"doctor": k, "count": v} for k, v in by_doctor.most_common()],
        "common_terms": [{"term": k, "count": v} for k, v in words.most_common(12)],
    }
