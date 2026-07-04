"""General triage chat with saved conversations (patient-scoped)."""
import base64
import json
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.triage_agent import run_triage, stream_triage
from auth.deps import get_current_patient, optional_user
from config import settings
from database import get_db
from logging_config import get_logger

router = APIRouter(prefix="/api/triage", tags=["triage"])
log = get_logger("triage-chat")

# Anonymous visitors can try the assistant before signing up; the cap is the
# moment we ask for an account (history + booking need one anyway).
GUEST_MESSAGE_LIMIT = 5


class TriageRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None
    location: Optional[dict] = None  # {lat, lng}
    session_id: Optional[str] = None  # guest session (no auth)
    mode: Optional[str] = "consumer"  # consumer | professional
    image_data: Optional[str] = None  # base64 image → routes to image analysis


def _estimate_cost(model: str | None, query: str, reply: str) -> float:
    """Rough cost estimate for the query log (chars/4 ≈ tokens)."""
    pricing = settings.MODEL_PRICING.get(model or "", settings.MODEL_PRICING["gemini-2.5-flash"])
    in_tok, out_tok = len(query) / 4, len(reply or "") / 4
    return round((in_tok * pricing[0] + out_tok * pricing[1]) / 1_000_000, 6)


async def _log_query(patient: Optional[dict], req_mode: str, query: str, out: dict) -> None:
    try:
        db = get_db()
        await db.queries_log.insert_one({
            "user_id": patient.get("id") if patient else None,
            "route": out.get("route"),
            "mode": req_mode,
            "query": query[:500],
            "retrieved_chunk_ids": [c.get("source_id") for c in out.get("citations", [])],
            "model_used": out.get("model_used"),
            "cost_usd": _estimate_cost(out.get("model_used"), query, out.get("reply", "")),
            "urgency": (out.get("urgency") or {}).get("level"),
            "created_at": datetime.utcnow(),
        })
    except Exception:  # logging must never break a reply
        log.warning("queries_log insert failed", exc_info=True)


class ClaimRequest(BaseModel):
    session_id: str


def _title_from(text: str) -> str:
    t = text.strip().split("\n")[0]
    return (t[:48] + "…") if len(t) > 48 else t


async def _get_or_create_convo(req: TriageRequest, patient: Optional[dict]):
    """Resolve the conversation for this turn. Returns (convo, limit_response):
    limit_response is a dict to return immediately when the guest cap is hit."""
    db = get_db()
    now = datetime.utcnow()

    if patient:
        if req.chat_id:
            if not ObjectId.is_valid(req.chat_id):
                raise HTTPException(400, "Invalid chat id.")
            convo = await db.conversations.find_one({"_id": ObjectId(req.chat_id)})
            if not convo or convo.get("user_id") != patient["id"]:
                raise HTTPException(404, "Chat not found.")
        else:
            convo = {
                "user_id": patient["id"], "kind": "triage", "hospital_id": None,
                "title": _title_from(req.message), "messages": [], "intent_log": [],
                "started_at": now, "last_active": now,
            }
            result = await db.conversations.insert_one(convo)
            convo["_id"] = result.inserted_id
        return convo, None

    # Guest chat: keyed by an opaque client session id, capped, claimable
    # after signup so the conversation isn't lost.
    if not req.session_id:
        raise HTTPException(400, "session_id required for guest chat.")
    convo = await db.conversations.find_one(
        {"guest_session": req.session_id, "kind": "triage"}
    )
    if convo is None:
        convo = {
            "user_id": None, "guest_session": req.session_id, "kind": "triage",
            "hospital_id": None, "title": _title_from(req.message),
            "messages": [], "intent_log": [], "started_at": now, "last_active": now,
        }
        result = await db.conversations.insert_one(convo)
        convo["_id"] = result.inserted_id
    user_turns = sum(1 for m in convo.get("messages", []) if m.get("role") == "user")
    if user_turns >= GUEST_MESSAGE_LIMIT:
        return convo, {"chat_id": str(convo["_id"]), "reply": None, "recommendations": [],
                       "urgency": None, "limit_reached": True, "guest_remaining": 0}
    return convo, None


async def _persist_turn(convo: dict, message: str, out: dict, patient: Optional[dict],
                        mode: str = "consumer") -> dict:
    """Append the turn to the conversation, log it, and build the API response."""
    db = get_db()
    history = convo.get("messages", [])
    history.append({"role": "user", "content": message, "timestamp": datetime.utcnow()})
    history.append({"role": "assistant", "content": out["reply"],
                    "recommendations": out.get("recommendations", []),
                    "urgency": out.get("urgency"),
                    "citations": out.get("citations", []),
                    "safety_flags": out.get("safety_flags", []),
                    "structured_findings": out.get("structured_findings"),
                    "timestamp": datetime.utcnow()})
    await db.conversations.update_one(
        {"_id": convo["_id"]},
        {"$set": {"messages": history, "last_active": datetime.utcnow()}},
    )
    await _log_query(patient, mode, message, out)
    resp = {"chat_id": str(convo["_id"]), "reply": out["reply"],
            "recommendations": out.get("recommendations", []),
            "urgency": out.get("urgency"),
            "citations": out.get("citations", []),
            "route": out.get("route"),
            "safety_flags": out.get("safety_flags", []),
            "structured_findings": out.get("structured_findings"),
            "mode": mode}
    if not patient:
        user_turns = sum(1 for m in history if m.get("role") == "user")
        resp["guest_remaining"] = max(0, GUEST_MESSAGE_LIMIT - user_turns)
    return resp


@router.post("/chat")
async def triage_chat(req: TriageRequest, patient: Optional[dict] = Depends(optional_user)) -> dict:
    convo, limit_response = await _get_or_create_convo(req, patient)
    if limit_response:
        return limit_response
    out = await run_triage(req.message, convo.get("messages", []), req.location, patient,
                           mode=req.mode or "consumer", image_data=req.image_data)
    return await _persist_turn(convo, req.message, out, patient, req.mode or "consumer")


@router.post("/chat/stream")
async def triage_chat_stream(req: TriageRequest, patient: Optional[dict] = Depends(optional_user)):
    """Server-sent events: `token` deltas while the model writes, then a final
    `done` event with the same payload shape as POST /chat."""
    convo, limit_response = await _get_or_create_convo(req, patient)

    async def gen():
        if limit_response:
            yield f"data: {json.dumps({'type': 'done', **limit_response})}\n\n"
            return
        history = convo.get("messages", [])
        async for kind, payload in stream_triage(req.message, history, req.location, patient,
                                                 mode=req.mode or "consumer",
                                                 image_data=req.image_data):
            if kind == "token":
                yield f"data: {json.dumps({'type': 'token', 'text': payload})}\n\n"
            elif kind == "step":
                yield f"data: {json.dumps({'type': 'step', 'node': payload})}\n\n"
            else:  # done
                resp = await _persist_turn(convo, req.message, payload, patient,
                                           req.mode or "consumer")
                yield f"data: {json.dumps({'type': 'done', **resp})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...), note: str = "",
                        mode: str = "consumer",
                        patient: Optional[dict] = Depends(optional_user)) -> dict:
    """Stateless dental image analysis → structured findings JSON."""
    raw = await file.read()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 8 MB).")
    b64 = base64.b64encode(raw).decode()
    out = await run_triage(note or "Please analyse this dental image.", [], None, patient,
                           mode=mode, image_data=b64)
    await _log_query(patient, mode, f"[image] {note}", out)
    return out


@router.post("/analyze-report")
async def analyze_report(file: UploadFile = File(...), note: str = "",
                         mode: str = "consumer",
                         patient: Optional[dict] = Depends(optional_user)) -> dict:
    """Dental report/document (PDF, txt, md) → plain-language, cited explanation."""
    name = (file.filename or "").lower()
    raw = await file.read()
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 15 MB).")
    if name.endswith(".pdf"):
        try:
            import fitz  # pymupdf
            doc = fitz.open(stream=raw, filetype="pdf")
            text = "\n\n".join(page.get_text() for page in doc)
            doc.close()
        except Exception:
            raise HTTPException(400, "Couldn't read that PDF.")
    elif name.endswith((".txt", ".md")):
        text = raw.decode("utf-8", errors="replace")
    else:
        raise HTTPException(400, "Supported report formats: PDF, TXT, MD. "
                                 "For scans or photos, share them as an image instead.")
    out = await run_triage(note or "Please explain this dental report.", [], None, patient,
                           mode=mode, document_text=text)
    await _log_query(patient, mode, f"[report] {note}", out)
    return out


@router.post("/claim")
async def claim_guest_chat(req: ClaimRequest, patient: dict = Depends(get_current_patient)) -> dict:
    """Attach a guest conversation to the freshly signed-up patient."""
    db = get_db()
    result = await db.conversations.update_one(
        {"guest_session": req.session_id, "kind": "triage", "user_id": None},
        {"$set": {"user_id": patient["id"], "last_active": datetime.utcnow()},
         "$unset": {"guest_session": ""}},
    )
    return {"claimed": result.modified_count > 0}


@router.get("/chats")
async def list_chats(patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    cursor = db.conversations.find(
        {"user_id": patient["id"], "kind": "triage"}
    ).sort("last_active", -1)
    items = []
    async for c in cursor:
        msgs = c.get("messages", [])
        items.append({
            "id": str(c["_id"]),
            "title": c.get("title") or "New chat",
            "last_message": (msgs[-1]["content"][:80] if msgs else ""),
            "last_active": c.get("last_active").isoformat() if c.get("last_active") else None,
        })
    return {"items": items}


@router.get("/chats/{chat_id}")
async def get_chat(chat_id: str, patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    if not ObjectId.is_valid(chat_id):
        raise HTTPException(400, "Invalid id.")
    c = await db.conversations.find_one({"_id": ObjectId(chat_id)})
    if not c or c.get("user_id") != patient["id"]:
        raise HTTPException(404, "Chat not found.")
    return {
        "id": str(c["_id"]),
        "title": c.get("title"),
        "messages": [
            {"role": m["role"], "content": m["content"],
             "recommendations": m.get("recommendations", []),
             "urgency": m.get("urgency"),
             "citations": m.get("citations", []),
             "structured_findings": m.get("structured_findings")}
            for m in c.get("messages", [])
        ],
    }


@router.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str, patient: dict = Depends(get_current_patient)) -> dict:
    db = get_db()
    if not ObjectId.is_valid(chat_id):
        raise HTTPException(400, "Invalid id.")
    result = await db.conversations.delete_one(
        {"_id": ObjectId(chat_id), "user_id": patient["id"], "kind": "triage"}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Chat not found.")
    return {"success": True}
