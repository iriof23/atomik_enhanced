"""
Project management routes
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.api.routes.auth import get_current_user
from app.main import db


router = APIRouter()


# Request/Response models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    start_date: Optional[str]
    end_date: Optional[str]
    client_id: str
    client_name: str
    lead_id: str
    lead_name: str
    created_at: str
    updated_at: str
    finding_count: int
    report_count: int


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """List all projects"""
    where_clause = {}
    
    # Filter by organization through client relationship
    if current_user.organizationId:
        where_clause["client"] = {"organizationId": current_user.organizationId}
    
    if status:
        where_clause["status"] = status
    
    if client_id:
        where_clause["clientId"] = client_id
    
    projects = await db.project.find_many(
        where=where_clause,
        skip=skip,
        take=limit,
        include={
            "client": True,
            "lead": True,
            "_count": {
                "select": {
                    "findings": True,
                    "reports": True,
                }
            }
        },
        order={"createdAt": "desc"}
    )
    
    return [
        ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            status=project.status,
            start_date=project.startDate.isoformat() if project.startDate else None,
            end_date=project.endDate.isoformat() if project.endDate else None,
            client_id=project.clientId,
            client_name=project.client.name,
            lead_id=project.leadId,
            lead_name=project.lead.name,
            created_at=project.createdAt.isoformat(),
            updated_at=project.updatedAt.isoformat(),
            finding_count=project._count.findings,
            report_count=project._count.reports,
        )
        for project in projects
    ]


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user = Depends(get_current_user)
):
    """Create a new project"""
    # Verify client exists and user has access
    client = await db.client.find_unique(where={"id": project_data.client_id})
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    if current_user.organizationId and client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    project = await db.project.create(
        data={
            "name": project_data.name,
            "description": project_data.description,
            "clientId": project_data.client_id,
            "leadId": current_user.id,
            "startDate": project_data.start_date,
            "endDate": project_data.end_date,
            "status": "PLANNING",
        },
        include={
            "client": True,
            "lead": True,
            "_count": {
                "select": {
                    "findings": True,
                    "reports": True,
                }
            }
        }
    )
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        start_date=project.startDate.isoformat() if project.startDate else None,
        end_date=project.endDate.isoformat() if project.endDate else None,
        client_id=project.clientId,
        client_name=project.client.name,
        lead_id=project.leadId,
        lead_name=project.lead.name,
        created_at=project.createdAt.isoformat(),
        updated_at=project.updatedAt.isoformat(),
        finding_count=project._count.findings,
        report_count=project._count.reports,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific project by ID"""
    project = await db.project.find_unique(
        where={"id": project_id},
        include={
            "client": True,
            "lead": True,
            "_count": {
                "select": {
                    "findings": True,
                    "reports": True,
                }
            }
        }
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check organization access
    if current_user.organizationId and project.client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        start_date=project.startDate.isoformat() if project.startDate else None,
        end_date=project.endDate.isoformat() if project.endDate else None,
        client_id=project.clientId,
        client_name=project.client.name,
        lead_id=project.leadId,
        lead_name=project.lead.name,
        created_at=project.createdAt.isoformat(),
        updated_at=project.updatedAt.isoformat(),
        finding_count=project._count.findings,
        report_count=project._count.reports,
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user = Depends(get_current_user)
):
    """Update a project"""
    project = await db.project.find_unique(
        where={"id": project_id},
        include={"client": True}
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check organization access
    if current_user.organizationId and project.client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Build update data
    update_data = {}
    if project_data.name is not None:
        update_data["name"] = project_data.name
    if project_data.description is not None:
        update_data["description"] = project_data.description
    if project_data.status is not None:
        update_data["status"] = project_data.status
    if project_data.start_date is not None:
        update_data["startDate"] = project_data.start_date
    if project_data.end_date is not None:
        update_data["endDate"] = project_data.end_date
    
    updated_project = await db.project.update(
        where={"id": project_id},
        data=update_data,
        include={
            "client": True,
            "lead": True,
            "_count": {
                "select": {
                    "findings": True,
                    "reports": True,
                }
            }
        }
    )
    
    return ProjectResponse(
        id=updated_project.id,
        name=updated_project.name,
        description=updated_project.description,
        status=updated_project.status,
        start_date=updated_project.startDate.isoformat() if updated_project.startDate else None,
        end_date=updated_project.endDate.isoformat() if updated_project.endDate else None,
        client_id=updated_project.clientId,
        client_name=updated_project.client.name,
        lead_id=updated_project.leadId,
        lead_name=updated_project.lead.name,
        created_at=updated_project.createdAt.isoformat(),
        updated_at=updated_project.updatedAt.isoformat(),
        finding_count=updated_project._count.findings,
        report_count=updated_project._count.reports,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a project"""
    project = await db.project.find_unique(
        where={"id": project_id},
        include={"client": True}
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check organization access
    if current_user.organizationId and project.client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.project.delete(where={"id": project_id})
    return None
