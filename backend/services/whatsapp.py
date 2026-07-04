"""WhatsApp send layer (Meta Cloud API).

Until real credentials are configured, `send_text` logs the outgoing message
instead of calling Meta, so the whole flow is testable without a live number.
"""
import httpx

from config import settings
from logging_config import get_logger

log = get_logger("whatsapp")


def is_live() -> bool:
    """True only when real Meta credentials are present."""
    return bool(settings.WHATSAPP_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID)


async def send_text(to: str, body: str) -> dict:
    """Send a WhatsApp text message to `to` (E.164 phone, digits only).

    Returns a small status dict. In stub mode (no creds) it just logs.
    """
    if not is_live():
        log.info("[WHATSAPP STUB] -> %s: %s", to, body)
        return {"stub": True, "to": to}

    url = (f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}"
           f"/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages")
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body},
    }
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            log.info("WhatsApp sent to %s (status %s)", to, resp.status_code)
            return {"stub": False, "to": to, "status": resp.status_code}
    except Exception as exc:
        log.exception("WhatsApp send failed to %s: %s", to, exc)
        return {"stub": False, "to": to, "error": str(exc)}
