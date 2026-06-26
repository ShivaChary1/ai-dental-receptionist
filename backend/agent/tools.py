"""LangChain tools the dental agent can call."""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from langchain_core.tools import tool

from agent import rag
from database import get_db

# 30-minute slots from 9:00 AM to 6:30 PM.
def _all_slots() -> list[str]:
    slots = []
    for hour in range(9, 19):
        for minute in (0, 30):
            if hour == 18 and minute == 30:
                continue
            dt = datetime(2000, 1, 1, hour, minute)
            slots.append(dt.strftime("%I:%M %p").lstrip("0"))
    return slots


ALL_SLOTS = _all_slots()


def _norm_date(date: str) -> str:
    """Normalize a date string to YYYY-MM-DD; return as-is on failure."""
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date.strip()


@tool
async def check_availability(doctor_name: str, date: str) -> list[str]:
    """Return available 30-minute time slots for a doctor on a given date (YYYY-MM-DD)."""
    db = get_db()
    date = _norm_date(date)
    cursor = db.appointments.find({
        "doctor_name": doctor_name,
        "appointment_date": date,
        "status": {"$in": ["scheduled", "rescheduled"]},
    })
    booked = {appt.get("time_slot") async for appt in cursor}
    return [slot for slot in ALL_SLOTS if slot not in booked]


@tool
async def book_appointment(
    patient_name: str,
    patient_phone: str,
    doctor_name: str,
    service_type: str,
    date: str,
    time_slot: str,
    notes: str = "",
    patient_email: str = "",
) -> dict:
    """Create an appointment in the database and return a confirmation with its ID."""
    db = get_db()
    date = _norm_date(date)

    existing = await db.appointments.find_one({
        "doctor_name": doctor_name,
        "appointment_date": date,
        "time_slot": time_slot,
        "status": {"$in": ["scheduled", "rescheduled"]},
    })
    if existing:
        return {
            "success": False,
            "message": f"{time_slot} on {date} with {doctor_name} is already booked. Please pick another slot.",
        }

    now = datetime.utcnow()
    doc = {
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "patient_email": patient_email,
        "doctor_name": doctor_name,
        "service_type": service_type,
        "appointment_date": date,
        "time_slot": time_slot,
        "status": "scheduled",
        "notes": notes,
        "booked_via": "chat",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.appointments.insert_one(doc)
    return {
        "success": True,
        "appointment_id": str(result.inserted_id),
        "message": f"Appointment confirmed for {patient_name} with {doctor_name} "
                   f"for {service_type} on {date} at {time_slot}.",
    }


async def _find_appointment(appointment_id_or_phone: str) -> Optional[dict]:
    db = get_db()
    if ObjectId.is_valid(appointment_id_or_phone):
        appt = await db.appointments.find_one({"_id": ObjectId(appointment_id_or_phone)})
        if appt:
            return appt
    return await db.appointments.find_one(
        {"patient_phone": appointment_id_or_phone,
         "status": {"$in": ["scheduled", "rescheduled"]}},
        sort=[("created_at", -1)],
    )


@tool
async def reschedule_appointment(
    appointment_id_or_phone: str, new_date: str, new_time_slot: str
) -> dict:
    """Reschedule an appointment found by its ID or the patient's phone number."""
    db = get_db()
    appt = await _find_appointment(appointment_id_or_phone)
    if not appt:
        return {"success": False, "message": "No matching appointment found."}

    await db.appointments.update_one(
        {"_id": appt["_id"]},
        {"$set": {
            "appointment_date": _norm_date(new_date),
            "time_slot": new_time_slot,
            "status": "rescheduled",
            "updated_at": datetime.utcnow(),
        }},
    )
    return {
        "success": True,
        "appointment_id": str(appt["_id"]),
        "message": f"Appointment moved to {_norm_date(new_date)} at {new_time_slot}.",
    }


@tool
async def cancel_appointment(appointment_id_or_phone: str) -> dict:
    """Cancel an appointment found by its ID or the patient's phone number."""
    db = get_db()
    appt = await _find_appointment(appointment_id_or_phone)
    if not appt:
        return {"success": False, "message": "No matching appointment found."}

    await db.appointments.update_one(
        {"_id": appt["_id"]},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}},
    )
    return {
        "success": True,
        "appointment_id": str(appt["_id"]),
        "message": "The appointment has been cancelled.",
    }


@tool
async def get_patient_appointments(patient_phone: str) -> list:
    """Fetch all appointments for a patient's phone number."""
    db = get_db()
    cursor = db.appointments.find({"patient_phone": patient_phone}).sort("created_at", -1)
    appts = []
    async for a in cursor:
        appts.append({
            "appointment_id": str(a["_id"]),
            "doctor_name": a.get("doctor_name"),
            "service_type": a.get("service_type"),
            "appointment_date": a.get("appointment_date"),
            "time_slot": a.get("time_slot"),
            "status": a.get("status"),
        })
    return appts


@tool
async def search_clinic_knowledge(query: str) -> str:
    """Search clinic knowledge (timings, doctors, services, location, policies) for the query."""
    return await rag.search(query, k=3)


ALL_TOOLS = [
    check_availability,
    book_appointment,
    reschedule_appointment,
    cancel_appointment,
    get_patient_appointments,
    search_clinic_knowledge,
]
