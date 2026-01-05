"""Security header checking utilities."""

import httpx
from typing import Dict, List
from app.core.logging import get_logger

logger = get_logger(__name__)

# Security headers to check for
SECURITY_HEADERS = {
    "Strict-Transport-Security": "HSTS - Enforces HTTPS connections",
    "Content-Security-Policy": "CSP - Prevents XSS and injection attacks",
    "X-Content-Type-Options": "Prevents MIME type sniffing",
    "X-Frame-Options": "Prevents clickjacking",
    "Referrer-Policy": "Controls referrer information",
    "Permissions-Policy": "Controls browser features",
}


async def check_security_headers(url: str) -> Dict[str, List[str]]:
    """
    Check for presence of security headers.
    
    Returns:
        Dict with 'present' and 'missing' header lists
    """
    present = []
    missing = []
    
    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            verify=False,  # Don't fail on self-signed certs
            follow_redirects=True,
        ) as client:
            response = await client.head(url)
            headers = response.headers
            
            for header, description in SECURITY_HEADERS.items():
                header_lower = header.lower()
                # Check case-insensitively
                found = any(h.lower() == header_lower for h in headers.keys())
                
                if found:
                    present.append(header)
                else:
                    missing.append(header)
    
    except httpx.TimeoutException:
        logger.warning(f"Timeout checking security headers for {url}")
        missing = list(SECURITY_HEADERS.keys())
    except Exception as e:
        logger.warning(f"Error checking security headers for {url}: {e}")
        missing = list(SECURITY_HEADERS.keys())
    
    return {
        "present": present,
        "missing": missing,
    }


def get_header_recommendations(missing_headers: List[str]) -> Dict[str, str]:
    """Get recommendations for missing headers."""
    recommendations = {}
    
    if "Strict-Transport-Security" in missing_headers:
        recommendations["HSTS"] = "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains'"
    
    if "Content-Security-Policy" in missing_headers:
        recommendations["CSP"] = "Implement a Content Security Policy appropriate for your application"
    
    if "X-Content-Type-Options" in missing_headers:
        recommendations["X-Content-Type-Options"] = "Add 'X-Content-Type-Options: nosniff'"
    
    if "X-Frame-Options" in missing_headers:
        recommendations["X-Frame-Options"] = "Add 'X-Frame-Options: DENY' or 'SAMEORIGIN'"
    
    if "Referrer-Policy" in missing_headers:
        recommendations["Referrer-Policy"] = "Add 'Referrer-Policy: strict-origin-when-cross-origin'"
    
    if "Permissions-Policy" in missing_headers:
        recommendations["Permissions-Policy"] = "Consider adding Permissions-Policy to restrict browser features"
    
    return recommendations
