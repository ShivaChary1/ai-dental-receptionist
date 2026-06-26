"""Patient chat endpoint."""
from datetime import datetime

from fastapi import APIRouter

from agent.dental_agent import run_agent
from database import get_db
from logging_config import get_logger
from models.conversation import ChatRequest, ChatResponse

router = APIRouter(prefix="/api", tags=["chat"])
log = get_logger("chat")


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    log.info("POST /api/chat | session=%s | msg=%r", req.session_id, req.message[:120])
    db = get_db()
    now = datetime.utcnow()

    convo = await db.conversations.find_one({"session_id": req.session_id})
    if convo is None:
        convo = {
            "session_id": req.session_id,
            "patient_name": req.patient_name,
            "patient_phone": None,
            "messages": [],
            "intent_log": [],
            "appointment_ids": [],
            "started_at": now,
            "last_active": now,
        }

    history = convo.get("messages", [])
    result = await run_agent(req.message, history)
    reply, intent = result["reply"], result["intent"]

    history.append({"role": "user", "content": req.message, "timestamp": now})
    history.append({"role": "assistant", "content": reply, "timestamp": datetime.utcnow()})

    intent_log = convo.get("intent_log", [])
    if intent:
        intent_log.append(intent)

    update = {
        "session_id": req.session_id,
        "patient_name": req.patient_name or convo.get("patient_name"),
        "patient_phone": convo.get("patient_phone"),
        "messages": history,
        "intent_log": intent_log,
        "appointment_ids": convo.get("appointment_ids", []),
        "started_at": convo.get("started_at", now),
        "last_active": datetime.utcnow(),
    }
    await db.conversations.update_one(
        {"session_id": req.session_id}, {"$set": update}, upsert=True
    )

    return ChatResponse(session_id=req.session_id, reply=reply, intent=intent)
