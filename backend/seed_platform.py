"""Seed the multi-tenant platform with sample approved hospitals + staff logins.

Usage:
    python seed_platform.py            # upsert sample hospitals (idempotent by name)
    python seed_platform.py --reset    # delete platform collections first

Staff logins created (password for all: 'clinic123'):
    smilecare@example.com   -> SmileCare Dental Hospital
    brightsmile@example.com -> BrightSmile Dental Care
"""
import asyncio
import sys
from datetime import datetime

from auth.security import hash_password
from database import connect, get_db

STAFF_PASSWORD = "clinic123"

HOSPITALS = [
    {
        "name": "SmileCare Dental Hospital",
        "description": "Full-service dental hospital offering cleanings, orthodontics, "
                       "implants, and emergency care.",
        "address": "45 Residency Road, Bangalore, KA 560025",
        "location": {"lat": 12.9716, "lng": 77.5946},
        "hours": {"mon": "09:00-19:00", "tue": "09:00-19:00", "wed": "09:00-19:00",
                  "thu": "09:00-19:00", "fri": "09:00-19:00", "sat": "09:00-14:00", "sun": "closed"},
        "services": ["Cleaning", "Root Canal", "Braces", "Implants", "Whitening", "Emergency Care"],
        "insurance_accepted": ["Star Health", "HDFC Ergo", "Cash", "UPI"],
        "rating_avg": 4.6, "rating_count": 128,
        "staff_email": "smilecare@example.com",
        "doctors": [
            {"name": "Dr. Priya Nair", "qualification": "BDS, MDS", "years_experience": 14,
             "specialization": "Orthodontics", "bio": "Braces and aligners specialist."},
            {"name": "Dr. Arjun Menon", "qualification": "BDS", "years_experience": 9,
             "specialization": "Endodontics", "bio": "Root canal and restorative care."},
        ],
    },
    {
        "name": "BrightSmile Dental Care",
        "description": "Neighborhood clinic focused on preventive and cosmetic dentistry.",
        "address": "12 Indiranagar 100ft Road, Bangalore, KA 560038",
        "location": {"lat": 12.9784, "lng": 77.6408},
        "hours": {"mon": "10:00-18:00", "tue": "10:00-18:00", "wed": "10:00-18:00",
                  "thu": "10:00-18:00", "fri": "10:00-18:00", "sat": "10:00-16:00", "sun": "closed"},
        "services": ["Cleaning", "Whitening", "Veneers", "Fillings"],
        "insurance_accepted": ["Cash", "UPI", "ICICI Lombard"],
        "rating_avg": 4.3, "rating_count": 64,
        "staff_email": "brightsmile@example.com",
        "doctors": [
            {"name": "Dr. Asha Rao", "qualification": "BDS, MDS", "years_experience": 12,
             "specialization": "Cosmetic Dentistry", "bio": "Veneers and smile design."},
        ],
    },
]


async def seed(reset: bool = False) -> None:
    connect()
    db = get_db()
    now = datetime.utcnow()

    if reset:
        for col in ("hospitals", "doctors", "hospital_staff_users"):
            await db[col].delete_many({})
        print("Reset hospitals/doctors/hospital_staff_users.")

    for h in HOSPITALS:
        doctors = h.pop("doctors")
        staff_email = h.pop("staff_email")
        doc = dict(h)
        doc.update({"booking_config": {"mode": "internal"}, "status": "active",
                    "photos": [], "created_at": now, "updated_at": now})
        await db.hospitals.update_one({"name": h["name"]}, {"$set": doc}, upsert=True)
        hospital = await db.hospitals.find_one({"name": h["name"]})
        hid = hospital["_id"]

        await db.doctors.delete_many({"hospital_id": hid})
        for d in doctors:
            await db.doctors.insert_one({**d, "hospital_id": hid, "created_at": now})

        await db.hospital_staff_users.update_one(
            {"email": staff_email},
            {"$set": {"email": staff_email, "hospital_id": hid, "role": "hospital",
                      "name": f"{h['name']} Admin", "password_hash": hash_password(STAFF_PASSWORD),
                      "created_at": now, "last_login": now}},
            upsert=True,
        )
        print(f"Seeded {h['name']} ({len(doctors)} doctors) — login {staff_email} / {STAFF_PASSWORD}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed(reset="--reset" in sys.argv))
