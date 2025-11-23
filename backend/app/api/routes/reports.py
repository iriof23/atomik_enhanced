"""
Report management and generation routes
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.api.routes.auth import get_current_user
from app.main import db


router = APIRouter()


# Request/Response models
class ReportCreate(BaseModel):
    title: str
    project_id: str
    report_type: str = "PENTEST"
    template_id: Optional[str] = None


class ReportResponse(BaseModel):
    id: str
    title: str
    report_type: str
    status: str
    project_id: str
    project_name: str
    generated_by_id: str
    generated_by_name: str
    template_id: Optional[str]
    pdf_path: Optional[str]
    created_at: str
    updated_at: str
    generated_at: Optional[str]


@router.get("/", response_model=list[ReportResponse])
async def list_reports(
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """List all reports"""
    where_clause = {}
    
    # Filter by organization through project->client relationship
    if current_user.organizationId:
        where_clause["project"] = {
            "client": {"organizationId": current_user.organizationId}
        }
    
    if project_id:
        where_clause["projectId"] = project_id
    
    reports = await db.report.find_many(
        where=where_clause,
        skip=skip,
        take=limit,
        include={
            "project": True,
            "generatedBy": True,
        },
        order={"createdAt": "desc"}
    )
    
    return [
        ReportResponse(
            id=report.id,
            title=report.title,
            report_type=report.reportType,
            status=report.status,
            project_id=report.projectId,
            project_name=report.project.name,
            generated_by_id=report.generatedById,
            generated_by_name=report.generatedBy.name,
            template_id=report.templateId,
            pdf_path=report.pdfPath,
            created_at=report.createdAt.isoformat(),
            updated_at=report.updatedAt.isoformat(),
            generated_at=report.generatedAt.isoformat() if report.generatedAt else None,
        )
        for report in reports
    ]


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Create a new report (initiates generation)"""
    # Verify project exists and user has access
    project = await db.project.find_unique(
        where={"id": report_data.project_id},
        include={"client": True}
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    if current_user.organizationId and project.client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    report = await db.report.create(
        data={
            "title": report_data.title,
            "reportType": report_data.report_type,
            "projectId": report_data.project_id,
            "generatedById": current_user.id,
            "templateId": report_data.template_id,
            "status": "DRAFT",
        },
        include={
            "project": True,
            "generatedBy": True,
        }
    )
    
    # TODO: Add background task for PDF generation
    # background_tasks.add_task(generate_report_pdf, report.id)
    
    return ReportResponse(
        id=report.id,
        title=report.title,
        report_type=report.reportType,
        status=report.status,
        project_id=report.projectId,
        project_name=report.project.name,
        generated_by_id=report.generatedById,
        generated_by_name=report.generatedBy.name,
        template_id=report.templateId,
        pdf_path=report.pdfPath,
        created_at=report.createdAt.isoformat(),
        updated_at=report.updatedAt.isoformat(),
        generated_at=report.generatedAt.isoformat() if report.generatedAt else None,
    )


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    current_user = Depends(get_current_user)
):
    """Get a specific report by ID"""
    report = await db.report.find_unique(
        where={"id": report_id},
        include={
            "project": {"include": {"client": True}},
            "generatedBy": True,
        }
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Check organization access
    if current_user.organizationId and report.project.client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return ReportResponse(
        id=report.id,
        title=report.title,
        report_type=report.reportType,
        status=report.status,
        project_id=report.projectId,
        project_name=report.project.name,
        generated_by_id=report.generatedById,
        generated_by_name=report.generatedBy.name,
        template_id=report.templateId,
        pdf_path=report.pdfPath,
        created_at=report.createdAt.isoformat(),
        updated_at=report.updatedAt.isoformat(),
        generated_at=report.generatedAt.isoformat() if report.generatedAt else None,
    )


@router.post("/{report_id}/generate")
async def generate_report(
    report_id: str,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Generate PDF for a report"""
    report = await db.report.find_unique(
        where={"id": report_id},
        include={"project": {"include": {"client": True}}}
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Check organization access
    if current_user.organizationId and report.project.client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update status to generating
    await db.report.update(
        where={"id": report_id},
        data={"status": "GENERATING"}
    )
    
    # TODO: Add background task for PDF generation
    # background_tasks.add_task(generate_report_pdf, report_id)
    
    return {"message": "Report generation started", "report_id": report_id}


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_user = Depends(get_current_user)
):
    """Download generated PDF report"""
    report = await db.report.find_unique(
        where={"id": report_id},
        include={"project": {"include": {"client": True}}}
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Check organization access
    if current_user.organizationId and report.project.client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if not report.pdfPath or report.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report PDF not available"
        )
    
    # TODO: Return actual file
    # return FileResponse(report.pdfPath, media_type="application/pdf", filename=f"{report.title}.pdf")
    
    return {"message": "Download endpoint - implementation pending"}


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a report"""
    report = await db.report.find_unique(
        where={"id": report_id},
        include={"project": {"include": {"client": True}}}
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Check organization access
    if current_user.organizationId and report.project.client.organizationId != current_user.organizationId:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # TODO: Delete PDF file if exists
    
    await db.report.delete(where={"id": report_id})
    return None
