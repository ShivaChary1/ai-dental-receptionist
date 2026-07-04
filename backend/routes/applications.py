"""Hospital onboarding: public application + super-admin approval workflow."""
import secrets
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.deps import require_superadmin
from auth.security import hash_password
from database import get_db
from logging_config import get_logger
from models.application import ApplicationIn, ReviewDecision
from models.hospital import serialize_doctor, serialize_hospital
from models.hospital_staff import new_staff_doc
from services.notifications import notify

router = APIRouter(prefix="/api", tags=["applications"])
log = get_logger("applications")


def _serialize_app(doc: dict) -> dict:
    out = dict(doc)
    out["id"] = str(out.pop("_id"))
    for k, v in list(out.items()):
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            out[k] = str(v)
    return out


# ---- Public: apply to join ----
@router.post("/apply")
async def apply(payload: ApplicationIn) -> dict:
    db = get_db()
    now = datetime.utcnow()
    doc = payload.model_dump()
    doc.update({"status": "pending", "review_notes": None,
                "created_at": now, "updated_at": now})
    result = await db.hospital_applications.insert_one(doc)
    log.info("New clinic application: %s", payload.clinic_name)
    await notify(audience="superadmin", subject="New clinic application",
                 body=f"{payload.clinic_name} applied to join.",
                 ref={"application_id": str(result.inserted_id)})
    return {"success": True, "application_id": str(result.inserted_id),
            "status": "pending"}


# ---- Super admin: review queue ----
@router.get("/superadmin/applications")
async def list_applications(
    status_filter: str | None = Query(None, alias="status"),
    _admin: dict = Depends(require_superadmin),
) -> dict:
    db = get_db()
    query = {"status": status_filter} if status_filter else {}
    cursor = db.hospital_applications.find(query).sort("created_at", -1)
    return {"items": [_serialize_app(a) async for a in cursor]}


@router.get("/superadmin/applications/{app_id}")
async def get_application(app_id: str, _admin: dict = Depends(require_superadmin)) -> dict:
    db = get_db()
    if not ObjectId.is_valid(app_id):
        raise HTTPException(400, "Invalid id.")
    doc = await db.hospital_applications.find_one({"_id": ObjectId(app_id)})
    if not doc:
        raise HTTPException(404, "Application not found.")
    return _serialize_app(doc)


@router.post("/superadmin/applications/{app_id}/approve")
async def approve_application(
    app_id: str, decision: ReviewDecision, _admin: dict = Depends(require_superadmin)
) -> dict:
    db = get_db()
    if not ObjectId.is_valid(app_id):
        raise HTTPException(400, "Invalid id.")
    app_doc = await db.hospital_applications.find_one({"_id": ObjectId(app_id)})
    if not app_doc:
        raise HTTPException(404, "Application not found.")
    if app_doc.get("status") == "approved":
        raise HTTPException(409, "Application already approved.")

    now = datetime.utcnow()
    # Create the hospital record.
    hospital = {
        "name": app_doc["clinic_name"],
        "description": app_doc.get("description"),
        "address": app_doc.get("address"),
        "location": app_doc.get("location"),
        "maps_link": app_doc.get("maps_link"),
        "contact": app_doc.get("contact"),
        "hours": app_doc.get("hours", {}),
        "services": app_doc.get("services", []),
        "photos": app_doc.get("photos", []),
        "booking_config": app_doc.get("booking_config", {"mode": "internal"}),
        "insurance_accepted": app_doc.get("insurance_accepted", []),
        "registration_number": app_doc.get("registration_number"),
        "rating_avg": 0.0,
        "rating_count": 0,
        "status": "active",
        "application_id": app_doc["_id"],
        "created_at": now,
        "updated_at": now,
    }
    hosp_result = await db.hospitals.insert_one(hospital)
    hospital_id = hosp_result.inserted_id

    # Create doctor records.
    for d in app_doc.get("doctors", []):
        doc = dict(d)
        doc["hospital_id"] = hospital_id
        doc["created_at"] = now
        await db.doctors.insert_one(doc)

    # Create the first staff login with a generated password.
    staff_email = app_doc["contact"]["email"]
    temp_password = secrets.token_urlsafe(9)
    staff = new_staff_doc(
        hospital_id=hospital_id,
        email=staff_email,
        name=app_doc["contact"].get("poc_name") or app_doc["clinic_name"],
        password_hash=hash_password(temp_password),
    )
    try:
        await db.hospital_staff_users.insert_one(staff)
        staff_created = True
    except Exception as exc:  # e.g. email already used by another clinic
        log.warning("Staff account not created for %s: %s", staff_email, exc)
        staff_created = False

    await db.hospital_applications.update_one(
        {"_id": app_doc["_id"]},
        {"$set": {"status": "approved", "review_notes": decision.notes,
                  "hospital_id": hospital_id, "updated_at": now}},
    )

    # "Send" credentials (logged in dev via notification stub).
    cred_line = (f"Login at /hospital/login with email {staff_email} and password "
                 f"{temp_password}") if staff_created else \
                f"Login email {staff_email} already existed; use your existing password."
    await notify(audience="hospital", email=staff_email,
                 subject="Your clinic has been approved 🎉",
                 body=f"{app_doc['clinic_name']} is now live on SmileCare. {cred_line}",
                 ref={"hospital_id": str(hospital_id)})
    log.info("Approved %s -> hospital %s (staff pw shown in notify log)",
             app_doc["clinic_name"], hospital_id)

    return {"success": True, "hospital_id": str(hospital_id),
            "staff_email": staff_email,
            "temp_password": temp_password if staff_created else None}


@router.post("/superadmin/applications/{app_id}/reject")
async def reject_application(
    app_id: str, decision: ReviewDecision, _admin: dict = Depends(require_superadmin)
) -> dict:
    db = get_db()
    if not ObjectId.is_valid(app_id):
        raise HTTPException(400, "Invalid id.")
    app_doc = await db.hospital_applications.find_one({"_id": ObjectId(app_id)})
    if not app_doc:
        raise HTTPException(404, "Application not found.")
    await db.hospital_applications.update_one(
        {"_id": app_doc["_id"]},
        {"$set": {"status": "rejected", "review_notes": decision.notes,
                  "updated_at": datetime.utcnow()}},
    )
    await notify(audience="hospital", email=app_doc["contact"]["email"],
                 subject="Update on your SmileCare application",
                 body=f"Your application for {app_doc['clinic_name']} was not approved. "
                      f"{decision.notes or ''}".strip(),
                 ref={"application_id": app_id})
    return {"success": True, "status": "rejected"}


@router.post("/superadmin/applications/{app_id}/request-info")
async def request_info(
    app_id: str, decision: ReviewDecision, _admin: dict = Depends(require_superadmin)
) -> dict:
    db = get_db()
    if not ObjectId.is_valid(app_id):
        raise HTTPException(400, "Invalid id.")
    result = await db.hospital_applications.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": {"status": "info_requested", "review_notes": decision.notes,
                  "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Application not found.")
    return {"success": True, "status": "info_requested"}


# ---- Super admin: live hospitals ----
@router.get("/superadmin/hospitals")
async def list_live_hospitals(_admin: dict = Depends(require_superadmin)) -> dict:
    db = get_db()
    cursor = db.hospitals.find().sort("created_at", -1)
    items = []
    async for h in cursor:
        doctors = await db.doctors.count_documents({"hospital_id": h["_id"]})
        items.append(serialize_hospital(h, extra={"doctor_count": doctors}))
    return {"items": items}


@router.get("/superadmin/metrics")
async def platform_metrics(_admin: dict = Depends(require_superadmin)) -> dict:
    db = get_db()
    active = await db.hospitals.count_documents({"status": "active"})
    suspended = await db.hospitals.count_documents({"status": "suspended"})
    pending = await db.hospital_applications.count_documents({"status": "pending"})
    total_bookings = await db.bookings.count_documents({})
    cancelled = await db.bookings.count_documents({"status": "cancelled"})
    patients = await db.users.count_documents({})
    conversations = await db.conversations.count_documents({})
    return {
        "hospitals_active": active,
        "hospitals_suspended": suspended,
        "applications_pending": pending,
        "total_bookings": total_bookings,
        "cancelled_bookings": cancelled,
        "patients": patients,
        "conversations": conversations,
    }


@router.post("/superadmin/hospitals/{hospital_id}/status")
async def set_hospital_status(
    hospital_id: str, body: dict, _admin: dict = Depends(require_superadmin)
) -> dict:
    db = get_db()
    if not ObjectId.is_valid(hospital_id):
        raise HTTPException(400, "Invalid id.")
    new_status = body.get("status")
    if new_status not in ("active", "suspended"):
        raise HTTPException(400, "status must be 'active' or 'suspended'.")
    result = await db.hospitals.update_one(
        {"_id": ObjectId(hospital_id)},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Hospital not found.")
    return {"success": True, "status": new_status}
