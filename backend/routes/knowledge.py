"""Knowledge base CRUD + seeding + reindex endpoints."""
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from agent import rag
from agent.seeds import DEFAULT_KNOWLEDGE
from auth.deps import require_admin
from database import get_db
from models.appointment import serialize
from models.knowledge import KnowledgeIn

router = APIRouter(
    prefix="/api/knowledge", tags=["knowledge"], dependencies=[Depends(require_admin)]
)


@router.get("")
async def list_knowledge() -> dict:
    db = get_db()
    entries = await db.knowledge_base.find().sort("title", 1).to_list(length=None)
    grouped: dict[str, list] = {"static": [], "dynamic": []}
    for e in entries:
        grouped.setdefault(e.get("category", "static"), []).append(serialize(e))
    return grouped


@router.post("")
async def create_knowledge(payload: KnowledgeIn) -> dict:
    db = get_db()
    if await db.knowledge_base.find_one({"key": payload.key}):
        raise HTTPException(409, f"Knowledge key '{payload.key}' already exists.")
    now = datetime.utcnow()
    doc = payload.model_dump()
    doc.update({"last_updated": now, "updated_by": "admin"})
    result = await db.knowledge_base.insert_one(doc)
    await rag.rebuild_index()
    return serialize(await db.knowledge_base.find_one({"_id": result.inserted_id}))


@router.put("/{entry_id}")
async def update_knowledge(entry_id: str, payload: KnowledgeIn) -> dict:
    db = get_db()
    if not ObjectId.is_valid(entry_id):
        raise HTTPException(400, "Invalid id.")
    doc = payload.model_dump()
    doc.update({"last_updated": datetime.utcnow(), "updated_by": "admin"})
    result = await db.knowledge_base.update_one(
        {"_id": ObjectId(entry_id)}, {"$set": doc}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Knowledge entry not found.")
    await rag.rebuild_index()
    return serialize(await db.knowledge_base.find_one({"_id": ObjectId(entry_id)}))


@router.delete("/{entry_id}")
async def delete_knowledge(entry_id: str) -> dict:
    db = get_db()
    if not ObjectId.is_valid(entry_id):
        raise HTTPException(400, "Invalid id.")
    entry = await db.knowledge_base.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(404, "Knowledge entry not found.")
    await db.knowledge_base.delete_one({"_id": ObjectId(entry_id)})
    await db.knowledge_vectors.delete_one({"key": entry.get("key")})
    await rag.rebuild_index()
    return {"success": True}


@router.post("/seed")
async def seed_knowledge() -> dict:
    db = get_db()
    now = datetime.utcnow()
    for entry in DEFAULT_KNOWLEDGE:
        doc = dict(entry)
        doc.update({"metadata": {}, "last_updated": now, "updated_by": "admin"})
        await db.knowledge_base.update_one(
            {"key": entry["key"]}, {"$set": doc}, upsert=True
        )
    count = await rag.rebuild_index()
    return {"success": True, "seeded": len(DEFAULT_KNOWLEDGE), "indexed_chunks": count}


@router.post("/reindex")
async def reindex_knowledge() -> dict:
    count = await rag.rebuild_index()
    return {"success": True, "indexed_chunks": count}


@router.post("/ingest")
async def ingest_corpus(payload: dict) -> dict:
    """Ingest a server-side directory (with manifest.json) into the RAG corpus."""
    directory = (payload or {}).get("directory")
    if not directory:
        raise HTTPException(400, "Provide {'directory': <path with manifest.json>}.")
    from services.ingestion import ingest_directory
    try:
        return {"success": True, **(await ingest_directory(directory))}
    except FileNotFoundError as exc:
        raise HTTPException(400, str(exc))
