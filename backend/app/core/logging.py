"""Structured logging configuration."""

import logging
import sys
import json
from datetime import datetime
from typing import Optional
import uuid
from contextvars import ContextVar

# Context variables for request tracking
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
session_id_ctx: ContextVar[Optional[str]] = ContextVar("session_id", default=None)
audit_id_ctx: ContextVar[Optional[str]] = ContextVar("audit_id", default=None)


class StructuredFormatter(logging.Formatter):
    """JSON structured log formatter."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add context if available
        if request_id := request_id_ctx.get():
            log_data["request_id"] = request_id
        if session_id := session_id_ctx.get():
            log_data["session_id"] = session_id
        if audit_id := audit_id_ctx.get():
            log_data["audit_id"] = audit_id
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)
        
        return json.dumps(log_data)


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Set up structured logging."""
    logger = logging.getLogger("prodready")
    logger.setLevel(getattr(logging, level.upper()))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Console handler with structured formatting
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)
    
    return logger


def get_logger(name: str = "prodready") -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name)


def generate_request_id() -> str:
    """Generate a unique request ID."""
    return str(uuid.uuid4())[:8]
