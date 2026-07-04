"""WhatsApp webhook (Meta Cloud API): verification + inbound message handling."""
from fastapi import APIRouter, Query, Request, Response, status

from config import settings
from logging_config import get_logger
from services.conversation import handle_message
from services.whatsapp import send_text

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])
log = get_logger("whatsapp")


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query("", alias="hub.mode"),
    hub_challenge: str = Query("", alias="hub.challenge"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
):
    """Meta calls this once to verify the webhook. Echo the challenge on match."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN \
            and settings.WHATSAPP_VERIFY_TOKEN:
        log.info("WhatsApp webhook verified.")
        return Response(content=hub_challenge, media_type="text/plain")
    log.warning("WhatsApp webhook verification failed (mode=%s).", hub_mode)
    return Response(status_code=status.HTTP_403_FORBIDDEN)


def _extract_messages(body: dict) -> list[dict]:
    """Pull [{from, text}] out of a Meta webhook payload. Ignores non-text/status events."""
    out: list[dict] = []
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for msg in value.get("messages", []):
                if msg.get("type") == "text":
                    out.append({
                        "from": msg.get("from"),
                        "text": msg.get("text", {}).get("body", ""),
                    })
    return out


@router.post("/webhook")
async def receive_webhook(request: Request) -> dict:
    """Handle inbound WhatsApp messages: run the agent and reply. Always 200 fast."""
    body = await request.json()
    messages = _extract_messages(body)
    if not messages:
        return {"status": "ignored"}

    for m in messages:
        phone, text = m["from"], m["text"]
        if not phone or not text:
            continue
        log.info("WhatsApp inbound from %s: %r", phone, text[:120])
        session_id = f"wa:{phone}"
        result = await handle_message(
            session_id, text, {"phone": phone, "channel": "whatsapp"}
        )
        await send_text(phone, result["reply"])

    return {"status": "ok", "handled": len(messages)}
