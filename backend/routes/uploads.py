"""Simple local file uploads (placeholder for real object storage)."""
import secrets
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"}
MAX_BYTES = 8 * 1024 * 1024


@router.post("")
async def upload_file(file: UploadFile = File(...)) -> dict:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"Unsupported file type '{ext}'.")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 8MB).")
    name = f"{secrets.token_hex(8)}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    return {"url": f"/uploads/{name}", "filename": file.filename}
