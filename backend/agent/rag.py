"""FAISS-based RAG over the dental corpus.

Two chunk sources feed one in-process index:
- `rag_chunks` / `rag_sources`: the ingested, authority-weighted corpus
  (embeddings stored inline on each chunk at ingest time).
- legacy `knowledge_base` entries (clinic knowledge + curated seeds), indexed as
  authority-3 chunks; their embeddings are cached in `knowledge_vectors` by
  content hash so unchanged entries are never re-embedded.

The index is rebuilt on startup and whenever knowledge changes.
"""
import asyncio
import hashlib
from typing import Optional

import faiss
import numpy as np
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from config import settings
from database import get_db
from logging_config import get_logger

log = get_logger("rag")

_embeddings: Optional[GoogleGenerativeAIEmbeddings] = None
_index: Optional[faiss.IndexFlatIP] = None
_chunks: list[dict] = []  # parallel to index rows; see _chunk_meta shape below
_lock = asyncio.Lock()


def _get_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBED_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
        )
    return _embeddings


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


async def embed_text(text: str) -> list[float]:
    """Embed arbitrary text (used by ingestion and query embedding)."""
    embeddings = _get_embeddings()
    return await asyncio.to_thread(embeddings.embed_query, text)


async def embed_batch(texts: list[str]) -> list[list[float]]:
    embeddings = _get_embeddings()
    return await asyncio.to_thread(embeddings.embed_documents, texts)


async def _embed_with_cache(key: str, content: str) -> list[float]:
    """Embedding for legacy knowledge entries, via the `knowledge_vectors` cache."""
    db = get_db()
    h = _content_hash(content)
    cached = await db.knowledge_vectors.find_one({"key": key})
    if cached and cached.get("hash") == h and cached.get("embedding"):
        return cached["embedding"]

    log.info("Embedding knowledge entry %r (%d chars)", key, len(content))
    vector = await embed_text(content)
    await db.knowledge_vectors.update_one(
        {"key": key},
        {"$set": {"key": key, "hash": h, "embedding": vector}},
        upsert=True,
    )
    return vector


def _chunk_meta(content, heading, source_id, source_title, authority, url=None, published_date=None):
    return {
        "content": content,
        "heading": heading,
        "source_id": source_id,
        "source_title": source_title,
        "authority": authority,
        "url": url,
        "published_date": published_date,
    }


async def rebuild_index() -> int:
    """Rebuild the FAISS index from the ingested corpus + legacy knowledge base.

    Returns the number of indexed chunks."""
    global _index, _chunks
    async with _lock:
        db = get_db()
        vectors: list[list[float]] = []
        chunks: list[dict] = []

        # Ingested corpus (embeddings inline).
        sources = {str(s["_id"]): s async for s in db.rag_sources.find()}
        async for c in db.rag_chunks.find():
            if not c.get("embedding"):
                continue
            src = sources.get(str(c.get("source_id")), {})
            vectors.append(c["embedding"])
            chunks.append(_chunk_meta(
                c.get("content", ""), c.get("heading"),
                str(c.get("source_id")), src.get("title", "Unknown source"),
                int(src.get("authority", 2)), src.get("url"), src.get("published_date"),
            ))

        # Legacy knowledge base (clinic knowledge + curated seeds) as authority-3 chunks.
        entries = await db.knowledge_base.find().to_list(length=None)
        for entry in entries:
            content = entry.get("content", "")
            if not content.strip():
                continue
            vector = await _embed_with_cache(entry["key"], content)
            vectors.append(vector)
            chunks.append(_chunk_meta(
                content, entry.get("title", entry["key"]),
                f"kb:{entry['key']}", entry.get("title", entry["key"]), 3,
            ))

        if not vectors:
            _index, _chunks = None, []
            return 0

        matrix = _normalize(np.array(vectors, dtype="float32"))
        index = faiss.IndexFlatIP(matrix.shape[1])
        index.add(matrix)
        _index, _chunks = index, chunks
        return len(chunks)


async def search_structured(query: str, k: int | None = None) -> list[dict]:
    """Top-k chunks with metadata + cosine similarity, for the graph's retrieve node."""
    if _index is None or not _chunks:
        log.warning("search_structured() called but index is empty.")
        return []
    k = min(k or settings.TOP_K_RETRIEVE, len(_chunks))
    log.info("RAG search | query=%r | k=%d | chunks=%d", query[:80], k, len(_chunks))
    q_vec = await embed_text(query)
    q = _normalize(np.array([q_vec], dtype="float32"))
    scores, idxs = _index.search(q, k)
    out = []
    for score, i in zip(scores[0], idxs[0]):
        if 0 <= i < len(_chunks):
            out.append({**_chunks[i], "similarity": float(score)})
    return out


async def search(query: str, k: int = 3) -> str:
    """Legacy text API used by the clinic/receptionist agents."""
    results = await search_structured(query, k)
    if not results:
        return "No clinic knowledge has been indexed yet."
    parts = [f"### {r['heading'] or r['source_title']}\n{r['content']}" for r in results]
    return "\n\n".join(parts)
