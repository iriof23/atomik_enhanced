"""
Audit Logging Service

SECURITY: This service provides comprehensive audit logging for:
- User actions (CRUD operations)
- Authentication events (login success/failure)
- Security events (rate limiting, access denied)
- Data exports and imports

All audit logs are stored in the database for compliance and security monitoring.
"""
import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

from app.db import db

logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """Audit action types (must match Prisma enum)."""
    # CRUD operations
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    
    # Authentication
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    TOKEN_REFRESH = "TOKEN_REFRESH"
    
    # Security events
    RATE_LIMITED = "RATE_LIMITED"
    ACCESS_DENIED = "ACCESS_DENIED"
    INVALID_INPUT = "INVALID_INPUT"
    
    # Import/Export
    IMPORT = "IMPORT"
    EXPORT = "EXPORT"
    DOWNLOAD = "DOWNLOAD"
    
    # Admin actions
    ROLE_CHANGE = "ROLE_CHANGE"
    SETTINGS_CHANGE = "SETTINGS_CHANGE"


class AuditService:
    """
    Service for logging audit events.
    
    SECURITY: All significant user actions should be logged for:
    - Security incident investigation
    - Compliance requirements (SOC2, ISO 27001, etc.)
    - User activity monitoring
    - Debugging and troubleshooting
    """
    
    @staticmethod
    async def log(
        action: AuditAction,
        resource: str,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        organization_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        success: bool = True,
        error_msg: Optional[str] = None,
    ) -> Optional[str]:
        """
        Log an audit event.
        
        Args:
            action: The type of action performed
            resource: The resource type (e.g., "Finding", "Client", "Project")
            resource_id: The ID of the affected resource
            resource_name: Human-readable name of the resource
            user_id: ID of the user who performed the action
            user_email: Email of the user (cached for historical reference)
            organization_id: Organization context
            details: Additional context as a dictionary (will be JSON serialized)
            ip_address: Client IP address
            user_agent: Client user agent string
            request_id: Request ID for log correlation
            success: Whether the action succeeded
            error_msg: Error message if action failed
            
        Returns:
            The ID of the created audit log entry, or None if logging failed
        """
        try:
            # Serialize details to JSON if provided
            details_json = None
            if details:
                try:
                    details_json = json.dumps(details, default=str)
                except Exception as e:
                    logger.warning(f"Failed to serialize audit details: {e}")
                    details_json = json.dumps({"error": "Failed to serialize details"})
            
            # Create audit log entry
            audit_log = await db.auditlog.create(
                data={
                    "action": action.value,
                    "resource": resource,
                    "resourceId": resource_id,
                    "resourceName": resource_name,
                    "userId": user_id,
                    "userEmail": user_email,
                    "organizationId": organization_id,
                    "details": details_json,
                    "ipAddress": ip_address,
                    "userAgent": user_agent,
                    "requestId": request_id,
                    "success": success,
                    "errorMsg": error_msg,
                }
            )
            
            # Log to application logs as well for real-time monitoring
            log_level = logging.INFO if success else logging.WARNING
            logger.log(
                log_level,
                f"AUDIT: {action.value} {resource}"
                f"{f'/{resource_id}' if resource_id else ''}"
                f" by {user_email or user_id or 'anonymous'}"
                f" from {ip_address or 'unknown'}"
                f"{f' - {error_msg}' if error_msg else ''}"
            )
            
            return audit_log.id
            
        except Exception as e:
            # Audit logging should never break the application
            logger.error(f"Failed to create audit log: {e}")
            return None
    
    @staticmethod
    async def log_create(
        resource: str,
        resource_id: str,
        resource_name: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        organization_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> Optional[str]:
        """Convenience method for logging CREATE actions."""
        return await AuditService.log(
            action=AuditAction.CREATE,
            resource=resource,
            resource_id=resource_id,
            resource_name=resource_name,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )
    
    @staticmethod
    async def log_update(
        resource: str,
        resource_id: str,
        resource_name: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        organization_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> Optional[str]:
        """Convenience method for logging UPDATE actions."""
        return await AuditService.log(
            action=AuditAction.UPDATE,
            resource=resource,
            resource_id=resource_id,
            resource_name=resource_name,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            details={"changes": changes} if changes else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )
    
    @staticmethod
    async def log_delete(
        resource: str,
        resource_id: str,
        resource_name: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        organization_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> Optional[str]:
        """Convenience method for logging DELETE actions."""
        return await AuditService.log(
            action=AuditAction.DELETE,
            resource=resource,
            resource_id=resource_id,
            resource_name=resource_name,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )
    
    @staticmethod
    async def log_auth_success(
        user_id: str,
        user_email: str,
        auth_method: str = "clerk",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[str]:
        """Log a successful authentication."""
        return await AuditService.log(
            action=AuditAction.LOGIN_SUCCESS,
            resource="User",
            resource_id=user_id,
            user_id=user_id,
            user_email=user_email,
            details={"auth_method": auth_method},
            ip_address=ip_address,
            user_agent=user_agent,
        )
    
    @staticmethod
    async def log_auth_failed(
        email: Optional[str] = None,
        reason: str = "Invalid credentials",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[str]:
        """Log a failed authentication attempt."""
        return await AuditService.log(
            action=AuditAction.LOGIN_FAILED,
            resource="User",
            user_email=email,
            details={"reason": reason},
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_msg=reason,
        )
    
    @staticmethod
    async def log_rate_limited(
        endpoint: str,
        ip_address: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
    ) -> Optional[str]:
        """Log a rate limit event."""
        return await AuditService.log(
            action=AuditAction.RATE_LIMITED,
            resource="API",
            resource_name=endpoint,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            success=False,
            error_msg=f"Rate limit exceeded on {endpoint}",
        )
    
    @staticmethod
    async def log_access_denied(
        resource: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        reason: str = "Access denied",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[str]:
        """Log an access denied event."""
        return await AuditService.log(
            action=AuditAction.ACCESS_DENIED,
            resource=resource,
            resource_id=resource_id,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_msg=reason,
        )
    
    @staticmethod
    async def log_import(
        import_type: str,
        resource: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        organization_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> Optional[str]:
        """Log an import action."""
        return await AuditService.log(
            action=AuditAction.IMPORT,
            resource=resource,
            resource_name=import_type,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            details=details,
            ip_address=ip_address,
        )
    
    @staticmethod
    async def log_export(
        export_type: str,
        resource: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        organization_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> Optional[str]:
        """Log an export action."""
        return await AuditService.log(
            action=AuditAction.EXPORT,
            resource=resource,
            resource_id=resource_id,
            resource_name=export_type,
            user_id=user_id,
            user_email=user_email,
            organization_id=organization_id,
            details=details,
            ip_address=ip_address,
        )


# Global instance for convenience
audit_service = AuditService()

