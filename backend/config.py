"""Application configuration loaded from environment variables."""
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Single config object used app-wide."""

    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "dental_ai")

    # Overridable model ids. Defaults are current Gemini models (the spec's
    # gemini-1.5-flash / embedding-001 are retired on the Generative Language API).
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash-lite")
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "models/gemini-embedding-001")

    CLINIC_NAME: str = os.getenv("CLINIC_NAME", "SmileCare Dental Hospital")

    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
