"""
Burp Suite XML Parser Service

Parses Burp Suite XML export files and converts findings to Atomik format.
Handles base64-encoded requests/responses and HTML content.
"""
import base64
import re
import xml.etree.ElementTree as ET
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from html import unescape
import logging

logger = logging.getLogger(__name__)


@dataclass
class BurpRequestResponse:
    """Represents a single request/response pair from Burp"""
    request_method: str
    request_raw: str
    response_raw: str
    is_base64: bool


@dataclass  
class BurpFinding:
    """Represents a parsed Burp finding in Atomik-compatible format"""
    serial_number: str
    title: str
    host: str
    host_ip: Optional[str]
    path: str
    location: str
    severity: str  # Critical, High, Medium, Low, Informational
    confidence: str  # Certain, Firm, Tentative
    description: str  # issueBackground
    issue_detail: Optional[str]
    remediation: str  # remediationBackground
    references: Optional[str]  # External links
    cwe_ids: List[str]  # Extracted from vulnerabilityClassifications
    request_responses: List[BurpRequestResponse]
    

class BurpParser:
    """
    Parses Burp Suite XML exports into Atomik-compatible findings.
    """
    
    # Map Burp severity to Atomik severity
    SEVERITY_MAP = {
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low',
        'information': 'Informational',
        'info': 'Informational',
    }
    
    @staticmethod
    def _clean_html(html_content: str) -> str:
        """
        Clean HTML content from Burp - keep structure but decode entities.
        """
        if not html_content:
            return ""
        
        # Unescape HTML entities
        text = unescape(html_content)
        
        # Remove CDATA markers if present (shouldn't be after XML parsing, but just in case)
        text = re.sub(r'<!\[CDATA\[|\]\]>', '', text)
        
        return text.strip()
    
    @staticmethod
    def _decode_base64(content: str, is_base64: bool) -> str:
        """Decode base64 content if necessary."""
        if not content:
            return ""
        
        if is_base64:
            try:
                decoded = base64.b64decode(content).decode('utf-8', errors='replace')
                return decoded
            except Exception as e:
                logger.warning(f"Failed to decode base64 content: {e}")
                return content
        
        return content
    
    @staticmethod
    def _extract_cwe_ids(classifications: str) -> List[str]:
        """Extract CWE IDs from vulnerability classifications HTML."""
        if not classifications:
            return []
        
        # Match CWE-XXX patterns
        cwe_pattern = r'CWE-(\d+)'
        matches = re.findall(cwe_pattern, classifications)
        return [f"CWE-{m}" for m in matches]
    
    @staticmethod
    def _get_text(element: Optional[ET.Element]) -> str:
        """Safely get text from an XML element."""
        if element is None:
            return ""
        return element.text or ""
    
    @staticmethod
    def _get_attr(element: Optional[ET.Element], attr: str, default: str = "") -> str:
        """Safely get attribute from an XML element."""
        if element is None:
            return default
        return element.get(attr, default)
    
    def _parse_request_response(self, rr_element: ET.Element) -> Optional[BurpRequestResponse]:
        """Parse a single requestresponse element."""
        request_el = rr_element.find('request')
        response_el = rr_element.find('response')
        
        if request_el is None:
            return None
        
        request_method = self._get_attr(request_el, 'method', 'GET')
        request_base64 = self._get_attr(request_el, 'base64') == 'true'
        response_base64 = self._get_attr(response_el, 'base64') == 'true' if response_el is not None else False
        
        request_raw = self._decode_base64(self._get_text(request_el), request_base64)
        response_raw = self._decode_base64(self._get_text(response_el), response_base64) if response_el is not None else ""
        
        return BurpRequestResponse(
            request_method=request_method,
            request_raw=request_raw,
            response_raw=response_raw,
            is_base64=request_base64
        )
    
    def _parse_issue(self, issue_element: ET.Element) -> BurpFinding:
        """Parse a single issue element into a BurpFinding."""
        # Basic fields
        serial_number = self._get_text(issue_element.find('serialNumber'))
        title = self._clean_html(self._get_text(issue_element.find('name')))
        
        # Host info
        host_el = issue_element.find('host')
        host = self._get_text(host_el)
        host_ip = self._get_attr(host_el, 'ip') if host_el is not None else None
        
        # Location
        path = self._get_text(issue_element.find('path'))
        location = self._get_text(issue_element.find('location'))
        
        # Severity and confidence
        severity_raw = self._get_text(issue_element.find('severity')).lower()
        severity = self.SEVERITY_MAP.get(severity_raw, 'Medium')
        confidence = self._get_text(issue_element.find('confidence'))
        
        # Content fields (HTML)
        description = self._clean_html(self._get_text(issue_element.find('issueBackground')))
        issue_detail = self._clean_html(self._get_text(issue_element.find('issueDetail')))
        remediation = self._clean_html(self._get_text(issue_element.find('remediationBackground')))
        references = self._clean_html(self._get_text(issue_element.find('references')))
        
        # CWE extraction
        classifications = self._get_text(issue_element.find('vulnerabilityClassifications'))
        cwe_ids = self._extract_cwe_ids(classifications)
        
        # Request/Response pairs
        request_responses = []
        for rr_el in issue_element.findall('requestresponse'):
            rr = self._parse_request_response(rr_el)
            if rr:
                request_responses.append(rr)
        
        return BurpFinding(
            serial_number=serial_number,
            title=title,
            host=host,
            host_ip=host_ip,
            path=path,
            location=location,
            severity=severity,
            confidence=confidence,
            description=description,
            issue_detail=issue_detail,
            remediation=remediation,
            references=references,
            cwe_ids=cwe_ids,
            request_responses=request_responses
        )
    
    def parse_xml(self, xml_content: str) -> List[BurpFinding]:
        """
        Parse Burp XML export content.
        
        Args:
            xml_content: Raw XML string from Burp export
            
        Returns:
            List of BurpFinding objects
        """
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            logger.error(f"Failed to parse Burp XML: {e}")
            raise ValueError(f"Invalid XML format: {e}")
        
        findings = []
        for issue_el in root.findall('issue'):
            try:
                finding = self._parse_issue(issue_el)
                findings.append(finding)
            except Exception as e:
                logger.warning(f"Failed to parse issue: {e}")
                continue
        
        logger.info(f"Parsed {len(findings)} findings from Burp XML")
        return findings
    
    def to_atomik_format(self, finding: BurpFinding) -> Dict[str, Any]:
        """
        Convert a BurpFinding to Atomik finding format.
        
        Returns:
            Dictionary ready for Atomik API
        """
        # Build evidence/PoC from request/responses
        evidence_parts = []
        
        if finding.issue_detail:
            evidence_parts.append(f"<h3>Details</h3>\n{finding.issue_detail}")
        
        if finding.host:
            evidence_parts.append(f"<p><strong>Target:</strong> {finding.host}{finding.path}</p>")
            if finding.location and finding.location != finding.path:
                evidence_parts.append(f"<p><strong>Location:</strong> {finding.location}</p>")
        
        # Add request/response as code blocks
        for i, rr in enumerate(finding.request_responses, 1):
            if rr.request_raw:
                # Truncate very long requests/responses
                request_display = rr.request_raw[:2000]
                if len(rr.request_raw) > 2000:
                    request_display += "\n... (truncated)"
                
                evidence_parts.append(f"""
<h4>Request #{i}</h4>
<pre><code>{self._escape_html(request_display)}</code></pre>
""")
            
            if rr.response_raw:
                response_display = rr.response_raw[:2000]
                if len(rr.response_raw) > 2000:
                    response_display += "\n... (truncated)"
                
                evidence_parts.append(f"""
<h4>Response #{i}</h4>
<pre><code>{self._escape_html(response_display)}</code></pre>
""")
        
        evidence = "\n".join(evidence_parts) if evidence_parts else None
        
        # Build affected systems string
        affected_systems = finding.host
        if finding.host_ip:
            affected_systems = f"{finding.host} ({finding.host_ip})"
        
        # Build references with CWE links
        references = finding.references or ""
        if finding.cwe_ids:
            cwe_links = ", ".join(finding.cwe_ids)
            if references:
                references += f"\n\n<p><strong>CWE:</strong> {cwe_links}</p>"
            else:
                references = f"<p><strong>CWE:</strong> {cwe_links}</p>"
        
        return {
            "title": finding.title,
            "description": finding.description,
            "severity": finding.severity,
            "evidence": evidence,
            "remediation": finding.remediation,
            "references": references,
            "affected_systems": affected_systems,
            "affected_assets_count": 1,
            "source": "burp",
            "source_id": finding.serial_number,
        }
    
    @staticmethod
    def _escape_html(text: str) -> str:
        """Escape HTML special characters for safe display in <pre> tags."""
        return (text
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&#39;'))


# Singleton instance
burp_parser = BurpParser()

