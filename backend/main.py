"""FastAPI application entrypoint for the Dental Receptionist AI Agent."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
from agent import rag
from config import settings
from logging_config import setup_logging, get_logger
from routes import appointments, chat, dashboard, knowledge

setup_logging()
log = get_logger("startup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up | db=%s | llm=%s | embed=%s | api_key_set=%s",
             settings.DB_NAME, settings.LLM_MODEL, settings.EMBED_MODEL,
             bool(settings.GOOGLE_API_KEY))
    database.connect()
    await database.init_indexes()
    try:
        count = await rag.rebuild_index()
        log.info("FAISS index built with %d knowledge chunks.", count)
    except Exception as exc:
        log.exception("Knowledge index build failed at startup: %s", exc)
    yield
    database.close()


app = FastAPI(title="SmileCare Dental AI Agent", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(knowledge.router)
app.include_router(appointments.router)


@app.get("/")
async def health() -> dict:
    return {"status": "ok", "clinic": settings.CLINIC_NAME}
