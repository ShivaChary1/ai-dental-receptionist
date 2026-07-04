"""Shared conversation handling used by both the web chat and WhatsApp webhook."""
from datetime import datetime
from typing import Optional

from agent.dental_agent import run_agent
from database import get_db
from logging_config import get_logger

log = get_logger("conversation")


async def handle_message(
    session_id: str,
    message: str,
    patient_meta: Optional[dict] = None,
) -> dict:
    """Load/create the conversation, run the agent, persist both turns.

    `patient_meta` may carry {name, phone, user_id, channel}. Returns
    {reply, intent, session_id}.
    """
    patient_meta = patient_meta or {}
    db = get_db()
    now = datetime.utcnow()

    convo = await db.conversations.find_one({"session_id": session_id})
    if convo is None:
        convo = {
            "session_id": session_id,
            "patient_name": patient_meta.get("name"),
            "patient_phone": patient_meta.get("phone"),
            "user_id": patient_meta.get("user_id"),
            "channel": patient_meta.get("channel", "web"),
            "messages": [],
            "intent_log": [],
            "appointment_ids": [],
            "started_at": now,
            "last_active": now,
        }

    history = convo.get("messages", [])
    result = await run_agent(message, history)
    reply, intent = result["reply"], result["intent"]

    history.append({"role": "user", "content": message, "timestamp": now})
    history.append({"role": "assistant", "content": reply, "timestamp": datetime.utcnow()})

    intent_log = convo.get("intent_log", [])
    if intent:
        intent_log.append(intent)

    update = {
        "session_id": session_id,
        "patient_name": patient_meta.get("name") or convo.get("patient_name"),
        "patient_phone": patient_meta.get("phone") or convo.get("patient_phone"),
        "user_id": patient_meta.get("user_id") or convo.get("user_id"),
        "channel": patient_meta.get("channel") or convo.get("channel", "web"),
        "messages": history,
        "intent_log": intent_log,
        "appointment_ids": convo.get("appointment_ids", []),
        "started_at": convo.get("started_at", now),
        "last_active": datetime.utcnow(),
    }
    await db.conversations.update_one(
        {"session_id": session_id}, {"$set": update}, upsert=True
    )

    return {"session_id": session_id, "reply": reply, "intent": intent}
