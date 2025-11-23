"""
Security utilities for authentication and authorization
"""
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

from app.core.config import settings


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_license_key() -> str:
    """
    Generate a license key in format: XXXX-XXXX-XXXX-XXXX
    Uses cryptographically secure random generation
    """
    segments = []
    for _ in range(4):
        segment = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(4))
        segments.append(segment)
    return '-'.join(segments)


def get_machine_id(hardware_info: dict) -> str:
    """
    Generate a unique machine ID from hardware information
    
    Args:
        hardware_info: Dict containing CPU ID, MAC address, etc.
    
    Returns:
        SHA256 hash of hardware info
    """
    # Combine hardware identifiers
    combined = f"{hardware_info.get('cpu_id', '')}{hardware_info.get('mac_address', '')}"
    
    # Generate SHA256 hash
    machine_id = hashlib.sha256(combined.encode()).hexdigest()
    return machine_id


def validate_license_key_format(license_key: str) -> bool:
    """
    Validate license key format
    
    Format: XXXX-XXXX-XXXX-XXXX (alphanumeric, no ambiguous characters)
    """
    if not license_key:
        return False
    
    parts = license_key.split('-')
    if len(parts) != 4:
        return False
    
    for part in parts:
        if len(part) != 4:
            return False
        if not part.isalnum():
            return False
    
    return True


def sign_license_data(license_data: dict, private_key: rsa.RSAPrivateKey) -> bytes:
    """
    Sign license data with RSA private key
    
    Args:
        license_data: Dictionary containing license information
        private_key: RSA private key for signing
    
    Returns:
        Signature bytes
    """
    # Serialize license data
    data_str = str(sorted(license_data.items()))
    data_bytes = data_str.encode('utf-8')
    
    # Sign with private key
    signature = private_key.sign(
        data_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    
    return signature


def verify_license_signature(
    license_data: dict,
    signature: bytes,
    public_key: rsa.RSAPublicKey
) -> bool:
    """
    Verify license signature with RSA public key
    
    Args:
        license_data: Dictionary containing license information
        signature: Signature bytes to verify
        public_key: RSA public key for verification
    
    Returns:
        True if signature is valid, False otherwise
    """
    try:
        # Serialize license data
        data_str = str(sorted(license_data.items()))
        data_bytes = data_str.encode('utf-8')
        
        # Verify signature
        public_key.verify(
            signature,
            data_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False


def generate_correlation_id() -> str:
    """Generate a unique correlation ID for request tracking"""
    return secrets.token_hex(16)
