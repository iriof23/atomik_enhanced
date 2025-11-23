"""
Authentication routes for both desktop and docker modes
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.main import db


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


# Dependency to get current user
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = await db.user.find_unique(where={"id": user_id})
    if user is None:
        raise credentials_exception
    
    return user


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


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        organization_id=current_user.organizationId,
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
