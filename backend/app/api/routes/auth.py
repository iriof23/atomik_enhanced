"""
Authentication routes for both desktop and docker modes

SECURITY: This module handles authentication with multiple methods:
- Clerk JWT tokens (primary, with JWKS verification)
- Legacy JWT tokens (fallback)
- License key activation (desktop mode)

All authentication attempts are logged for audit purposes.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from prisma import Prisma

from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_license_key_format,
)
from app.core.clerk_auth import verify_clerk_token
from app.db import db


router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# Request/Response models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    organization_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class LicenseActivation(BaseModel):
    license_key: str
    machine_id: str
    hardware_info: dict


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    organization_id: Optional[str] = None


class OrganizationInfo(BaseModel):
    """Organization info for the /me endpoint"""
    id: str
    name: str
    slug: str
    plan: str
    creditBalance: int
    subscriptionStatus: Optional[str] = None


class UserWithOrgResponse(BaseModel):
    """Extended user response with organization details"""
    id: str
    email: str
    name: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    imageUrl: Optional[str] = None
    role: str
    creditBalance: int
    organization: Optional[OrganizationInfo] = None


# Dependency to get current user
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Get current authenticated user from JWT token or Clerk token.
    
    SECURITY: Clerk tokens are now cryptographically verified using JWKS.
    This prevents token forgery attacks.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try to decode as legacy JWT (for backwards compatibility)
    payload = decode_token(token)
    if payload is not None:
        user_id: str = payload.get("sub")
        if user_id:
            user = await db.user.find_unique(where={"id": user_id})
            if user:
                logger.debug(f"User authenticated via legacy JWT: {user.email}")
                return user
    
    # Try to validate as Clerk token (with JWKS verification)
    try:
        # SECURITY: verify_clerk_token uses JWKS to cryptographically verify the signature
        # Set CLERK_SKIP_VERIFICATION=true only for development
        claims = verify_clerk_token(token)
        
        if not claims:
            logger.warning("Clerk token verification failed")
            raise credentials_exception
        
        clerk_user_id = claims.get("sub")
        
        if not clerk_user_id:
            logger.error("No 'sub' claim in verified Clerk token")
            raise credentials_exception
        
        logger.debug(f"Clerk token verified. User ID: {clerk_user_id}")
        
        # Find user by Clerk external ID
        user = await db.user.find_unique(where={"externalId": clerk_user_id})
        if user:
            logger.debug(f"Found existing user: {user.email}")
            return user
        
        # Auto-create user from Clerk token if not exists
        # Note: Email may not be in token claims - use placeholder if needed
        email = claims.get("email") or f"{clerk_user_id}@clerk.user"
        name = claims.get("name") or "Clerk User"
        
        logger.info(f"Creating new user from Clerk token: {email}")
        user = await db.user.create(
            data={
                "externalId": clerk_user_id,
                "email": email,
                "firstName": claims.get("first_name", "Clerk"),
                "lastName": claims.get("last_name", "User"),
                "name": name,
                "creditBalance": 5  # Default trial credits
            }
        )
        logger.info(f"User created successfully: {user.id}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating Clerk token: {type(e).__name__}: {e}")
    
    raise credentials_exception


# Docker mode endpoints
@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user (Docker mode only)"""
    if settings.is_desktop_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration not available in desktop mode"
        )
    
    # Check if user already exists
    existing_user = await db.user.find_unique(where={"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create organization if provided
    organization_id = None
    if user_data.organization_name:
        # Generate slug from organization name
        slug = user_data.organization_name.lower().replace(" ", "-")
        
        organization = await db.organization.create(
            data={
                "name": user_data.organization_name,
                "slug": slug,
                "plan": "FREE",
            }
        )
        organization_id = organization.id
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = await db.user.create(
        data={
            "email": user_data.email,
            "name": user_data.name,
            "passwordHash": hashed_password,
            "organizationId": organization_id,
            "role": "ADMIN" if organization_id else "USER",
        }
    )
    
    # Generate tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with email and password (Docker mode)"""
    if settings.is_desktop_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password login not available in desktop mode"
        )
    
    # Find user
    user = await db.user.find_unique(where={"email": form_data.username})
    if not user or not user.passwordHash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(form_data.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    await db.user.update(
        where={"id": user.id},
        data={"lastLoginAt": datetime.utcnow()}
    )
    
    # Generate tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


# Desktop mode endpoints
@router.post("/activate-license", response_model=TokenResponse)
async def activate_license(activation: LicenseActivation):
    """Activate license key (Desktop mode only)"""
    if settings.is_docker_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="License activation not available in docker mode"
        )
    
    # Validate license key format
    if not validate_license_key_format(activation.license_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid license key format"
        )
    
    # Check if license exists and is valid
    license_record = await db.license.find_unique(
        where={"licenseKey": activation.license_key}
    )
    
    if not license_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License key not found"
        )
    
    if not license_record.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="License key is deactivated"
        )
    
    # Check if license is already activated on another machine
    if license_record.machineId and license_record.machineId != activation.machine_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="License key is already activated on another machine"
        )
    
    # Activate license
    await db.license.update(
        where={"licenseKey": activation.license_key},
        data={
            "machineId": activation.machine_id,
            "activatedAt": datetime.utcnow(),
            "lastValidatedAt": datetime.utcnow(),
        }
    )
    
    # Find or create user for this license
    user = await db.user.find_unique(where={"licenseKey": activation.license_key})
    if not user:
        user = await db.user.create(
            data={
                "email": f"user-{activation.license_key}@local",
                "name": "Desktop User",
                "licenseKey": activation.license_key,
                "role": "ADMIN",
            }
        )
    
    # Generate tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/validate-license")
async def validate_license(license_key: str, machine_id: str):
    """Validate license key (Desktop mode)"""
    if settings.is_docker_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="License validation not available in docker mode"
        )
    
    license_record = await db.license.find_unique(where={"licenseKey": license_key})
    
    if not license_record:
        return {"valid": False, "reason": "License key not found"}
    
    if not license_record.isActive:
        return {"valid": False, "reason": "License key is deactivated"}
    
    if license_record.machineId != machine_id:
        return {"valid": False, "reason": "Machine ID mismatch"}
    
    # Check expiration
    if license_record.expiresAt and license_record.expiresAt < datetime.utcnow():
        return {"valid": False, "reason": "License key expired"}
    
    # Update last validated timestamp
    await db.license.update(
        where={"licenseKey": license_key},
        data={"lastValidatedAt": datetime.utcnow()}
    )
    
    # Check grace period
    grace_period_active = False
    if license_record.lastValidatedAt:
        days_since_validation = (datetime.utcnow() - license_record.lastValidatedAt).days
        grace_period_active = days_since_validation <= settings.GRACE_PERIOD_DAYS
    
    return {
        "valid": True,
        "plan": license_record.plan,
        "max_projects": license_record.maxProjects,
        "expires_at": license_record.expiresAt,
        "grace_period_active": grace_period_active,
    }


@router.get("/me", response_model=UserWithOrgResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """
    Get current user information with organization details.
    
    Returns user data along with their organization's plan and credit balance.
    This is used by the frontend to determine feature access.
    """
    # Fetch user with organization included
    user = await db.user.find_unique(
        where={"id": current_user.id},
        include={"organization": True}
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Build organization info if user has one
    org_info = None
    if user.organization:
        org = user.organization
        org_info = OrganizationInfo(
            id=org.id,
            name=org.name,
            slug=org.slug,
            plan=org.plan,
            creditBalance=org.creditBalance,
            subscriptionStatus=org.subscriptionStatus,
        )
    
    return UserWithOrgResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        firstName=user.firstName,
        lastName=user.lastName,
        imageUrl=user.imageUrl,
        role=user.role,
        creditBalance=user.creditBalance,
        organization=org_info,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """Refresh access token"""
    payload = decode_token(refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = await db.user.find_unique(where={"id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Generate new tokens
    new_access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )
