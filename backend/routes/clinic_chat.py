"""Per-clinic AI widget chat. Signed-in patients get one persistent thread per
clinic; guests can chat too (capped, keyed by a client session id) — booking
stays gated behind sign-in inside the agent's tools."""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agent.clinic_agent import run_clinic
from auth.deps import optional_user
from database import get_db

router = APIRouter(prefix="/api/hospitals", tags=["clinic-chat"])

GUEST_MESSAGE_LIMIT = 5


class ClinicChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # guest session (no auth)


def _thread_query(hospital_id: str, patient: dict | None, session_id: str | None) -> dict | None:
    if patient:
        return {"user_id": patient["id"], "hospital_id": hospital_id, "kind": "clinic"}
    if session_id:
        return {"guest_session": session_id, "hospital_id": hospital_id, "kind": "clinic"}
    return None


@router.get("/{hospital_id}/chat")
async def get_clinic_thread(
    hospital_id: str,
    session_id: Optional[str] = None,
    patient: Optional[dict] = Depends(optional_user),
) -> dict:
    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(400, "Invalid id.")
    query = _thread_query(hospital_id, patient, session_id)
    convo = await db.conversations.find_one(query) if query else None
    msgs = convo.get("messages", []) if convo else []
    out = {"messages": [{"role": m["role"], "content": m["content"]} for m in msgs]}
    if not patient:
        user_turns = sum(1 for m in msgs if m.get("role") == "user")
        out["guest_remaining"] = max(0, GUEST_MESSAGE_LIMIT - user_turns)
    return out


@router.post("/{hospital_id}/chat")
async def clinic_chat(
    hospital_id: str, req: ClinicChatRequest,
    patient: Optional[dict] = Depends(optional_user),
) -> dict:
    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(400, "Invalid id.")
    if not patient and not req.session_id:
        raise HTTPException(400, "session_id required for guest chat.")
    hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id), "status": "active"})
    if not hospital:
        raise HTTPException(404, "Clinic not found.")
    doctors = await db.doctors.find({"hospital_id": hospital["_id"]}).to_list(length=None)

    now = datetime.utcnow()
    query = _thread_query(hospital_id, patient, req.session_id)
    convo = await db.conversations.find_one(query)
    if convo is None:
        convo = {
            "user_id": patient["id"] if patient else None,
            "guest_session": None if patient else req.session_id,
            "hospital_id": hospital_id, "kind": "clinic",
            "hospital_name": hospital.get("name"),
            "patient_name": patient.get("name") if patient else "Guest",
            "messages": [], "intent_log": [], "started_at": now, "last_active": now,
        }
        result = await db.conversations.insert_one(convo)
        convo["_id"] = result.inserted_id

    history = convo.get("messages", [])

    # Guest cap: after N questions, ask them to sign in (free) to continue.
    if not patient:
        user_turns = sum(1 for m in history if m.get("role") == "user")
        if user_turns >= GUEST_MESSAGE_LIMIT:
            return {"reply": "You've reached the guest limit for this chat. Sign in "
                             "(it's free) to keep talking and book appointments — "
                             "this conversation will carry over.",
                    "limit_reached": True, "guest_remaining": 0}

    out = await run_clinic(hospital, doctors, req.message, history, patient or {})

    history.append({"role": "user", "content": req.message, "timestamp": now})
    history.append({"role": "assistant", "content": out["reply"], "timestamp": datetime.utcnow()})
    await db.conversations.update_one(
        {"_id": convo["_id"]},
        {"$set": {"messages": history, "last_active": datetime.utcnow()}},
    )
    resp = {"reply": out["reply"]}
    if not patient:
        user_turns = sum(1 for m in history if m.get("role") == "user")
        resp["guest_remaining"] = max(0, GUEST_MESSAGE_LIMIT - user_turns)
    return resp
