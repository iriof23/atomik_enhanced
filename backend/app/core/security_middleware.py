"""
Security Middleware for FastAPI

SECURITY: This module provides security-focused middleware including:
- Secure cookie settings (HttpOnly, SameSite, Secure)
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Request ID tracking for audit logging
"""
import uuid
import logging
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds security headers to all responses.
    
    SECURITY: These headers provide defense-in-depth against various attacks:
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Legacy XSS protection (deprecated but still useful)
    - Referrer-Policy: Controls referrer information leakage
    - Permissions-Policy: Restricts browser features
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking (allow framing only from same origin)
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        
        # Legacy XSS protection (for older browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Restrict browser features
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(), usb=()"
        )
        
        # Add request ID for tracing (useful for audit logs)
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        response.headers["X-Request-ID"] = request_id
        
        return response


class SecureCookieMiddleware(BaseHTTPMiddleware):
    """
    Ensures all cookies set by the application have secure attributes.
    
    SECURITY: Secure cookie attributes protect against:
    - HttpOnly: Prevents JavaScript access (XSS protection)
    - Secure: Ensures cookies only sent over HTTPS
    - SameSite: Prevents CSRF attacks
    """
    
    # Cookie attributes to enforce
    SECURE_COOKIE_ATTRS = {
        "httponly": True,
        "samesite": "lax",  # "strict" for maximum security, "lax" for usability
    }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Check if response has cookies that need securing
        if "set-cookie" in response.headers:
            # Parse and secure existing cookies
            cookies = response.headers.getlist("set-cookie")
            secured_cookies = []
            
            for cookie in cookies:
                secured_cookie = self._secure_cookie(cookie)
                secured_cookies.append(secured_cookie)
            
            # Replace cookies with secured versions
            del response.headers["set-cookie"]
            for cookie in secured_cookies:
                response.headers.append("set-cookie", cookie)
        
        return response
    
    def _secure_cookie(self, cookie: str) -> str:
        """Add security attributes to a cookie string."""
        cookie_lower = cookie.lower()
        
        # Add HttpOnly if not present
        if "httponly" not in cookie_lower:
            cookie += "; HttpOnly"
        
        # Add SameSite if not present
        if "samesite" not in cookie_lower:
            cookie += "; SameSite=Lax"
        
        # Add Secure if in production (HTTPS) and not present
        if not settings.DEBUG and "secure" not in cookie_lower:
            cookie += "; Secure"
        
        return cookie


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Adds request context for audit logging and tracing.
    
    This middleware extracts information from the request that's useful
    for audit logging and stores it in request.state for later use.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # Extract client information
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "Unknown")
        
        # Store in request state for access in route handlers
        request.state.request_id = request_id
        request.state.client_ip = client_ip
        request.state.user_agent = user_agent
        
        # Log the request (at debug level to avoid spam)
        logger.debug(
            f"Request: {request.method} {request.url.path} "
            f"| IP: {client_ip} | ID: {request_id}"
        )
        
        response = await call_next(request)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies."""
        # Check X-Forwarded-For header (set by nginx/proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct connection IP
        if request.client:
            return request.client.host
        
        return "unknown"


def get_request_context(request: Request) -> dict:
    """
    Get request context from request.state.
    
    Usage in route handlers:
        context = get_request_context(request)
        await audit_service.log(..., ip_address=context["client_ip"])
    """
    return {
        "request_id": getattr(request.state, "request_id", None),
        "client_ip": getattr(request.state, "client_ip", None),
        "user_agent": getattr(request.state, "user_agent", None),
    }

