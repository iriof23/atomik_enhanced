"""
Clerk JWT Token Verification

SECURITY: This module provides cryptographic verification of Clerk JWTs
using Clerk's JWKS (JSON Web Key Set) endpoint.

Without this verification, anyone could forge a JWT with any user ID.
With verification, only tokens signed by Clerk's private keys are accepted.

How it works:
1. Clerk signs JWTs with their private key
2. Clerk publishes public keys at /.well-known/jwks.json
3. We fetch those public keys and verify token signatures
4. Only tokens with valid signatures are accepted
"""
import os
import logging
from typing import Optional, Dict, Any
from functools import lru_cache
import jwt
from jwt import PyJWKClient, PyJWKClientError
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class ClerkTokenVerifier:
    """
    Verifies Clerk JWT tokens using JWKS.
    
    SECURITY: This is critical for production - without signature verification,
    attackers could forge tokens with arbitrary user IDs.
    """
    
    def __init__(self):
        self._jwks_client: Optional[PyJWKClient] = None
        self._last_jwks_refresh: Optional[datetime] = None
        self._jwks_refresh_interval = timedelta(hours=1)
        
        # Get Clerk configuration from environment
        self.issuer_url = os.getenv('CLERK_ISSUER_URL', '').rstrip('/')
        self.audience = os.getenv('CLERK_AUDIENCE', '')  # Usually your frontend URL
        
        # Development mode flag - set to False in production!
        self.skip_verification = os.getenv('CLERK_SKIP_VERIFICATION', 'false').lower() == 'true'
        
        if self.skip_verification:
            logger.warning("⚠️ CLERK_SKIP_VERIFICATION is enabled - tokens are NOT being verified!")
            logger.warning("⚠️ This is only acceptable for development. Set to 'false' in production!")
    
    @property
    def jwks_url(self) -> str:
        """Get the JWKS endpoint URL."""
        return f"{self.issuer_url}/.well-known/jwks.json"
    
    def _get_jwks_client(self) -> Optional[PyJWKClient]:
        """
        Get or create the JWKS client with caching.
        
        The client caches the keys internally, but we also track when to
        force a refresh in case keys rotate.
        """
        now = datetime.utcnow()
        
        # Check if we need to refresh the client
        needs_refresh = (
            self._jwks_client is None or
            self._last_jwks_refresh is None or
            (now - self._last_jwks_refresh) > self._jwks_refresh_interval
        )
        
        if needs_refresh:
            try:
                if not self.issuer_url:
                    logger.error("CLERK_ISSUER_URL not configured")
                    return None
                
                logger.info(f"Fetching JWKS from {self.jwks_url}")
                self._jwks_client = PyJWKClient(
                    self.jwks_url,
                    cache_jwk_set=True,
                    lifespan=3600  # Cache for 1 hour
                )
                self._last_jwks_refresh = now
                logger.info("✅ JWKS client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize JWKS client: {e}")
                return None
        
        return self._jwks_client
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify a Clerk JWT token and return the decoded claims.
        
        Args:
            token: The JWT token string
            
        Returns:
            Decoded token claims if valid, None if invalid
            
        SECURITY: This method cryptographically verifies the token signature
        using Clerk's public keys. Only tokens signed by Clerk are accepted.
        """
        if not token:
            logger.warning("Empty token provided")
            return None
        
        # Development mode - skip verification (DANGEROUS in production!)
        if self.skip_verification:
            try:
                claims = jwt.decode(token, options={"verify_signature": False})
                logger.debug(f"Token decoded WITHOUT verification (dev mode): {claims.get('sub')}")
                return claims
            except Exception as e:
                logger.error(f"Failed to decode token: {e}")
                return None
        
        # Production mode - verify signature
        try:
            jwks_client = self._get_jwks_client()
            if not jwks_client:
                logger.error("JWKS client not available - cannot verify tokens")
                return None
            
            # Get the signing key from the token header
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            # Build verification options
            verify_options = {
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iat": True,
                "require": ["exp", "iat", "sub"],
            }
            
            # Verify and decode the token
            decoded = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=self.issuer_url,
                options=verify_options,
            )
            
            logger.debug(f"✅ Token verified successfully for user: {decoded.get('sub')}")
            return decoded
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidIssuerError:
            logger.warning(f"Invalid token issuer")
            return None
        except jwt.InvalidAudienceError:
            logger.warning("Invalid token audience")
            return None
        except PyJWKClientError as e:
            logger.error(f"JWKS client error: {e}")
            # Try refreshing the JWKS client
            self._jwks_client = None
            return None
        except jwt.PyJWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error verifying token: {e}")
            return None
    
    def get_user_id(self, token: str) -> Optional[str]:
        """
        Extract the user ID from a verified token.
        
        Returns None if the token is invalid or doesn't contain a user ID.
        """
        claims = self.verify_token(token)
        if claims:
            return claims.get("sub")
        return None


# Global instance
_clerk_verifier: Optional[ClerkTokenVerifier] = None


def get_clerk_verifier() -> ClerkTokenVerifier:
    """Get the global Clerk token verifier instance."""
    global _clerk_verifier
    if _clerk_verifier is None:
        _clerk_verifier = ClerkTokenVerifier()
    return _clerk_verifier


def verify_clerk_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Convenience function to verify a Clerk token.
    
    Usage:
        claims = verify_clerk_token(token)
        if claims:
            user_id = claims["sub"]
    """
    return get_clerk_verifier().verify_token(token)

