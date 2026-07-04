"""Corpus ingestion: md/txt/pdf files + manifest.json → rag_sources / rag_chunks.

Idempotent: re-ingesting a source (matched by manifest title) replaces its chunks.

manifest.json shape (one per directory):
{
  "sources": [
    {"file": "ada_fluoride.md", "title": "ADA Fluoride Guidance", "type": "guideline",
     "authority": 5, "url": "https://ada.org/...", "published_date": "2024-01-15"}
  ]
}
"""
import json
import re
from datetime import datetime
from pathlib import Path

from agent import rag
from database import get_db
from logging_config import get_logger

log = get_logger("ingestion")

# ~4 chars per token is close enough for chunk sizing.
def _token_count(text: str) -> int:
    return max(1, len(text) // 4)


TARGET_TOKENS = 650   # middle of the 500-800 band
MAX_TOKENS = 800


def _read_file(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        import fitz  # pymupdf
        doc = fitz.open(path)
        try:
            return "\n\n".join(page.get_text() for page in doc)
        finally:
            doc.close()
    return path.read_text(encoding="utf-8", errors="replace")


def chunk_document(text: str, source_title: str) -> list[dict]:
    """Split into 500-800 token chunks along paragraph boundaries, tracking the
    nearest markdown heading. Each chunk's content is prefixed with
    '{source_title} — {heading}' so embeddings carry their context."""
    chunks: list[dict] = []
    heading = None
    buf: list[str] = []
    buf_tokens = 0

    def flush():
        nonlocal buf, buf_tokens
        body = "\n\n".join(buf).strip()
        if body:
            prefix = f"{source_title} — {heading}" if heading else source_title
            chunks.append({
                "heading": heading,
                "content": f"{prefix}\n\n{body}",
                "token_count": _token_count(body),
            })
        buf, buf_tokens = [], 0

    for block in re.split(r"\n\s*\n", text):
        block = block.strip()
        if not block:
            continue
        m = re.match(r"^(#{1,4})\s+(.*)", block)
        if m:
            flush()
            heading = m.group(2).strip()
            continue
        t = _token_count(block)
        if buf_tokens + t > MAX_TOKENS and buf:
            flush()
        buf.append(block)
        buf_tokens += t
        if buf_tokens >= TARGET_TOKENS:
            flush()
    flush()
    return chunks


async def ingest_directory(directory: str | Path) -> dict:
    """Ingest every source listed in the directory's manifest.json."""
    directory = Path(directory)
    manifest_path = directory / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"No manifest.json in {directory}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    db = get_db()
    now = datetime.utcnow()
    total_chunks = 0
    ingested = []

    for src in manifest.get("sources", []):
        path = directory / src["file"]
        if not path.exists():
            log.warning("Manifest references missing file %s — skipped", path)
            continue
        text = _read_file(path)
        chunks = chunk_document(text, src["title"])
        if not chunks:
            log.warning("No chunks produced for %s — skipped", src["title"])
            continue

        # Upsert the source (matched by title), replace its chunks.
        source_doc = {
            "title": src["title"],
            "type": src.get("type", "document"),
            "authority": int(src.get("authority", 2)),
            "url": src.get("url"),
            "published_date": src.get("published_date"),
            "updated_at": now,
        }
        existing = await db.rag_sources.find_one({"title": src["title"]})
        if existing:
            source_id = existing["_id"]
            await db.rag_sources.update_one({"_id": source_id}, {"$set": source_doc})
            await db.rag_chunks.delete_many({"source_id": source_id})
        else:
            source_doc["created_at"] = now
            result = await db.rag_sources.insert_one(source_doc)
            source_id = result.inserted_id

        vectors = await rag.embed_batch([c["content"] for c in chunks])
        docs = [
            {"source_id": source_id, "content": c["content"], "heading": c["heading"],
             "embedding": v, "token_count": c["token_count"], "created_at": now}
            for c, v in zip(chunks, vectors)
        ]
        await db.rag_chunks.insert_many(docs)
        total_chunks += len(docs)
        ingested.append({"title": src["title"], "chunks": len(docs)})
        log.info("Ingested %r: %d chunks (authority %d)",
                 src["title"], len(docs), source_doc["authority"])

    indexed = await rag.rebuild_index()
    return {"sources": ingested, "chunks_ingested": total_chunks, "index_size": indexed}
