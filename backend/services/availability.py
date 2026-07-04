"""Availability engine — the single source of truth for free appointment slots.

A slot is free when it survives all four filters:
1. The doctor's weekly working hours (falls back to clinic hours, then 9:00-18:30).
2. Clinic blocks/holidays (`schedule_blocks`: clinic-wide or per-doctor, all-day or slots).
3. Internal bookings (status booked/rescheduled).
4. Busy events on the doctor's linked Google Calendar iCal feed (`calendar_ical_url`).
"""
import asyncio
import re
import time
from datetime import date as date_cls
from datetime import datetime, timedelta

import httpx

from database import get_db
from logging_config import get_logger

log = get_logger("availability")

SLOT_MINUTES = 30
WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

# iCal feed cache: url -> (fetched_at, [(start_dt, end_dt), ...] window ~60 days)
_ical_cache: dict[str, tuple[float, list]] = {}
_ICAL_TTL = 300  # seconds


def slot_start(date: str, slot: str) -> datetime | None:
    try:
        return datetime.strptime(f"{date} {slot}", "%Y-%m-%d %I:%M %p")
    except (TypeError, ValueError):
        return None


def _parse_range(spec: str) -> tuple[int, int] | None:
    """'09:00-18:00' -> (minutes_from_midnight_start, end). None for 'off'/'closed'/bad."""
    if not spec or spec.strip().lower() in ("off", "closed", "holiday", "-"):
        return None
    m = re.match(r"^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$", spec)
    if not m:
        return None
    start = int(m.group(1)) * 60 + int(m.group(2))
    end = int(m.group(3)) * 60 + int(m.group(4))
    return (start, end) if end > start else None


def _grid(window: tuple[int, int]) -> list[str]:
    """30-min slot labels covering [start, end) minutes-from-midnight."""
    start, end = window
    out = []
    minute = start if start % SLOT_MINUTES == 0 else start + (SLOT_MINUTES - start % SLOT_MINUTES)
    while minute + SLOT_MINUTES <= end:
        dt = datetime(2000, 1, 1, minute // 60, minute % 60)
        out.append(dt.strftime("%I:%M %p").lstrip("0"))
        minute += SLOT_MINUTES
    return out


def base_slots(hospital: dict | None, doctor: dict | None, date: str) -> list[str]:
    """Slot grid from the doctor's working hours, else clinic hours, else 9:00-18:30."""
    try:
        weekday = WEEKDAYS[datetime.strptime(date, "%Y-%m-%d").weekday()]
    except ValueError:
        weekday = None

    for source in ((doctor or {}).get("working_hours"), (hospital or {}).get("hours")):
        if not isinstance(source, dict) or not source:
            continue
        if weekday is None:
            break
        spec = source.get(weekday)
        if spec is None:
            # Hours dict exists but this day isn't listed -> closed that day.
            return []
        window = _parse_range(str(spec))
        return _grid(window) if window else []
    return _grid((9 * 60, 18 * 60 + 30))


async def _ical_busy(url: str) -> list[tuple[datetime, datetime]]:
    """Busy (start, end) intervals from an iCal feed, cached. Failures -> empty."""
    now = time.time()
    cached = _ical_cache.get(url)
    if cached and now - cached[0] < _ICAL_TTL:
        return cached[1]
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        intervals = await asyncio.to_thread(_parse_ical, resp.text)
        _ical_cache[url] = (now, intervals)
        return intervals
    except Exception as exc:
        log.warning("iCal feed unavailable (%s): %s", url[:60], exc)
        _ical_cache[url] = (now, cached[1] if cached else [])
        return _ical_cache[url][1]


def _parse_ical(text: str) -> list[tuple[datetime, datetime]]:
    """Expand events (incl. recurring) over the next 60 days into naive local intervals."""
    import icalendar
    import recurring_ical_events

    cal = icalendar.Calendar.from_ical(text)
    start = date_cls.today()
    end = start + timedelta(days=60)
    intervals = []
    for ev in recurring_ical_events.of(cal).between(start, end):
        s, e = ev.get("DTSTART"), ev.get("DTEND")
        if s is None:
            continue
        s = s.dt
        e = e.dt if e is not None else s
        if isinstance(s, datetime):
            s = s.astimezone().replace(tzinfo=None) if s.tzinfo else s
            e = (e.astimezone().replace(tzinfo=None) if getattr(e, "tzinfo", None) else e)
        else:  # all-day event
            s = datetime.combine(s, datetime.min.time())
            e = datetime.combine(e, datetime.min.time())
        if e > s:
            intervals.append((s, e))
    return intervals


async def get_free_slots(hospital: dict, doctor_name: str, date: str,
                         doctor: dict | None = None) -> list[str]:
    """Free 30-min slots for a doctor at a clinic on a date (YYYY-MM-DD)."""
    db = get_db()
    if doctor is None and doctor_name:
        doctor = await db.doctors.find_one({
            "hospital_id": hospital["_id"],
            "name": {"$regex": f"^{re.escape(doctor_name.strip())}$", "$options": "i"},
        })

    slots = base_slots(hospital, doctor, date)
    if not slots:
        return []

    # Clinic-wide and per-doctor blocks/holidays.
    blocks = await db.schedule_blocks.find(
        {"hospital_id": hospital["_id"], "date": date}).to_list(length=None)
    for blk in blocks:
        who = (blk.get("doctor_name") or "").strip().lower()
        if who and who != doctor_name.strip().lower():
            continue
        if blk.get("all_day"):
            return []
        blocked = set(blk.get("slots") or [])
        slots = [s for s in slots if s not in blocked]

    # Internal bookings.
    cursor = db.bookings.find({
        "hospital_id": hospital["_id"],
        "doctor_name": {"$regex": f"^{re.escape(doctor_name.strip())}$", "$options": "i"},
        "appointment_date": date,
        "status": {"$in": ["booked", "rescheduled"]},
    })
    booked = {b.get("time_slot") async for b in cursor}
    slots = [s for s in slots if s not in booked]

    # Busy events on the doctor's linked calendar.
    ical_url = (doctor or {}).get("calendar_ical_url")
    if ical_url and slots:
        busy = await _ical_busy(ical_url)
        if busy:
            kept = []
            for s in slots:
                start = slot_start(date, s)
                if start is None:
                    continue
                end = start + timedelta(minutes=SLOT_MINUTES)
                if not any(bs < end and be > start for bs, be in busy):
                    kept.append(s)
            slots = kept

    # Never offer slots in the past.
    now = datetime.now()
    return [s for s in slots if (st := slot_start(date, s)) and st > now]
