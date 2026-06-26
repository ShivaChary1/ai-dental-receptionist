"""Central logging configuration.

Logs to both the console and a rotating file (`backend/app.log`) so issues can be
inspected after the fact. Call setup_logging() once at startup.
"""
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

_CONFIGURED = False
LOG_FILE = Path(__file__).parent / "app.log"


def setup_logging(level: int = logging.INFO) -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    fmt = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    formatter = logging.Formatter(fmt, datefmt="%H:%M:%S")

    console = logging.StreamHandler()
    console.setFormatter(formatter)

    file_handler = RotatingFileHandler(LOG_FILE, maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    file_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    # Avoid duplicate handlers if uvicorn reloads.
    root.handlers = [h for h in root.handlers if not isinstance(h, (logging.StreamHandler, RotatingFileHandler))]
    root.addHandler(console)
    root.addHandler(file_handler)

    # Quiet noisy third-party loggers a little.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    _CONFIGURED = True
    logging.getLogger("dental").info("Logging configured. Writing to %s", LOG_FILE)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"dental.{name}")
