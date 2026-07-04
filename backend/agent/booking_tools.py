"""Booking/clinic tools + per-request context shared by the dental graph.

Contextvars carry the patient's location/identity and a sink that collects
structured recommendation cards for the API layer."""
import contextvars
import re

from langchain_core.tools import tool

from agent.tools import _norm_date
from database import get_db
from logging_config import get_logger
from services import booking_adapter
from services.availability import get_free_slots
from services.geo import haversine_km, is_open_now, maps_link

log = get_logger("booking-tools")

_location: contextvars.ContextVar[dict | None] = contextvars.ContextVar("dental_location", default=None)
_patient: contextvars.ContextVar[dict | None] = contextvars.ContextVar("dental_patient", default=None)
_reco_sink: contextvars.ContextVar[list | None] = contextvars.ContextVar("dental_reco_sink", default=None)


def set_request_context(location: dict | None, patient: dict | None) -> list:
    """Set per-request context; returns the recommendation sink to read after the run."""
    _location.set(location)
    _patient.set(patient)
    sink: list = []
    _reco_sink.set(sink)
    return sink


def get_patient() -> dict | None:
    return _patient.get()


async def _find_hospital(clinic_name: str) -> dict | None:
    db = get_db()
    return await db.hospitals.find_one({
        "status": "active",
        "name": {"$regex": re.escape(clinic_name.strip()), "$options": "i"},
    })


@tool
async def recommend_hospitals(problem: str) -> str:
    """Recommend the best nearby approved dental clinics for the patient's problem.
    Returns clinic names with distance, rating, open status, and services."""
    db = get_db()
    loc = _location.get()
    hospitals = await db.hospitals.find({"status": "active"}).to_list(length=None)
    ranked = []
    for h in hospitals:
        hl = h.get("location") or {}
        dist = None
        if loc and hl.get("lat") is not None:
            dist = haversine_km(loc["lat"], loc["lng"], hl["lat"], hl["lng"])
        ranked.append((dist, h))

    if loc:
        ranked.sort(key=lambda t: (t[0] is None, t[0] if t[0] is not None else 1e9))
    else:
        ranked.sort(key=lambda t: t[1].get("rating_avg", 0), reverse=True)

    sink = _reco_sink.get()
    lines = []
    for dist, h in ranked[:3]:
        open_now = is_open_now(h.get("hours"))
        card = {
            "id": str(h["_id"]),
            "name": h.get("name"),
            "rating_avg": h.get("rating_avg", 0),
            "distance_km": dist,
            "open_now": open_now,
            "services": h.get("services", [])[:4],
            "maps_link": maps_link(h.get("location"), h.get("maps_link")),
        }
        if sink is not None:
            sink.append(card)
        dtxt = f", {dist} km away" if dist is not None else ""
        otxt = "open now" if open_now else "currently closed"
        lines.append(f"- {card['name']} (★{card['rating_avg']}{dtxt}, {otxt}) — "
                     f"services: {', '.join(card['services']) or 'general dentistry'}")
    if not lines:
        return "No approved clinics are available right now."
    return "Recommended clinics:\n" + "\n".join(lines)


@tool
async def check_clinic_availability(clinic_name: str, date: str, doctor_name: str = "") -> str:
    """Check free appointment slots at an approved clinic on a date (YYYY-MM-DD).
    If doctor_name is omitted, lists the clinic's doctors so the patient can pick."""
    db = get_db()
    hospital = await _find_hospital(clinic_name)
    if not hospital:
        return f"I couldn't find an approved clinic matching '{clinic_name}'."
    doctors = await db.doctors.find({"hospital_id": hospital["_id"]}).to_list(length=None)
    if not doctor_name.strip():
        if not doctors:
            return f"{hospital['name']} has no doctors listed; bookings may not be possible."
        names = "; ".join(
            f"{d.get('name')} ({d.get('specialization') or 'general dentistry'})" for d in doctors
        )
        return f"Doctors at {hospital['name']}: {names}. Ask the patient which doctor they'd like."
    d = _norm_date(date)
    # Real availability: working hours, clinic blocks/holidays, bookings, and the
    # doctor's linked Google Calendar are all respected.
    free = await get_free_slots(hospital, doctor_name.strip(), d)
    if not free:
        return (f"No free slots with {doctor_name} at {hospital['name']} on {d} "
                "(fully booked, or the doctor is off/blocked that day). Try another date.")
    return f"Free slots with {doctor_name} at {hospital['name']} on {d}: {', '.join(free[:10])}"


@tool
async def book_at_clinic(clinic_name: str, doctor_name: str, service_type: str,
                         date: str, time_slot: str) -> dict:
    """Book an appointment for the signed-in patient at an approved clinic.
    Confirm clinic, doctor, service, date (YYYY-MM-DD), and time with the patient first."""
    patient = _patient.get()
    if not patient:
        return {"success": False,
                "message": "The patient is not signed in. Ask them to sign in (top of the page) "
                           "so you can book for them — their conversation will carry over."}
    hospital = await _find_hospital(clinic_name)
    if not hospital:
        return {"success": False, "message": f"No approved clinic matching '{clinic_name}'."}
    result = await booking_adapter.book({
        "hospital_id": str(hospital["_id"]),
        "user_id": patient.get("id"),
        "doctor_name": doctor_name,
        "service_type": service_type,
        "appointment_date": _norm_date(date),
        "time_slot": time_slot,
        "patient_name": patient.get("name"),
        "patient_phone": patient.get("phone"),
        "channel": "triage_chat",
    })
    return result


BOOKING_TOOLS = [recommend_hospitals, check_clinic_availability, book_at_clinic]
