"""Seed the database with sample test data for the dashboard.

Inserts knowledge (via the same defaults as /api/knowledge/seed), plus sample
appointments and conversations so the dashboard has data to display without
needing the live chat agent.

Run from the backend/ directory:
    python seed_data.py            # add sample data (idempotent-ish)
    python seed_data.py --reset    # wipe appointments/conversations first
"""
import argparse
import asyncio
import random
from datetime import datetime, timedelta

from agent.seeds import DEFAULT_KNOWLEDGE
import database

DOCTORS = ["Dr. Priya Sharma", "Dr. Rahul Mehta", "Dr. Ananya Rao"]
SERVICES = ["Teeth Cleaning", "Root Canal Treatment", "Dental Implants",
            "Teeth Whitening", "Orthodontics", "General Dentistry", "Crowns & Bridges"]
STATUSES = ["scheduled", "completed", "cancelled", "rescheduled"]
SLOTS = ["9:00 AM", "9:30 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:30 PM", "5:00 PM"]
NAMES = [
    ("Aarav Patel", "9876500001"), ("Diya Nair", "9876500002"),
    ("Kabir Singh", "9876500003"), ("Meera Iyer", "9876500004"),
    ("Rohan Gupta", "9876500005"), ("Sara Khan", "9876500006"),
    ("Vivaan Reddy", "9876500007"), ("Anaya Joshi", "9876500008"),
    ("John Doe", "5551234567"), ("Emily Clark", "5559876543"),
]


async def seed_knowledge(db):
    now = datetime.utcnow()
    for entry in DEFAULT_KNOWLEDGE:
        doc = dict(entry)
        doc.update({"metadata": {}, "last_updated": now, "updated_by": "admin"})
        await db.knowledge_base.update_one({"key": entry["key"]}, {"$set": doc}, upsert=True)
    print(f"  knowledge_base: {len(DEFAULT_KNOWLEDGE)} entries upserted")


async def seed_appointments(db):
    today = datetime.utcnow().date()
    docs = []
    for i, (name, phone) in enumerate(NAMES):
        # spread appointments across -10 .. +14 days
        offset = random.randint(-10, 14)
        appt_date = (today + timedelta(days=offset)).strftime("%Y-%m-%d")
        # ensure a few land exactly today
        if i < 2:
            appt_date = today.strftime("%Y-%m-%d")
        status = random.choice(STATUSES) if offset < 0 else random.choice(["scheduled", "rescheduled"])
        now = datetime.utcnow()
        docs.append({
            "patient_name": name,
            "patient_phone": phone,
            "patient_email": f"{name.split()[0].lower()}@example.com",
            "doctor_name": random.choice(DOCTORS),
            "service_type": random.choice(SERVICES),
            "appointment_date": appt_date,
            "time_slot": random.choice(SLOTS),
            "status": status,
            "notes": random.choice(["", "First visit", "Follow-up", "Sensitive teeth", "Insurance: Star Health"]),
            "booked_via": "chat",
            "created_at": now - timedelta(days=random.randint(0, 12)),
            "updated_at": now,
        })
    await db.appointments.insert_many(docs)
    print(f"  appointments: {len(docs)} inserted")


async def seed_conversations(db):
    now = datetime.utcnow()
    samples = [
        {
            "patient_name": "Aarav Patel", "patient_phone": "9876500001",
            "intent_log": ["faq", "book_appointment"],
            "messages": [
                ("user", "Hi, what are your timings on Sunday?"),
                ("assistant", "We're open **Sunday 10:00 AM – 2:00 PM**. Would you like to book a visit?"),
                ("user", "Yes, a cleaning with Dr. Priya please."),
                ("assistant", "Sure! Could you share your name and phone number to confirm?"),
            ],
        },
        {
            "patient_name": "Sara Khan", "patient_phone": "9876500006",
            "intent_log": ["reschedule"],
            "messages": [
                ("user", "I need to move my appointment to next Friday."),
                ("assistant", "No problem — I can reschedule that. What time works best for you?"),
            ],
        },
        {
            "patient_name": None, "patient_phone": None,
            "intent_log": ["faq"],
            "messages": [
                ("user", "Do you accept insurance?"),
                ("assistant", "Yes! We accept Star Health, HDFC ERGO, ICICI Lombard and most major cashless providers."),
            ],
        },
    ]
    for i, s in enumerate(samples):
        started = now - timedelta(hours=i + 1)
        msgs = [{"role": r, "content": c, "timestamp": started + timedelta(minutes=j)}
                for j, (r, c) in enumerate(s["messages"])]
        await db.conversations.update_one(
            {"session_id": f"sample-session-{i+1}"},
            {"$set": {
                "session_id": f"sample-session-{i+1}",
                "patient_name": s["patient_name"],
                "patient_phone": s["patient_phone"],
                "messages": msgs,
                "intent_log": s["intent_log"],
                "appointment_ids": [],
                "started_at": started,
                "last_active": started + timedelta(minutes=len(msgs)),
            }},
            upsert=True,
        )
    print(f"  conversations: {len(samples)} upserted")


async def main(reset: bool):
    db = database.connect()
    await database.init_indexes()
    if reset:
        await db.appointments.delete_many({})
        await db.conversations.delete_many({})
        print("  reset: cleared appointments + conversations")
    await seed_knowledge(db)
    await seed_appointments(db)
    await seed_conversations(db)
    database.close()
    print("Done. Note: run POST /api/knowledge/seed (or /reindex) to (re)build the RAG vector index.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="wipe appointments/conversations first")
    args = parser.parse_args()
    print("Seeding test data...")
    asyncio.run(main(args.reset))
