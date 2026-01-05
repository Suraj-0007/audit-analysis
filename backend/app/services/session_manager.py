"""Session management with TTL and cleanup."""

import asyncio
import os
import shutil
from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, Optional
from dataclasses import dataclass, field
import uuid

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas import SessionStatus

logger = get_logger(__name__)


@dataclass
class Session:
    """Represents an audit session."""
    session_id: str
    url: str
    status: SessionStatus
    created_at: datetime
    expires_at: datetime
    storage_state_path: Optional[str] = None
    browser_context_id: Optional[str] = None
    is_authenticated: bool = False
    
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
    
    def time_remaining_minutes(self) -> int:
        remaining = (self.expires_at - datetime.utcnow()).total_seconds() / 60
        return max(0, int(remaining))


class SessionManager:
    """Thread-safe session manager with automatic cleanup."""
    
    def __init__(self):
        self._sessions: Dict[str, Session] = {}
        self._lock = Lock()
        self._cleanup_task: Optional[asyncio.Task] = None
    
    def create_session(self, url: str) -> Session:
        """Create a new session."""
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=settings.SESSION_TTL_MINUTES)
        
        # Create session directory for artifacts
        session_dir = os.path.join(settings.ARTIFACTS_DIR, "sessions", session_id)
        os.makedirs(session_dir, exist_ok=True)
        
        storage_state_path = os.path.join(session_dir, "storage_state.json")
        
        session = Session(
            session_id=session_id,
            url=url,
            status=SessionStatus.STARTED,
            created_at=now,
            expires_at=expires_at,
            storage_state_path=storage_state_path,
        )
        
        with self._lock:
            self._sessions[session_id] = session
        
        logger.info(f"Created session {session_id} for URL {url}")
        return session
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        with self._lock:
            session = self._sessions.get(session_id)
            
            if session and session.is_expired():
                logger.info(f"Session {session_id} has expired")
                self._cleanup_session(session_id)
                return None
            
            return session
    
    def mark_authenticated(self, session_id: str) -> bool:
        """Mark a session as authenticated."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session and not session.is_expired():
                session.is_authenticated = True
                session.status = SessionStatus.AUTHENTICATED
                logger.info(f"Session {session_id} marked as authenticated")
                return True
            return False
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session and clean up its artifacts."""
        with self._lock:
            return self._cleanup_session(session_id)
    
    def _cleanup_session(self, session_id: str) -> bool:
        """Internal cleanup - must be called with lock held."""
        session = self._sessions.pop(session_id, None)
        if session:
            # Clean up session directory
            session_dir = os.path.join(settings.ARTIFACTS_DIR, "sessions", session_id)
            if os.path.exists(session_dir):
                try:
                    shutil.rmtree(session_dir)
                    logger.info(f"Cleaned up session directory: {session_dir}")
                except Exception as e:
                    logger.error(f"Failed to clean up session directory: {e}")
            return True
        return False
    
    def cleanup_expired_sessions(self) -> int:
        """Clean up all expired sessions. Returns count of cleaned sessions."""
        cleaned = 0
        with self._lock:
            expired_ids = [
                sid for sid, session in self._sessions.items()
                if session.is_expired()
            ]
            for session_id in expired_ids:
                if self._cleanup_session(session_id):
                    cleaned += 1
        
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} expired sessions")
        return cleaned
    
    def get_active_count(self) -> int:
        """Get count of active (non-expired) sessions."""
        with self._lock:
            return sum(1 for s in self._sessions.values() if not s.is_expired())
    
    async def start_cleanup_loop(self, interval_seconds: int = 60):
        """Start periodic cleanup of expired sessions."""
        async def cleanup_loop():
            while True:
                await asyncio.sleep(interval_seconds)
                try:
                    self.cleanup_expired_sessions()
                except Exception as e:
                    logger.error(f"Error in session cleanup loop: {e}")
        
        self._cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info("Started session cleanup loop")
    
    def stop_cleanup_loop(self):
        """Stop the cleanup loop."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None


# Global session manager instance
session_manager = SessionManager()
