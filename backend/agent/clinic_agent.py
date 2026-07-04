"""Per-clinic AI agent: scoped to one hospital. Answers clinic-specific questions
and performs book / cancel / reschedule through that hospital's booking adapter."""
import contextvars
import time
from datetime import date, datetime

from bson import ObjectId
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.dental_agent import _classify_error, _extract_reply, _to_lc_messages
from agent.prompts.clinic import CLINIC_SYSTEM_PROMPT
from agent.tools import _norm_date
from config import settings
from database import get_db
from logging_config import get_logger
from services import booking_adapter

log = get_logger("clinic-agent")

# Per-request context: which hospital + which patient this turn is for.
_ctx: contextvars.ContextVar[dict] = contextvars.ContextVar("clinic_ctx", default={})

_agents: dict[str, tuple[str, object]] = {}  # hospital_id -> (day, agent)


_GUEST_MSG = ("The patient isn't signed in. Warmly ask them to sign in (free, takes a "
              "minute) — this conversation carries over and then you can do this for them.")


def make_clinic_tools(hospital_id: str) -> list:
    """Build booking tools bound to a specific hospital. Patient identity is read
    from the per-request context var so the same cached agent serves all patients."""

    async def _owned_booking(booking_id: str) -> dict | None:
        """The patient's own booking at this clinic, or None."""
        db = get_db()
        ctx = _ctx.get()
        if not ctx.get("user_id") or not ObjectId.is_valid(booking_id):
            return None
        return await db.bookings.find_one({
            "_id": ObjectId(booking_id),
            "hospital_id": ObjectId(hospital_id),
            "user_id": ctx["user_id"],
        })

    @tool
    async def check_availability(doctor_name: str, date: str) -> list[str]:
        """Return available 30-minute time slots for a doctor at this clinic on a date (YYYY-MM-DD).
        Honours the doctor's working hours, clinic holidays, bookings, and linked calendars."""
        from services.availability import get_free_slots

        db = get_db()
        hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
        if not hospital:
            return []
        return await get_free_slots(hospital, doctor_name, _norm_date(date))

    @tool
    async def book_appointment(doctor_name: str, service_type: str, date: str, time_slot: str) -> dict:
        """Book an appointment at this clinic for the signed-in patient."""
        ctx = _ctx.get()
        if not ctx.get("user_id"):
            return {"success": False, "message": _GUEST_MSG}
        return await booking_adapter.book({
            "hospital_id": hospital_id,
            "user_id": ctx.get("user_id"),
            "doctor_name": doctor_name,
            "service_type": service_type,
            "appointment_date": date,
            "time_slot": time_slot,
            "patient_name": ctx.get("name"),
            "patient_phone": ctx.get("phone"),
            "channel": "clinic_widget",
        })

    @tool
    async def get_my_appointments() -> list | dict:
        """List the signed-in patient's appointments at this clinic."""
        db = get_db()
        ctx = _ctx.get()
        if not ctx.get("user_id"):
            return {"success": False, "message": _GUEST_MSG}
        cursor = db.bookings.find({
            "hospital_id": ObjectId(hospital_id),
            "user_id": ctx.get("user_id"),
        }).sort("created_at", -1)
        out = []
        async for b in cursor:
            out.append({"booking_id": str(b["_id"]), "doctor_name": b.get("doctor_name"),
                        "service_type": b.get("service_type"), "date": b.get("appointment_date"),
                        "time_slot": b.get("time_slot"), "status": b.get("status")})
        return out

    @tool
    async def cancel_appointment(booking_id: str) -> dict:
        """Cancel one of the patient's appointments at this clinic by its booking id."""
        if not _ctx.get().get("user_id"):
            return {"success": False, "message": _GUEST_MSG}
        if not await _owned_booking(booking_id):
            return {"success": False, "message": "That booking id doesn't belong to this "
                                                 "patient at this clinic."}
        return await booking_adapter.cancel(booking_id)

    @tool
    async def reschedule_appointment(booking_id: str, new_date: str, new_time_slot: str) -> dict:
        """Reschedule one of the patient's appointments at this clinic."""
        if not _ctx.get().get("user_id"):
            return {"success": False, "message": _GUEST_MSG}
        if not await _owned_booking(booking_id):
            return {"success": False, "message": "That booking id doesn't belong to this "
                                                 "patient at this clinic."}
        return await booking_adapter.reschedule(booking_id, new_date, new_time_slot)

    return [check_availability, book_appointment, get_my_appointments,
            cancel_appointment, reschedule_appointment]


def _profile_text(hospital: dict, doctors: list[dict]) -> str:
    hours = hospital.get("hours") or {}
    hours_txt = "; ".join(f"{k}: {v}" for k, v in hours.items()) or "not specified"
    docs = "; ".join(
        f"{d.get('name')} ({d.get('specialization') or 'general'}, "
        f"{d.get('years_experience', '?')} yrs)" for d in doctors
    ) or "not specified"
    return (
        f"Clinic: {hospital.get('name')}\n"
        f"Address: {hospital.get('address')}\n"
        f"Services: {', '.join(hospital.get('services', [])) or 'general dentistry'}\n"
        f"Hours: {hours_txt}\n"
        f"Doctors: {docs}\n"
        f"Insurance/payment: {', '.join(hospital.get('insurance_accepted', [])) or 'not specified'}"
    )


def get_clinic_agent(hospital: dict, doctors: list[dict]):
    hospital_id = str(hospital["_id"])
    today = date.today().isoformat()
    cached = _agents.get(hospital_id)
    if cached and cached[0] == today:
        return cached[1]
    # Tool-following matters more than cost here: flash-lite loops on multi-turn
    # booking (re-asks answered questions), so use the stronger chat model.
    llm = ChatGoogleGenerativeAI(
        model=settings.CLINIC_MODEL, google_api_key=settings.GOOGLE_API_KEY, temperature=0.3,
    )
    prompt = CLINIC_SYSTEM_PROMPT.format(
        clinic_name=hospital.get("name"), today=today,
        profile=_profile_text(hospital, doctors),
    )
    agent = create_agent(llm, make_clinic_tools(hospital_id), system_prompt=prompt)
    _agents[hospital_id] = (today, agent)
    log.info("Clinic agent built for %s", hospital.get("name"))
    return agent


async def run_clinic(hospital: dict, doctors: list[dict], message: str,
                     history: list[dict], patient: dict) -> dict:
    """Run one clinic-widget turn for a patient. Returns {reply}."""
    _ctx.set({"user_id": patient.get("id"), "name": patient.get("name"),
              "phone": patient.get("phone")})
    started = time.perf_counter()
    log.info("run_clinic | hospital=%s | history=%d | msg=%r",
             hospital.get("name"), len(history), message[:100])
    try:
        agent = get_clinic_agent(hospital, doctors)
        result = await agent.ainvoke({"messages": _to_lc_messages(history, message)})
        # Trace tool usage so booking loops/failures are visible in the log.
        for m in result.get("messages", []):
            tcs = getattr(m, "tool_calls", None)
            if tcs:
                log.info("clinic agent called tools: %s", [tc.get("name") for tc in tcs])
            if m.__class__.__name__ == "ToolMessage":
                log.info("tool result | %s -> %r", getattr(m, "name", "?"), str(m.content)[:160])
        reply = _extract_reply(result.get("messages", [])) or \
            "I'm sorry, I didn't catch that. Could you rephrase?"
        log.info("run_clinic OK in %.1fs | reply=%r", time.perf_counter() - started, reply[:120])
    except Exception as exc:
        log.exception("Clinic agent failed: %s", exc)
        reply = _classify_error(exc)
    return {"reply": reply}
