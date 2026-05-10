"""
core/logging.py
===============
Centralized logging configuration for the entire chatbot service.

Usage in any file:
    from chatbot.core.logging import get_logger
    logger = get_logger(__name__)
    logger.info("Hello")
    logger.error("Something broke", exc_info=True)
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
import os


# ----------------------------------------------------------------------
# Log directory setup
# ----------------------------------------------------------------------
LOG_DIR = Path(os.getenv("LOG_DIR", "logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


# ----------------------------------------------------------------------
# Color formatter for console (optional but nice in dev)
# ----------------------------------------------------------------------
class ColorFormatter(logging.Formatter):
    """Adds ANSI colors to log levels for terminal output."""

    GREY = "\x1b[38;20m"
    BLUE = "\x1b[34;20m"
    YELLOW = "\x1b[33;20m"
    RED = "\x1b[31;20m"
    BOLD_RED = "\x1b[31;1m"
    RESET = "\x1b[0m"

    LEVEL_COLORS = {
        logging.DEBUG: GREY,
        logging.INFO: BLUE,
        logging.WARNING: YELLOW,
        logging.ERROR: RED,
        logging.CRITICAL: BOLD_RED,
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.LEVEL_COLORS.get(record.levelno, self.GREY)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
        return formatter.format(record)


# ----------------------------------------------------------------------
# Setup function — call ONCE on app startup
# ----------------------------------------------------------------------
_configured = False


def setup_logging() -> None:
    """Configure root logger with console + rotating file handlers."""
    global _configured
    if _configured:
        return

    root = logging.getLogger()
    root.setLevel(LOG_LEVEL)

    # Clear existing handlers (in case uvicorn added some)
    root.handlers.clear()

    # ---- Console handler (with colors) ----
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(LOG_LEVEL)
    console_handler.setFormatter(ColorFormatter())
    root.addHandler(console_handler)

    # ---- File handler: general logs (rotating) ----
    file_handler = RotatingFileHandler(
        LOG_DIR / "chatbot.log",
        maxBytes=10 * 1024 * 1024,   # 10 MB per file
        backupCount=5,                # keep 5 old files
        encoding="utf-8",
    )
    file_handler.setLevel(LOG_LEVEL)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    root.addHandler(file_handler)

    # ---- File handler: errors only ----
    error_handler = RotatingFileHandler(
        LOG_DIR / "errors.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    root.addHandler(error_handler)

    # ---- Reduce noise from third-party libraries ----
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    _configured = True
    root.info("✅ Logging configured | level=%s | dir=%s", LOG_LEVEL, LOG_DIR.resolve())


def get_logger(name: str) -> logging.Logger:
    """Get a named logger. Call this in every module."""
    if not _configured:
        setup_logging()
    return logging.getLogger(name)