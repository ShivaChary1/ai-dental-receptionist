"""Admin dashboard endpoints: stats, appointments, conversations."""
from datetime import datetime, timedelta

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from database import get_db
from models.appointment import AppointmentUpdate, serialize

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def stats() -> dict:
    db = get_db()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    week_ago = datetime.utcnow() - timedelta(days=7)
    start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total = await db.appointments.count_documents({})
    todays = await db.appointments.count_documents({"appointment_date": today})
    cancellations_week = await db.appointments.count_documents({
        "status": "cancelled", "updated_at": {"$gte": week_ago},
    })
    active_convos = await db.conversations.count_documents({
        "last_active": {"$gte": start_of_day},
    })

    breakdown = {}
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    async for row in db.appointments.aggregate(pipeline):
        breakdown[row["_id"]] = row["count"]

    recent_appts = await db.appointments.find().sort("created_at", -1).limit(10).to_list(10)
    recent_convos = await db.conversations.find().sort("last_active", -1).limit(10).to_list(10)

    return {
        "total_appointments": total,
        "todays_appointments": todays,
        "cancellations_this_week": cancellations_week,
        "active_conversations_today": active_convos,
        "status_breakdown": breakdown,
        "recent_appointments": [serialize(a) for a in recent_appts],
        "recent_conversations": [_convo_summary(c) for c in recent_convos],
    }


@router.get("/appointments")
async def list_appointments(
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    doctor_name: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    db = get_db()
    query: dict = {}
    if status:
        query["status"] = status
    if doctor_name:
        query["doctor_name"] = doctor_name
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q["$gte"] = date_from
        if date_to:
            date_q["$lte"] = date_to
        query["appointment_date"] = date_q
    if search:
        query["$or"] = [
            {"patient_name": {"$regex": search, "$options": "i"}},
            {"patient_phone": {"$regex": search, "$options": "i"}},
        ]

    total = await db.appointments.count_documents(query)
    cursor = (db.appointments.find(query)
              .sort("appointment_date", -1)
              .skip((page - 1) * limit)
              .limit(limit))
    items = [serialize(a) async for a in cursor]

    status_counts = {}
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    async for row in db.appointments.aggregate(pipeline):
        status_counts[row["_id"]] = row["count"]

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "status_counts": status_counts,
    }


@router.put("/appointments/{appt_id}")
async def update_appointment(appt_id: str, payload: AppointmentUpdate) -> dict:
    db = get_db()
    if not ObjectId.is_valid(appt_id):
        raise HTTPException(400, "Invalid id.")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update.")
    update["updated_at"] = datetime.utcnow()
    result = await db.appointments.update_one(
        {"_id": ObjectId(appt_id)}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Appointment not found.")
    return serialize(await db.appointments.find_one({"_id": ObjectId(appt_id)}))


def _convo_summary(c: dict) -> dict:
    messages = c.get("messages", [])
    last = messages[-1]["content"] if messages else ""
    return {
        "session_id": c.get("session_id"),
        "patient_name": c.get("patient_name") or "Anonymous",
        "message_count": len(messages),
        "last_message": last[:120],
        "last_active": c.get("last_active").isoformat() if c.get("last_active") else None,
        "intents": sorted(set(c.get("intent_log", []))),
    }


@router.get("/conversations")
async def list_conversations() -> dict:
    db = get_db()
    convos = await db.conversations.find().sort("last_active", -1).to_list(length=200)
    return {"items": [_convo_summary(c) for c in convos]}


@router.get("/conversations/{session_id}")
async def get_conversation(session_id: str) -> dict:
    db = get_db()
    convo = await db.conversations.find_one({"session_id": session_id})
    if not convo:
        raise HTTPException(404, "Conversation not found.")
    return serialize(convo)
