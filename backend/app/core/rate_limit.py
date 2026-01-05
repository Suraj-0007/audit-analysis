"""Simple in-memory rate limiting."""

from collections import defaultdict
from datetime import datetime, timedelta
from threading import Lock
from typing import Dict, List
from fastapi import Request, HTTPException


class RateLimiter:
    """Simple in-memory rate limiter per IP."""
    
    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, List[datetime]] = defaultdict(list)
        self._lock = Lock()
    
    def _cleanup_old_requests(self, ip: str, now: datetime) -> None:
        """Remove requests older than 1 minute."""
        cutoff = now - timedelta(minutes=1)
        self.requests[ip] = [t for t in self.requests[ip] if t > cutoff]
    
    def is_allowed(self, ip: str) -> bool:
        """Check if request is allowed for the given IP."""
        now = datetime.utcnow()
        
        with self._lock:
            self._cleanup_old_requests(ip, now)
            
            if len(self.requests[ip]) >= self.requests_per_minute:
                return False
            
            self.requests[ip].append(now)
            return True
    
    def get_remaining(self, ip: str) -> int:
        """Get remaining requests for the IP."""
        now = datetime.utcnow()
        
        with self._lock:
            self._cleanup_old_requests(ip, now)
            return max(0, self.requests_per_minute - len(self.requests[ip]))


# Global rate limiter instance
rate_limiter: RateLimiter = None


def get_rate_limiter(requests_per_minute: int) -> RateLimiter:
    """Get or create the global rate limiter."""
    global rate_limiter
    if rate_limiter is None:
        rate_limiter = RateLimiter(requests_per_minute)
    return rate_limiter


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    # Check for forwarded headers
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


async def rate_limit_middleware(request: Request, limiter: RateLimiter) -> None:
    """Check rate limit and raise exception if exceeded."""
    ip = get_client_ip(request)
    
    if not limiter.is_allowed(ip):
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit_exceeded",
                "message": f"Too many requests. Limit: {limiter.requests_per_minute}/minute",
                "retry_after_seconds": 60,
            }
        )
