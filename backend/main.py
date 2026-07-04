"""FastAPI application entrypoint for the Dental Receptionist AI Agent."""
import asyncio
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import database
from agent import rag
from config import settings
from logging_config import setup_logging, get_logger
from routes import (admin_auth, applications, appointments, auth, bookings, chat,
                    clinic_chat, dashboard, hospital_admin, hospital_auth, hospitals,
                    knowledge, notifications, patients, reviews, triage_chat, uploads,
                    whatsapp)

setup_logging()
log = get_logger("startup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up | db=%s | llm=%s | embed=%s | api_key_set=%s",
             settings.DB_NAME, settings.LLM_MODEL, settings.EMBED_MODEL,
             bool(settings.GOOGLE_API_KEY))
    if not (settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD):
        log.warning("ADMIN_EMAIL/ADMIN_PASSWORD not set — admin login is disabled. "
                    "Set them in backend/.env.")
    if settings.JWT_SECRET == "dev-insecure-change-me":
        log.warning("JWT_SECRET is the insecure default — set a strong JWT_SECRET in .env.")
    database.connect()
    await database.init_indexes()
    try:
        count = await rag.rebuild_index()
        log.info("FAISS index built with %d knowledge chunks.", count)
    except Exception as exc:
        log.exception("Knowledge index build failed at startup: %s", exc)
    from services.reminders import reminder_loop
    reminder_task = asyncio.create_task(reminder_loop())
    yield
    reminder_task.cancel()
    database.close()


app = FastAPI(title="SmileCare Dental AI Agent", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin_auth.router)
app.include_router(hospital_auth.router)
app.include_router(hospital_admin.router)
app.include_router(applications.router)
app.include_router(hospitals.router)
app.include_router(bookings.router)
app.include_router(triage_chat.router)
app.include_router(clinic_chat.router)
app.include_router(patients.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(uploads.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(knowledge.router)
app.include_router(appointments.router)
app.include_router(whatsapp.router)

# Serve uploaded files (clinic photos, license docs).
_uploads = Path(__file__).resolve().parent / "uploads"
_uploads.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads)), name="uploads")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "clinic": settings.CLINIC_NAME}
