/**
 * Security utilities for sanitizing HTML content and detecting code patterns.
 * Prevents XSS attacks while allowing safe pentest evidence to be displayed.
 */
import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content using DOMPurify with pentest-safe configuration.
 * Allows images and formatting but strips all script/event handlers.
 */
export const sanitizeHtml = (dirty: string): string => {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'b', 'i', 'strong', 'em', 'br', 'hr',
      // Lists
      'ul', 'ol', 'li',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Code (safe - auto-escapes content)
      'code', 'pre', 'blockquote',
      // Links and images
      'a', 'img',
      // Tables
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      // Layout
      'span', 'div',
    ],
    ALLOWED_ATTR: [
      // Link attributes
      'href', 'target', 'rel', 'title',
      // Image attributes (safe ones only)
      'src', 'alt', 'width', 'height', 'data-align', 'data-caption',
      // General
      'class', 'id',
      // Table
      'colspan', 'rowspan',
    ],
    // CRITICAL: Strip dangerous attributes that could execute scripts
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onkeypress',
      'onsubmit', 'onreset', 'onchange', 'oninput', 'ondrag', 'ondrop',
      'onanimationend', 'ontransitionend',
    ],
    // CRITICAL: Block dangerous tags entirely
    FORBID_TAGS: [
      'script', 'object', 'iframe', 'embed', 'form', 'input',
      'style', 'link', 'meta', 'base', 'noscript', 'template',
    ],
    // Don't allow custom data attributes (potential attack vector)
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Patterns that indicate content is likely code/payload that should be
 * wrapped in a code block for safe display.
 */
const CODE_PATTERNS: RegExp[] = [
  // XSS patterns
  /<script[\s>]/i,
  /javascript:/i,
  /on(error|load|click|mouse|key|focus|blur|submit|change|input)=/i,
  /document\.(cookie|write|location|domain)/i,
  /window\.(location|open|eval)/i,
  /\balert\s*\(/i,
  /\bprompt\s*\(/i,
  /\bconfirm\s*\(/i,
  /\beval\s*\(/i,
  /new\s+Function\s*\(/i,
  /setTimeout\s*\(/i,
  /setInterval\s*\(/i,
  
  // SQL injection patterns
  /SELECT\s+.+\s+FROM/i,
  /INSERT\s+INTO/i,
  /UPDATE\s+.+\s+SET/i,
  /DELETE\s+FROM/i,
  /DROP\s+(TABLE|DATABASE)/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,  // OR 1=1
  /AND\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,  // AND 1=1
  
  // Command injection
  /;\s*(ls|cat|rm|chmod|wget|curl|bash|sh|nc|netcat)\b/i,
  /\$\(.*\)/,  // Command substitution
  /`[^`]+`/,   // Backtick command substitution
  /\|\s*(bash|sh|cmd)/i,
  
  // File formats that should be shown as code
  /^\s*<\?xml/i,                    // XML declaration
  /^\s*<\?php/i,                    // PHP
  /^\s*<![A-Z]/i,                   // DOCTYPE, CDATA, etc.
  /^\s*[\[{]/,                      // JSON start
  
  // HTML/XML structure
  /^<[a-z][a-z0-9]*(\s|>)/i,       // Opening HTML tag at start
  /<\/[a-z][a-z0-9]*>/i,            // Closing HTML tags
  
  // Programming language patterns
  /^\s*(function|const|let|var|import|export|class|interface|type)\s/m,  // JS/TS
  /^\s*(def|class|import|from|if\s+__name__)/m,                          // Python
  /^\s*(public|private|protected|static|void|int|string)\s/m,            // Java/C#
  /^\s*#include\s*</m,              // C/C++
  /^\s*(package|func|type|import)\s/m,  // Go
];

/**
 * Detects if the given text looks like code, a payload, or structured data
 * that should be displayed in a code block rather than rendered as HTML.
 */
export const looksLikeCode = (text: string): boolean => {
  if (!text || text.length < 3) return false;
  
  // Quick check for common code indicators
  const trimmed = text.trim();
  
  // Check against all code patterns
  return CODE_PATTERNS.some(pattern => pattern.test(trimmed));
};

/**
 * Escapes HTML entities for safe display as text.
 * Use this when you want to show raw HTML/code without rendering it.
 */
export const escapeHtml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validates an image URL to ensure it's from a trusted source.
 * Returns true if the URL is safe to use.
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Allow our uploads path
  if (url.startsWith('/uploads/') || url.startsWith('http://localhost:8000/uploads/')) {
    return true;
  }
  
  // Allow data URLs for base64 images (only image types)
  if (url.startsWith('data:image/')) {
    // Ensure it's actually an image data URL
    const validTypes = ['data:image/png', 'data:image/jpeg', 'data:image/gif', 'data:image/webp'];
    return validTypes.some(type => url.startsWith(type));
  }
  
  // Allow HTTPS URLs (could be external images)
  if (url.startsWith('https://')) {
    return true;
  }
  
  // Block everything else (javascript:, http:, etc.)
  return false;
};

/**
 * Detects the likely language of a code snippet for syntax highlighting.
 */
export const detectCodeLanguage = (code: string): string | null => {
  const trimmed = code.trim();
  
  if (/<\?php/i.test(trimmed)) return 'php';
  if (/<\?xml/i.test(trimmed) || /^<[a-z]/i.test(trimmed)) return 'xml';
  if (/^\s*[\[{]/.test(trimmed)) return 'json';
  if (/SELECT|INSERT|UPDATE|DELETE|UNION/i.test(trimmed)) return 'sql';
  if (/^\s*(function|const|let|var|import|=>)/m.test(trimmed)) return 'javascript';
  if (/^\s*(def|class|import|from)/m.test(trimmed)) return 'python';
  if (/^\s*(public|private|class|void)/m.test(trimmed)) return 'java';
  if (/^\s*#include/m.test(trimmed)) return 'c';
  if (/document\.|window\.|alert\(/i.test(trimmed)) return 'javascript';
  
  return null;
};

