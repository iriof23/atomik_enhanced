"""
Report Data Service - The Shared Brain

Prepares the Context Dictionary for PDF and DOCX report generation engines.
Fetches all report data and processes rich text fields for both formats.
"""
import os
import json
import base64
import httpx
import logging
from datetime import datetime
from typing import Optional, Any
from dataclasses import dataclass, field

from app.db import db
from app.services.rich_text_service import RichTextService

logger = logging.getLogger(__name__)


@dataclass
class FindingContext:
    """Processed finding data for report templates."""
    id: str
    reference_id: Optional[str]
    title: str
    severity: str
    severity_color: str
    cvss_score: Optional[float]
    cvss_vector: Optional[str]
    cve_id: Optional[str]
    status: str
    
    # Rich text fields - dual format
    description_html: str
    description_plain: str
    remediation_html: str
    remediation_plain: str
    evidence_html: str  # PoC/Evidence rich text HTML
    evidence_plain: str  # PoC/Evidence plain text
    
    # Additional fields
    affected_systems: Optional[str]
    affected_assets_json: Optional[str]  # JSON array of affected assets
    affected_assets_html: str  # Processed HTML for affected assets
    affected_assets_count: int
    references: list[str]
    evidence_count: int
    evidences: list[dict]
    evidence_items: list[dict]  # Formatted evidence items with resolved URLs
    
    created_at: str
    updated_at: str


@dataclass
class ClientContext:
    """Processed client data for report templates."""
    id: str
    name: str
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    address: Optional[str]
    industry: Optional[str]
    logo_url: Optional[str]
    logo_base64: Optional[str]  # For PDF embedding
    primary_color: str = "#10b981"  # Default emerald color for accents


@dataclass
class ProjectContext:
    """Processed project data for report templates."""
    id: str
    name: str
    description: Optional[str]
    description_html: str
    description_plain: str
    project_type: Optional[str]
    status: str
    start_date: Optional[str]
    end_date: Optional[str]
    methodology: Optional[str]
    scope: list[str]
    compliance_frameworks: list[str]


@dataclass
class ReportStats:
    """Statistical summary for the report."""
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    
    # Percentages
    critical_percent: float
    high_percent: float
    medium_percent: float
    low_percent: float
    info_percent: float
    
    # Risk score (weighted)
    risk_score: float
    risk_level: str  # Critical, High, Medium, Low


@dataclass
class ReportContext:
    """Complete context dictionary for report generation."""
    # Report metadata
    report_id: str
    report_title: str
    report_type: str
    report_status: str
    generated_at: str
    generated_by: str
    
    # Main entities
    client: ClientContext
    project: ProjectContext
    findings: list[FindingContext]
    
    # Statistics
    stats: ReportStats
    
    # Narrative content (from editor)
    executive_summary_html: str
    executive_summary_plain: str
    
    # Additional metadata
    classification: str = "CONFIDENTIAL"
    version: str = "1.0"
    
    # Findings grouped by severity for easier templating
    findings_by_severity: dict = field(default_factory=dict)


class ReportDataService:
    """
    Service for building the complete context dictionary for report generation.
    
    This is the "shared brain" that prepares data for both PDF and DOCX engines.
    """
    
    SEVERITY_COLORS = {
        'CRITICAL': '#DC2626',  # Red
        'HIGH': '#EA580C',      # Orange
        'MEDIUM': '#CA8A04',    # Yellow
        'LOW': '#2563EB',       # Blue
        'INFO': '#6B7280',      # Gray
        'INFORMATIONAL': '#6B7280',
    }
    
    SEVERITY_WEIGHTS = {
        'CRITICAL': 10,
        'HIGH': 7,
        'MEDIUM': 4,
        'LOW': 1,
        'INFO': 0,
        'INFORMATIONAL': 0,
    }

    @classmethod
    async def build_context(cls, report_id: str) -> ReportContext:
        """
        Build the complete context dictionary for a report.
        
        Args:
            report_id: UUID of the report to generate context for
            
        Returns:
            ReportContext with all processed data ready for templates
            
        Raises:
            ValueError: If report not found
        """
        logger.info(f"Building report context for report_id: {report_id}")
        
        # Fetch report with all related data
        report = await db.report.find_unique(
            where={"id": report_id},
            include={
                "project": {
                    "include": {
                        "client": True,
                        "findings": {
                            "include": {
                                "evidences": True,
                                "createdBy": True,
                            },
                            "order_by": [
                                {"severity": "asc"},  # Critical first
                                {"createdAt": "desc"}
                            ]
                        }
                    }
                },
                "generatedBy": True,
            }
        )
        
        if not report:
            raise ValueError(f"Report not found: {report_id}")
        
        project = report.project
        client = project.client
        findings = project.findings
        
        # 1. DEFINE SORT ORDER
        severity_rank = {
            "CRITICAL": 1,
            "HIGH": 2,
            "MEDIUM": 3,
            "LOW": 4,
            "INFO": 5
        }

        # 2. SORT FINDINGS
        # We use a lambda to map the finding's severity string to the rank. Default to 99 if unknown.
        findings.sort(key=lambda x: severity_rank.get((x.severity or "").upper(), 99))
        
        # Process client context
        client_context = await cls._build_client_context(client)
        
        # Process project context
        project_context = cls._build_project_context(project)
        
        # Process findings
        findings_context = [
            cls._build_finding_context(f, idx + 1) 
            for idx, f in enumerate(findings)
        ]
        
        # Calculate statistics
        stats = cls._calculate_stats(findings)
        
        # Group findings by severity
        findings_by_severity = cls._group_findings_by_severity(findings_context)
        
        # FIX 1: Parse the Executive Summary JSON
        # The narrative field is stored as JSON string
        executive_summary_html = ""
        executive_summary_plain = ""
        methodology = ""
        
        if report.htmlContent:
            try:
                # Try parsing as JSON first
                narrative_data = json.loads(report.htmlContent)
                executive_summary = narrative_data.get('executiveSummary', '')
                methodology = narrative_data.get('methodology', '')
                
                # Process the executive summary HTML
                executive_summary_html = RichTextService.to_html(executive_summary) if executive_summary else ""
                executive_summary_plain = RichTextService.to_plain(executive_summary) if executive_summary else ""
            except (json.JSONDecodeError, TypeError, AttributeError):
                # Fallback if it's already plain text or HTML
                executive_summary_html = RichTextService.sanitize_html(report.htmlContent)
                executive_summary_plain = RichTextService.to_plain(report.htmlContent)
        
        # Build final context
        context = ReportContext(
            report_id=report.id,
            report_title=report.title,
            report_type=report.reportType,
            report_status=report.status,
            generated_at=datetime.now().strftime("%B %d, %Y"),
            generated_by=report.generatedBy.name or report.generatedBy.email,
            
            client=client_context,
            project=project_context,
            findings=findings_context,
            stats=stats,
            
            executive_summary_html=executive_summary_html,
            executive_summary_plain=executive_summary_plain,
            
            findings_by_severity=findings_by_severity,
        )
        
        logger.info(f"Built context with {len(findings_context)} findings")
        return context

    @classmethod
    async def _build_client_context(cls, client) -> ClientContext:
        """Process client data and fetch logo if needed."""
        logo_base64 = None
        
        # Try to convert logo URL to base64 for PDF embedding
        if client.websiteUrl:
            logo_base64 = await cls._fetch_logo_as_base64(client.websiteUrl)
        
        # Get primary color from client or default to emerald
        primary_color = getattr(client, 'primaryColor', None) or "#10b981"
        
        return ClientContext(
            id=client.id,
            name=client.name,
            contact_name=client.contactName,
            contact_email=client.contactEmail,
            contact_phone=client.contactPhone,
            address=client.address,
            industry=client.industry,
            logo_url=client.websiteUrl,
            logo_base64=logo_base64,
            primary_color=primary_color,
        )

    @classmethod
    def _build_project_context(cls, project) -> ProjectContext:
        """Process project data with rich text conversion."""
        # Parse scope from JSON string
        scope = []
        if project.scope:
            try:
                import json
                scope = json.loads(project.scope) if isinstance(project.scope, str) else project.scope
            except (json.JSONDecodeError, TypeError):
                # Legacy format: split by comma/newline
                scope = [s.strip() for s in project.scope.replace('\n', ',').split(',') if s.strip()]
        
        # Parse compliance frameworks
        compliance = []
        if project.complianceFrameworks:
            try:
                import json
                compliance = json.loads(project.complianceFrameworks) if isinstance(project.complianceFrameworks, str) else project.complianceFrameworks
            except (json.JSONDecodeError, TypeError):
                compliance = [c.strip() for c in project.complianceFrameworks.split(',') if c.strip()]
        
        return ProjectContext(
            id=project.id,
            name=project.name,
            description=project.description,
            description_html=RichTextService.to_html(project.description or ""),
            description_plain=RichTextService.to_plain(project.description or ""),
            project_type=project.projectType,
            status=project.status,
            start_date=project.startDate.strftime("%B %d, %Y") if project.startDate else None,
            end_date=project.endDate.strftime("%B %d, %Y") if project.endDate else None,
            methodology=project.methodology,
            scope=scope,
            compliance_frameworks=compliance,
        )

    @classmethod
    def _build_finding_context(cls, finding, index: int) -> FindingContext:
        """Process a single finding with rich text conversion."""
        severity = finding.severity.upper() if finding.severity else 'MEDIUM'
        
        # Parse references from JSON
        references = []
        if finding.references:
            try:
                references = json.loads(finding.references) if isinstance(finding.references, str) else finding.references
            except (json.JSONDecodeError, TypeError):
                references = [finding.references] if finding.references else []
        
        # FIX 2: Process Affected Assets HTML
        # Parse affected assets from JSON and convert to HTML
        affected_assets_json = finding.affectedAssetsJson
        affected_assets_html = ""
        affected_assets_list = []
        
        if affected_assets_json:
            try:
                affected_assets_list = json.loads(affected_assets_json) if isinstance(affected_assets_json, str) else affected_assets_json
                # Convert to HTML list
                if isinstance(affected_assets_list, list) and len(affected_assets_list) > 0:
                    assets_html_list = []
                    for asset in affected_assets_list:
                        if isinstance(asset, dict):
                            url = asset.get('url', '')
                            description = asset.get('description', '')
                            if url:
                                if description:
                                    assets_html_list.append(f"<li><strong>{url}</strong> - {description}</li>")
                                else:
                                    assets_html_list.append(f"<li>{url}</li>")
                        elif isinstance(asset, str):
                            assets_html_list.append(f"<li>{asset}</li>")
                    if assets_html_list:
                        affected_assets_html = f"<ul>{''.join(assets_html_list)}</ul>"
            except (json.JSONDecodeError, TypeError):
                # If parsing fails, treat as plain text
                affected_assets_html = RichTextService.to_html(str(affected_assets_json))
        
        # Process evidences
        evidences = []
        if finding.evidences:
            evidences = [
                {
                    "id": e.id,
                    "filename": e.filename,
                    "filepath": e.filepath,
                    "caption": e.caption,
                    "mimetype": e.mimetype,
                }
                for e in finding.evidences
            ]
        
        # 1. Get the Environment Domain (PROPER FIX)
        # In your .env file in PROD, you MUST set BACKEND_URL=https://api.yourdomain.com
        base_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        
        # Process evidence items with proper URL resolution
        formatted_evidence = []
        
        # Process evidences from database relationship
        if finding.evidences:
            for item in finding.evidences:
                image_url = ""
                caption = "Evidence"
                
                # Handle if item is an Evidence object (from database)
                if hasattr(item, 'filepath'):
                    raw_url = item.filepath
                    caption = item.caption or "Evidence"
                # Handle if item is just a string path (Legacy data)
                elif isinstance(item, str):
                    raw_url = item
                # Handle if item is an object/dict (New data)
                else:
                    raw_url = getattr(item, 'url', '') or item.get('url', '')
                    caption = getattr(item, 'caption', 'Evidence') or item.get('caption', 'Evidence')
                
                # 2. The Logic Switch (Handles S3 vs Local)
                if raw_url.startswith("http"):
                    # It's already an absolute URL (e.g., AWS S3, Cloudinary)
                    image_url = raw_url
                elif raw_url.startswith("/"):
                    # It's a relative path (Local Uploads) -> Prepend the Domain
                    # Removes double slashes just in case
                    clean_base = base_url.rstrip('/')
                    image_url = f"{clean_base}{raw_url}"
                else:
                    # Fallback for weird paths
                    image_url = raw_url
                
                formatted_evidence.append({
                    "url": image_url,
                    "caption": caption
                })
        
        # FIX 2: Process Findings HTML - Renders <img> tags properly
        # Use RichTextService.to_html() to properly render Markdown and HTML including images
        description_html = RichTextService.to_html(finding.description or "")
        remediation_html = RichTextService.to_html(finding.remediation or "")
        evidence_html = RichTextService.to_html(finding.evidence or "")
        
        return FindingContext(
            id=finding.id,
            reference_id=finding.referenceId or f"FIND-{index:03d}",
            title=finding.title,
            severity=severity,
            severity_color=cls.SEVERITY_COLORS.get(severity, '#6B7280'),
            cvss_score=finding.cvssScore,
            cvss_vector=finding.cvssVector or "N/A",
            cve_id=finding.cveId,
            status=finding.status,
            
            # Dual format text fields - properly renders <img> tags
            description_html=description_html,
            description_plain=RichTextService.to_plain(finding.description or ""),
            remediation_html=remediation_html,
            remediation_plain=RichTextService.to_plain(finding.remediation or ""),
            evidence_html=evidence_html,
            evidence_plain=RichTextService.to_plain(finding.evidence or ""),
            
            affected_systems=finding.affectedSystems,
            affected_assets_json=affected_assets_json,
            affected_assets_html=affected_assets_html,
            affected_assets_count=finding.affectedAssetsCount or len(affected_assets_list),
            references=references,
            evidence_count=len(evidences),
            evidences=evidences,
            evidence_items=formatted_evidence,
            
            created_at=finding.createdAt.strftime("%B %d, %Y"),
            updated_at=finding.updatedAt.strftime("%B %d, %Y"),
        )

    @classmethod
    def _calculate_stats(cls, findings) -> ReportStats:
        """Calculate statistical summary for findings."""
        total = len(findings)
        
        # Count by severity
        counts = {
            'CRITICAL': 0,
            'HIGH': 0,
            'MEDIUM': 0,
            'LOW': 0,
            'INFO': 0,
        }
        
        for f in findings:
            severity = f.severity.upper() if f.severity else 'MEDIUM'
            if severity == 'INFORMATIONAL':
                severity = 'INFO'
            if severity in counts:
                counts[severity] += 1
        
        # Calculate percentages
        def pct(count: int) -> float:
            return round((count / total * 100) if total > 0 else 0, 1)
        
        # Calculate weighted risk score (0-100)
        weighted_sum = sum(
            counts[sev] * cls.SEVERITY_WEIGHTS.get(sev, 0)
            for sev in counts
        )
        max_possible = total * 10  # If all were critical
        risk_score = round((weighted_sum / max_possible * 100) if max_possible > 0 else 0, 1)
        
        # Determine risk level
        if counts['CRITICAL'] > 0 or risk_score >= 70:
            risk_level = "Critical"
        elif counts['HIGH'] > 0 or risk_score >= 50:
            risk_level = "High"
        elif counts['MEDIUM'] > 0 or risk_score >= 25:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        return ReportStats(
            total_findings=total,
            critical_count=counts['CRITICAL'],
            high_count=counts['HIGH'],
            medium_count=counts['MEDIUM'],
            low_count=counts['LOW'],
            info_count=counts['INFO'],
            
            critical_percent=pct(counts['CRITICAL']),
            high_percent=pct(counts['HIGH']),
            medium_percent=pct(counts['MEDIUM']),
            low_percent=pct(counts['LOW']),
            info_percent=pct(counts['INFO']),
            
            risk_score=risk_score,
            risk_level=risk_level,
        )

    @classmethod
    def _group_findings_by_severity(cls, findings: list[FindingContext]) -> dict:
        """Group findings by severity for easier template iteration."""
        grouped = {
            'critical': [],
            'high': [],
            'medium': [],
            'low': [],
            'info': [],
        }
        
        for f in findings:
            severity_key = f.severity.lower()
            if severity_key == 'informational':
                severity_key = 'info'
            if severity_key in grouped:
                grouped[severity_key].append(f)
        
        return grouped

    @classmethod
    async def _fetch_logo_as_base64(cls, url: str) -> Optional[str]:
        """
        Fetch a logo image and convert to base64 for PDF embedding.
        
        Args:
            url: URL of the logo image
            
        Returns:
            Base64 encoded string or None if failed
        """
        if not url:
            return None
        
        # Skip if it's not a valid URL
        if not url.startswith(('http://', 'https://')):
            return None
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', 'image/png')
                    encoded = base64.b64encode(response.content).decode('utf-8')
                    return f"data:{content_type};base64,{encoded}"
        except Exception as e:
            logger.warning(f"Failed to fetch logo from {url}: {e}")
        
        return None

    @classmethod
    def context_to_dict(cls, context: ReportContext) -> dict[str, Any]:
        """
        Convert ReportContext to a plain dictionary for template engines.
        
        Useful for Jinja2 templates that expect dict access.
        Maps to the new premium template structure.
        """
        from dataclasses import asdict
        
        def convert(obj):
            if hasattr(obj, '__dataclass_fields__'):
                return {k: convert(v) for k, v in asdict(obj).items()}
            elif isinstance(obj, list):
                return [convert(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: convert(v) for k, v in obj.items()}
            return obj
        
        # Convert to dict first
        base_dict = convert(context)
        
        # Format date as "December 02, 2025"
        report_date = base_dict.get("generated_at", datetime.now().strftime("%B %d, %Y"))
        
        # Get client data with default primary color
        client_data = base_dict.get("client", {})
        primary_color = client_data.get("primary_color") or "#10b981"
        
        # Get project data
        project_data = base_dict.get("project", {})
        
        # Parse affected assets for findings
        def parse_affected_assets(finding):
            """Parse affected assets from JSON string to list."""
            assets_json = finding.get("affected_assets_json")
            if not assets_json:
                return []
            try:
                assets_list = json.loads(assets_json) if isinstance(assets_json, str) else assets_json
                if isinstance(assets_list, list):
                    # Extract URLs from objects or use strings directly
                    return [
                        asset.get("url", asset) if isinstance(asset, dict) else asset
                        for asset in assets_list
                        if asset
                    ]
            except (json.JSONDecodeError, TypeError):
                pass
            return []
        
        # Map to new template structure
        mapped_dict = {
            # Report object (new structure)
            "report": {
                "title": base_dict.get("report_title", ""),
                "date": report_date,  # Formatted date
                "id": base_dict.get("report_id", ""),
                "executive_summary": base_dict.get("executive_summary_html", ""),
            },
            # Stats object (lowercase keys for template)
            "stats": {
                "critical": base_dict.get("stats", {}).get("critical_count", 0),
                "high": base_dict.get("stats", {}).get("high_count", 0),
                "medium": base_dict.get("stats", {}).get("medium_count", 0),
                "low": base_dict.get("stats", {}).get("low_count", 0),
                "info": base_dict.get("stats", {}).get("info_count", 0),
                "total": base_dict.get("stats", {}).get("total_findings", 0),
            },
            # Client object (with logo and primary_color)
            "client": {
                **client_data,
                "logo": client_data.get("logo_base64") or client_data.get("logo_url"),  # Prefer base64, fallback to URL
                "primary_color": primary_color,
            },
            # Project object (with all fields needed by template)
            "project": {
                **project_data,
                "lead_tester": project_data.get("name", "Security Team"),  # Default to project name or "Security Team"
                "start_date": project_data.get("start_date", ""),
                "end_date": project_data.get("end_date", ""),
                "scope": project_data.get("scope", []),
            },
            # Findings (ensure description_html, remediation_html, finding_id, evidence_html, evidence_items, assets, and references are present)
            "findings": [
                {
                    **finding,
                    "cvss": finding.get("cvss_vector") or "N/A",
                    "finding_id": finding.get("reference_id") or finding.get("id", ""),
                    "description_html": finding.get("description_html", ""),
                    "remediation_html": finding.get("remediation_html", ""),
                    "evidence_html": finding.get("evidence_html", ""),
                    "evidence_items": finding.get("evidence_items", []),
                    "assets": parse_affected_assets(finding),  # Parse affected assets to list
                    "references": finding.get("references", []),  # Ensure references is a list
                }
                for finding in base_dict.get("findings", [])
            ],
            # Keep all other fields for backward compatibility
            **{k: v for k, v in base_dict.items() if k not in ["report_title", "generated_at", "report_id", "executive_summary_html", "stats", "client", "findings", "project"]}
        }
        
        return mapped_dict


# Singleton instance for easy import
report_data_service = ReportDataService()

