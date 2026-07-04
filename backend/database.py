"""Async MongoDB (Motor) client and index setup."""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def connect() -> AsyncIOMotorDatabase:
    """Create the Motor client and return the database handle."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client[settings.DB_NAME]
    return _db


def get_db() -> AsyncIOMotorDatabase:
    """Return the active database handle (connect() must run first)."""
    if _db is None:
        return connect()
    return _db


def close() -> None:
    if _client is not None:
        _client.close()


async def _ensure_partial_unique(collection, field: str) -> None:
    """Create a unique index on `field` that only applies to string values,
    dropping any pre-existing (e.g. sparse) index on the same field that would
    conflict with the new options."""
    from pymongo.errors import OperationFailure

    index_name = f"{field}_1"
    opts = dict(
        name=index_name,
        unique=True,
        partialFilterExpression={field: {"$type": "string"}},
    )
    try:
        await collection.create_index([(field, ASCENDING)], **opts)
    except OperationFailure:
        # An index with the same name but different options already exists.
        await collection.drop_index(index_name)
        await collection.create_index([(field, ASCENDING)], **opts)


async def init_indexes() -> None:
    """Create indexes used by queries on startup."""
    db = get_db()
    await db.appointments.create_index([("appointment_date", ASCENDING)])
    await db.appointments.create_index([("status", ASCENDING)])
    await db.appointments.create_index([("patient_phone", ASCENDING)])
    # session_id is unique only for channel chats that have one; triage chats are
    # keyed by _id and carry no session_id, so use a partial unique index.
    await _ensure_partial_unique(db.conversations, "session_id")
    await db.knowledge_base.create_index([("key", ASCENDING)], unique=True)
    await db.knowledge_base.create_index([("category", ASCENDING)])
    # Users: email/phone unique only when present as a string. A plain sparse index
    # is not enough because our docs store an explicit `null` for the missing field
    # (sparse skips only absent fields, not null values), which would collide.
    await _ensure_partial_unique(db.users, "email")
    await _ensure_partial_unique(db.users, "phone")
    # OTPs: look up by phone; TTL index auto-purges expired codes.
    await db.otps.create_index([("phone", ASCENDING)])
    await db.otps.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)

    # --- Multi-tenant platform collections ---
    await db.hospital_applications.create_index([("status", ASCENDING)])
    await db.hospital_applications.create_index([("created_at", ASCENDING)])
    await db.hospitals.create_index([("status", ASCENDING)])
    await db.hospitals.create_index([("services", ASCENDING)])
    await db.doctors.create_index([("hospital_id", ASCENDING)])
    await db.hospital_staff_users.create_index([("email", ASCENDING)], unique=True, sparse=True)
    await db.hospital_staff_users.create_index([("hospital_id", ASCENDING)])
    await db.bookings.create_index([("user_id", ASCENDING)])
    await db.bookings.create_index([("hospital_id", ASCENDING)])
    await db.bookings.create_index([("status", ASCENDING)])
    await db.conversations.create_index([("user_id", ASCENDING)])
    await db.conversations.create_index([("kind", ASCENDING)])
    await db.conversations.create_index([("hospital_id", ASCENDING)])
    await db.reviews.create_index([("hospital_id", ASCENDING)])
    await db.adapter_logs.create_index([("hospital_id", ASCENDING)])
    await db.adapter_logs.create_index([("created_at", ASCENDING)])
