"""Patient chat endpoint."""
from typing import Optional

from fastapi import APIRouter, Depends

from auth.deps import optional_user
from logging_config import get_logger
from models.conversation import ChatRequest, ChatResponse
from services.conversation import handle_message

router = APIRouter(prefix="/api", tags=["chat"])
log = get_logger("chat")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    user: Optional[dict] = Depends(optional_user),
) -> ChatResponse:
    log.info("POST /api/chat | session=%s | authed=%s | msg=%r",
             req.session_id, bool(user), req.message[:120])

    patient_meta = {"channel": "web"}
    if user:
        patient_meta.update({
            "user_id": user.get("id"),
            "name": user.get("name") or req.patient_name,
            "phone": user.get("phone"),
        })
    elif req.patient_name:
        patient_meta["name"] = req.patient_name

    result = await handle_message(req.session_id, req.message, patient_meta)
    return ChatResponse(
        session_id=result["session_id"],
        reply=result["reply"],
        intent=result["intent"],
    )
