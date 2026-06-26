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


async def init_indexes() -> None:
    """Create indexes used by queries on startup."""
    db = get_db()
    await db.appointments.create_index([("appointment_date", ASCENDING)])
    await db.appointments.create_index([("status", ASCENDING)])
    await db.appointments.create_index([("patient_phone", ASCENDING)])
    await db.conversations.create_index([("session_id", ASCENDING)], unique=True)
    await db.knowledge_base.create_index([("key", ASCENDING)], unique=True)
    await db.knowledge_base.create_index([("category", ASCENDING)])
