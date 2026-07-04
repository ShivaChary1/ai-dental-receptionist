"""Patient reviews for hospitals + rating recomputation."""
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.deps import get_current_patient
from database import get_db

router = APIRouter(prefix="/api", tags=["reviews"])


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = ""


async def _recompute_rating(db, hospital_id: ObjectId) -> None:
    pipeline = [
        {"$match": {"hospital_id": hospital_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db.reviews.aggregate(pipeline).to_list(1)
    if agg:
        await db.hospitals.update_one(
            {"_id": hospital_id},
            {"$set": {"rating_avg": round(agg[0]["avg"], 2), "rating_count": agg[0]["count"]}},
        )


@router.get("/hospitals/{hospital_id}/reviews")
async def list_reviews(hospital_id: str) -> dict:
    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(400, "Invalid id.")
    cursor = db.reviews.find({"hospital_id": ObjectId(hospital_id)}).sort("created_at", -1)
    items = []
    async for r in cursor:
        items.append({
            "id": str(r["_id"]), "rating": r.get("rating"), "text": r.get("text"),
            "patient_name": r.get("patient_name") or "Patient",
            "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
        })
    return {"items": items}


@router.post("/hospitals/{hospital_id}/reviews")
async def add_review(
    hospital_id: str, payload: ReviewIn, patient: dict = Depends(get_current_patient)
) -> dict:
    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(400, "Invalid id.")
    hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
    if not hospital:
        raise HTTPException(404, "Hospital not found.")

    now = datetime.utcnow()
    # One review per patient per hospital — upsert.
    await db.reviews.update_one(
        {"hospital_id": ObjectId(hospital_id), "user_id": patient["id"]},
        {"$set": {"hospital_id": ObjectId(hospital_id), "user_id": patient["id"],
                  "patient_name": patient.get("name"), "rating": payload.rating,
                  "text": payload.text, "created_at": now}},
        upsert=True,
    )
    await _recompute_rating(db, ObjectId(hospital_id))
    return {"success": True}
