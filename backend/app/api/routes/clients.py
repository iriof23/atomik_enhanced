"""
Client management routes
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from prisma import Prisma

from app.api.routes.auth import get_current_user
from app.main import db


router = APIRouter()


# Request/Response models
class ClientCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class ClientResponse(BaseModel):
    id: str
    name: str
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    address: Optional[str]
    organization_id: Optional[str]
    created_at: str
    updated_at: str


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(get_current_user)
):
    """List all clients for the current user's organization"""
    where_clause = {}
    
    # Filter by organization in docker mode
    if current_user.organizationId:
        where_clause["organizationId"] = current_user.organizationId
    
    clients = await db.client.find_many(
        where=where_clause,
        skip=skip,
        take=limit,
        order={"createdAt": "desc"}
    )
    
    return [
        ClientResponse(
            id=client.id,
            name=client.name,
            contact_name=client.contactName,
            contact_email=client.contactEmail,
            contact_phone=client.contactPhone,
            address=client.address,
            organization_id=client.organizationId,
            created_at=client.createdAt.isoformat(),
            updated_at=client.updatedAt.isoformat(),
        )
        for client in clients
    ]


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    current_user = Depends(get_current_user)
):
    """Create a new client"""
    client = await db.client.create(
        data={
            "name": client_data.name,
            "contactName": client_data.contact_name,
            "contactEmail": client_data.contact_email,
            "contactPhone": client_data.contact_phone,
            "address": client_data.address,
            "organizationId": current_user.organizationId,
        }
    )
    
    return ClientResponse(
        id=client.id,
        name=client.name,
        contact_name=client.contactName,
        contact_email=client.contactEmail,
        contact_phone=client.contactPhone,
        address=client.address,
        organization_id=client.organizationId,
        created_at=client.createdAt.isoformat(),
        updated_at=client.updatedAt.isoformat(),
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific client by ID"""
    client = await db.client.find_unique(where={"id": client_id})
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Check organization access
    if current_user.organizationId and client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return ClientResponse(
        id=client.id,
        name=client.name,
        contact_name=client.contactName,
        contact_email=client.contactEmail,
        contact_phone=client.contactPhone,
        address=client.address,
        organization_id=client.organizationId,
        created_at=client.createdAt.isoformat(),
        updated_at=client.updatedAt.isoformat(),
    )


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client_data: ClientUpdate,
    current_user = Depends(get_current_user)
):
    """Update a client"""
    client = await db.client.find_unique(where={"id": client_id})
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Check organization access
    if current_user.organizationId and client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Build update data
    update_data = {}
    if client_data.name is not None:
        update_data["name"] = client_data.name
    if client_data.contact_name is not None:
        update_data["contactName"] = client_data.contact_name
    if client_data.contact_email is not None:
        update_data["contactEmail"] = client_data.contact_email
    if client_data.contact_phone is not None:
        update_data["contactPhone"] = client_data.contact_phone
    if client_data.address is not None:
        update_data["address"] = client_data.address
    
    updated_client = await db.client.update(
        where={"id": client_id},
        data=update_data
    )
    
    return ClientResponse(
        id=updated_client.id,
        name=updated_client.name,
        contact_name=updated_client.contactName,
        contact_email=updated_client.contactEmail,
        contact_phone=updated_client.contactPhone,
        address=updated_client.address,
        organization_id=updated_client.organizationId,
        created_at=updated_client.createdAt.isoformat(),
        updated_at=updated_client.updatedAt.isoformat(),
    )


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a client"""
    client = await db.client.find_unique(where={"id": client_id})
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Check organization access
    if current_user.organizationId and client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.client.delete(where={"id": client_id})
    return None
