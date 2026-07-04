"""Calendar artifacts for bookings: .ics files and Google Calendar links.

Times are written as floating local times (the clinic's wall clock), which every
calendar app interprets in the viewer's local timezone — correct for same-city
dental visits and avoids VTIMEZONE bookkeeping.
"""
from datetime import datetime, timedelta
from urllib.parse import quote

SLOT_MINUTES = 30


def _times(booking: dict) -> tuple[datetime, datetime] | None:
    try:
        start = datetime.strptime(
            f"{booking.get('appointment_date')} {booking.get('time_slot')}",
            "%Y-%m-%d %I:%M %p")
    except (TypeError, ValueError):
        return None
    return start, start + timedelta(minutes=SLOT_MINUTES)


def _fmt(dt: datetime) -> str:
    return dt.strftime("%Y%m%dT%H%M%S")


def _escape(text: str) -> str:
    return (text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def event_fields(booking: dict, hospital: dict | None = None) -> dict | None:
    times = _times(booking)
    if not times:
        return None
    hospital = hospital or {}
    summary = f"{booking.get('service_type') or 'Dental appointment'} — {booking.get('hospital_name') or hospital.get('name') or 'clinic'}"
    description = (f"Appointment with {booking.get('doctor_name') or 'the dentist'} "
                   f"for {booking.get('patient_name') or 'a patient'}. Booked via SmileDesk.")
    return {
        "start": times[0], "end": times[1], "summary": summary,
        "description": description, "location": hospital.get("address") or "",
    }


def build_ics(booking: dict, hospital: dict | None = None, *,
              method: str = "PUBLISH", organizer_email: str = "",
              attendee_email: str = "", sequence: int = 0,
              status: str = "CONFIRMED") -> str | None:
    """RFC 5545 text. method=REQUEST + attendee makes Google/Outlook auto-add the
    event to the recipient's calendar; method=CANCEL removes it."""
    ev = event_fields(booking, hospital)
    if not ev:
        return None
    uid = f"{booking.get('id') or booking.get('_id')}@smiledesk"
    lines = [
        "BEGIN:VCALENDAR",
        "PRODID:-//SmileDesk//Booking//EN",
        "VERSION:2.0",
        f"METHOD:{method}",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{_fmt(datetime.utcnow())}Z",
        f"DTSTART:{_fmt(ev['start'])}",
        f"DTEND:{_fmt(ev['end'])}",
        f"SEQUENCE:{sequence}",
        f"STATUS:{'CANCELLED' if method == 'CANCEL' else status}",
        f"SUMMARY:{_escape(ev['summary'])}",
        f"DESCRIPTION:{_escape(ev['description'])}",
    ]
    if ev["location"]:
        lines.append(f"LOCATION:{_escape(ev['location'])}")
    if organizer_email:
        lines.append(f"ORGANIZER;CN=SmileDesk:mailto:{organizer_email}")
    if attendee_email:
        lines.append("ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;"
                     f"RSVP=TRUE:mailto:{attendee_email}")
    lines += ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Dental appointment",
              "TRIGGER:-PT1H", "END:VALARM", "END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(lines) + "\r\n"


def google_calendar_link(booking: dict, hospital: dict | None = None) -> str | None:
    ev = event_fields(booking, hospital)
    if not ev:
        return None
    return ("https://calendar.google.com/calendar/render?action=TEMPLATE"
            f"&text={quote(ev['summary'])}"
            f"&dates={_fmt(ev['start'])}/{_fmt(ev['end'])}"
            f"&details={quote(ev['description'])}"
            f"&location={quote(ev['location'])}")
