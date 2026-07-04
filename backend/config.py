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

    # --- Dental agent graph: per-role model routing (all Gemini; env-overridable) ---
    ROUTER_MODEL: str = os.getenv("ROUTER_MODEL", "gemini-2.5-flash-lite")
    CHEAP_SYNTH_MODEL: str = os.getenv("CHEAP_SYNTH_MODEL", os.getenv("LLM_MODEL", "gemini-2.5-flash"))
    FRONTIER_SYNTH_MODEL: str = os.getenv("FRONTIER_SYNTH_MODEL", "gemini-2.5-pro")
    VISION_MODEL: str = os.getenv("VISION_MODEL", "gemini-2.5-flash")
    # Per-clinic widget receptionist: needs reliable multi-turn tool use.
    CLINIC_MODEL: str = os.getenv("CLINIC_MODEL", "gemini-2.5-flash")

    # --- RAG / retrieval ---
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.75"))
    TOP_K_RETRIEVE: int = int(os.getenv("TOP_K_RETRIEVE", "20"))
    TOP_K_FINAL: int = int(os.getenv("TOP_K_FINAL", "8"))
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    TAVILY_DOMAINS = ["ada.org", "ncbi.nlm.nih.gov", "nice.org.uk", "who.int",
                      "cochrane.org", "aapd.org", "perio.org", "aae.org"]

    # USD per 1M tokens (input, output) — rough estimates for query cost logging.
    MODEL_PRICING = {
        "gemini-2.5-flash-lite": (0.10, 0.40),
        "gemini-2.5-flash": (0.30, 2.50),
        "gemini-2.5-pro": (1.25, 10.00),
    }

    CLINIC_NAME: str = os.getenv("CLINIC_NAME", "SmileCare Dental Hospital")

    # --- Auth (JWT) ---
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-insecure-change-me")
    JWT_ALG: str = os.getenv("JWT_ALG", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # --- Admin (single seeded account from env) ---
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")

    # --- OTP ---
    OTP_TTL_SECONDS: int = int(os.getenv("OTP_TTL_SECONDS", "300"))
    OTP_LENGTH: int = int(os.getenv("OTP_LENGTH", "6"))

    # --- Email (SMTP) — stub-logs until configured ---
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "")
    SMTP_STARTTLS: bool = os.getenv("SMTP_STARTTLS", "true").lower() != "false"

    # --- WhatsApp (Meta Cloud API) — placeholders until real creds are added ---
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    WHATSAPP_TOKEN: str = os.getenv("WHATSAPP_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_API_VERSION: str = os.getenv("WHATSAPP_API_VERSION", "v21.0")

    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
