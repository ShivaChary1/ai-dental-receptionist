"""Geolocation helpers: haversine distance, maps link, open-now."""
import math
from datetime import datetime

_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points in kilometers."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)), 2)


def maps_link(location: dict | None, fallback: str | None = None) -> str | None:
    if location and location.get("lat") is not None and location.get("lng") is not None:
        return f"https://www.google.com/maps/search/?api=1&query={location['lat']},{location['lng']}"
    return fallback


def is_open_now(hours: dict | None, now: datetime | None = None) -> bool:
    """Interpret an hours map like {'mon': '09:00-18:00', 'sun': 'closed'}."""
    if not hours:
        return False
    now = now or datetime.now()
    key = _DAY_KEYS[now.weekday()]
    window = (hours.get(key) or "").strip().lower()
    if not window or window == "closed" or "-" not in window:
        return False
    try:
        start, end = window.split("-", 1)
        sh, sm = [int(x) for x in start.split(":")]
        eh, em = [int(x) for x in end.split(":")]
    except (ValueError, IndexError):
        return False
    minutes = now.hour * 60 + now.minute
    return sh * 60 + sm <= minutes <= eh * 60 + em
