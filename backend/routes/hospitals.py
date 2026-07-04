"""Public hospital directory: list approved hospitals + detail."""
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query

from database import get_db
from models.hospital import serialize_doctor, serialize_hospital
from services.geo import haversine_km, is_open_now, maps_link

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])


def _decorate(h: dict, lat: float | None, lng: float | None) -> dict:
    out = serialize_hospital(h)
    out["maps_link"] = maps_link(h.get("location"), h.get("maps_link"))
    out["open_now"] = is_open_now(h.get("hours"))
    loc = h.get("location") or {}
    if lat is not None and lng is not None and loc.get("lat") is not None:
        out["distance_km"] = haversine_km(lat, lng, loc["lat"], loc["lng"])
    else:
        out["distance_km"] = None
    return out


@router.get("")
async def list_hospitals(
    sort: str = Query("rating", pattern="^(nearest|rating)$"),
    lat: float | None = None,
    lng: float | None = None,
    service: str | None = None,
    open_now: bool = False,
) -> dict:
    db = get_db()
    query: dict = {"status": "active"}
    if service:
        query["services"] = {"$regex": f"^{service}$", "$options": "i"}
    hospitals = await db.hospitals.find(query).to_list(length=None)

    items = [_decorate(h, lat, lng) for h in hospitals]
    if open_now:
        items = [i for i in items if i["open_now"]]

    if sort == "nearest" and lat is not None and lng is not None:
        items.sort(key=lambda i: i["distance_km"] if i["distance_km"] is not None else 1e9)
    else:
        items.sort(key=lambda i: i.get("rating_avg", 0), reverse=True)

    return {"items": items, "count": len(items)}


@router.get("/{hospital_id}")
async def hospital_detail(
    hospital_id: str, lat: float | None = None, lng: float | None = None
) -> dict:
    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(400, "Invalid id.")
    h = await db.hospitals.find_one({"_id": ObjectId(hospital_id), "status": "active"})
    if not h:
        raise HTTPException(404, "Hospital not found.")
    out = _decorate(h, lat, lng)
    doctors = await db.doctors.find({"hospital_id": h["_id"]}).to_list(length=None)
    out["doctors"] = [serialize_doctor(d, public=True) for d in doctors]
    return out


@router.get("/{hospital_id}/availability")
async def hospital_availability(hospital_id: str, doctor_name: str, date: str) -> dict:
    """Real free slots for a doctor on a date — honours working hours, blocks,
    existing bookings, and the doctor's linked calendar."""
    from services.availability import get_free_slots

    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(400, "Invalid id.")
    h = await db.hospitals.find_one({"_id": ObjectId(hospital_id), "status": "active"})
    if not h:
        raise HTTPException(404, "Hospital not found.")
    slots = await get_free_slots(h, doctor_name, date)
    return {"doctor_name": doctor_name, "date": date, "slots": slots}
