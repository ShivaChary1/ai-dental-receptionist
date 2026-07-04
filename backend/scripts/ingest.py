"""CLI: ingest a directory of documents into the RAG corpus.

Usage (from backend/):  python scripts/ingest.py <directory-with-manifest.json>
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import database  # noqa: E402
from services.ingestion import ingest_directory  # noqa: E402


async def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    database.connect()
    try:
        result = await ingest_directory(sys.argv[1])
        for s in result["sources"]:
            print(f"  {s['title']}: {s['chunks']} chunks")
        print(f"Total: {result['chunks_ingested']} chunks ingested; "
              f"index now holds {result['index_size']} chunks.")
    finally:
        database.close()


if __name__ == "__main__":
    asyncio.run(main())
