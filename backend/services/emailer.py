"""Email send layer (SMTP), with a log-only stub until SMTP creds are configured.

Supports attaching an iCalendar part with a METHOD (REQUEST/CANCEL) so Google
Calendar and Outlook auto-add/remove the event on the recipient's calendar —
this is how bookings land directly in a doctor's Google Calendar without OAuth.
"""
import asyncio
import smtplib
from email.message import EmailMessage

from config import settings
from logging_config import get_logger

log = get_logger("emailer")


def is_live() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


async def send_email(to: str, subject: str, body: str, *,
                     ics: str | None = None, ics_method: str = "REQUEST") -> dict:
    if not to:
        return {"sent": False, "error": "no recipient"}
    if not is_live():
        log.info("[EMAIL STUB] -> %s | %s | %s%s", to, subject, body[:160],
                 " (+ics)" if ics else "")
        return {"stub": True, "to": to}

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    if ics:
        # text/calendar with method= makes mail clients treat it as a live invite.
        msg.add_attachment(ics.encode("utf-8"), maintype="text", subtype="calendar",
                           filename="appointment.ics",
                           params={"method": ics_method, "charset": "UTF-8"})

    def _send():
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            smtp.ehlo()
            if settings.SMTP_STARTTLS:
                smtp.starttls()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)

    try:
        await asyncio.to_thread(_send)
        log.info("Email sent to %s: %s", to, subject)
        return {"sent": True, "to": to}
    except Exception as exc:
        log.exception("Email send failed to %s: %s", to, exc)
        return {"sent": False, "to": to, "error": str(exc)}
