"""URL validation and sanitization utilities."""

import re
import ipaddress
from urllib.parse import urlparse
from typing import Tuple

from app.core.config import settings


# Private IP ranges
PRIVATE_IP_PATTERNS = [
    r'^127\.',
    r'^10\.',
    r'^172\.(1[6-9]|2[0-9]|3[01])\.',
    r'^192\.168\.',
    r'^169\.254\.',
    r'^::1$',
    r'^fc00:',
    r'^fe80:',
]


def is_private_ip(host: str) -> bool:
    """Check if the host is a private/local IP address."""
    # Check localhost variants
    if host.lower() in ('localhost', 'localhost.localdomain'):
        return True
    
    # Check IP patterns
    for pattern in PRIVATE_IP_PATTERNS:
        if re.match(pattern, host):
            return True
    
    # Try to parse as IP address
    try:
        ip = ipaddress.ip_address(host)
        return ip.is_private or ip.is_loopback or ip.is_link_local
    except ValueError:
        pass
    
    return False


def validate_url(url: str) -> Tuple[bool, str]:
    """
    Validate a URL for audit.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not url:
        return False, "URL is required"
    
    url = url.strip()
    
    # Check scheme
    if not url.startswith(('http://', 'https://')):
        return False, "URL must start with http:// or https://"
    
    # Parse URL
    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Invalid URL format: {e}"
    
    # Check host
    host = parsed.netloc or parsed.hostname
    if not host:
        return False, "URL must have a valid host"
    
    # Extract hostname without port
    hostname = host.split(':')[0]
    
    # Check for private IPs unless allowed
    if not settings.ALLOW_PRIVATE_IPS and is_private_ip(hostname):
        return False, "Private/local IP addresses are not allowed. Set ALLOW_PRIVATE_IPS=true for internal testing."
    
    # Basic path validation
    if '..' in parsed.path:
        return False, "Invalid path traversal in URL"
    
    return True, ""


def normalize_url(url: str) -> str:
    """Normalize a URL by removing fragments and trailing slashes."""
    parsed = urlparse(url)
    
    # Remove fragment
    normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    
    # Keep query string
    if parsed.query:
        normalized += f"?{parsed.query}"
    
    # Remove trailing slash for consistency (except root)
    if normalized.endswith('/') and len(normalized) > len(f"{parsed.scheme}://{parsed.netloc}/"):
        normalized = normalized[:-1]
    
    return normalized


def get_domain(url: str) -> str:
    """Extract domain from URL."""
    parsed = urlparse(url)
    return parsed.netloc
