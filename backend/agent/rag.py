"""FAISS-based RAG over the knowledge base.

The index lives in-process. It is rebuilt on startup and whenever knowledge
entries change. Embeddings are cached in the `knowledge_vectors` collection keyed
by a content hash so unchanged entries are not re-embedded.
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
_chunks: list[dict] = []  # parallel to index rows: {title, content}
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


async def _embed_with_cache(key: str, content: str) -> list[float]:
    """Return embedding for content, using the vector cache when possible."""
    db = get_db()
    h = _content_hash(content)
    cached = await db.knowledge_vectors.find_one({"key": key})
    if cached and cached.get("hash") == h and cached.get("embedding"):
        return cached["embedding"]

    log.info("Embedding knowledge entry %r (%d chars) with %s", key, len(content), settings.EMBED_MODEL)
    embeddings = _get_embeddings()
    vector = await asyncio.to_thread(embeddings.embed_query, content)
    await db.knowledge_vectors.update_one(
        {"key": key},
        {"$set": {"key": key, "hash": h, "embedding": vector}},
        upsert=True,
    )
    return vector


async def rebuild_index() -> int:
    """Rebuild the FAISS index from all knowledge base entries.

    Returns the number of indexed chunks.
    """
    global _index, _chunks
    async with _lock:
        db = get_db()
        entries = await db.knowledge_base.find().to_list(length=None)
        if not entries:
            _index, _chunks = None, []
            return 0

        vectors: list[list[float]] = []
        chunks: list[dict] = []
        for entry in entries:
            content = entry.get("content", "")
            if not content.strip():
                continue
            vector = await _embed_with_cache(entry["key"], content)
            vectors.append(vector)
            chunks.append({"title": entry.get("title", entry["key"]), "content": content})

        if not vectors:
            _index, _chunks = None, []
            return 0

        matrix = _normalize(np.array(vectors, dtype="float32"))
        index = faiss.IndexFlatIP(matrix.shape[1])
        index.add(matrix)
        _index, _chunks = index, chunks
        return len(chunks)


async def search(query: str, k: int = 3) -> str:
    """Embed the query and return the top-k knowledge chunks as text."""
    if _index is None or not _chunks:
        log.warning("search() called but index is empty.")
        return "No clinic knowledge has been indexed yet."

    log.info("RAG search | query=%r | chunks=%d", query[:80], len(_chunks))
    embeddings = _get_embeddings()
    q_vec = await asyncio.to_thread(embeddings.embed_query, query)
    q = _normalize(np.array([q_vec], dtype="float32"))
    k = min(k, len(_chunks))
    _scores, idxs = _index.search(q, k)

    parts = []
    for i in idxs[0]:
        if 0 <= i < len(_chunks):
            chunk = _chunks[i]
            parts.append(f"### {chunk['title']}\n{chunk['content']}")
    return "\n\n".join(parts) if parts else "No relevant clinic information found."
