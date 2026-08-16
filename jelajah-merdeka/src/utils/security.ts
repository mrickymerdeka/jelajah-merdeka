import { COMMON_AD_TRACKER_DOMAINS } from '../constants/presets';
import { SecurityEvent } from '../types';

/**
 * Extracts normalized hostname from URL
 */
export function extractHostname(urlStr: string): string {
  try {
    const url = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return url.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Validates whether a candidate URL is allowed by the whitelist policies
 */
export function isUrlAllowed(urlStr: string, allowedDomains: string[]): { allowed: boolean; reason?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { allowed: false, reason: 'Empty or invalid URL' };
  }

  const trimmed = urlStr.trim().toLowerCase();

  // Block dangerous pseudo-protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('blob:')
  ) {
    return {
      allowed: false,
      reason: `Blocked unsafe protocol: "${trimmed.split(':')[0]}:". This prevents potential HTML & script injection vulnerabilities.`,
    };
  }

  try {
    const candidate = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = candidate.hostname.toLowerCase();

    // Check against allowed domains list
    const isDomainMatch = allowedDomains.some((pattern) => {
      const cleanPattern = pattern.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      if (cleanPattern.startsWith('*.')) {
        const rootDomain = cleanPattern.substring(2);
        return host === rootDomain || host.endsWith(`.${rootDomain}`);
      }
      return host === cleanPattern || host.endsWith(`.${cleanPattern}`);
    });

    if (!isDomainMatch) {
      return {
        allowed: false,
        reason: `Access Denied: The host "${host}" is not on the administrator-approved whitelist [${allowedDomains.join(', ')}].`,
      };
    }

    return { allowed: true };
  } catch (err) {
    return { allowed: false, reason: `Malformed URL structure: ${(err as Error).message}` };
  }
}

/**
 * Checks if a requested sub-resource or link matches known ad or tracker signatures
 */
export function isAdOrTracker(urlStr: string): { isAd: boolean; matchedPattern?: string } {
  if (!urlStr) return { isAd: false };
  const lower = urlStr.toLowerCase();

  for (const pattern of COMMON_AD_TRACKER_DOMAINS) {
    if (lower.includes(pattern)) {
      return { isAd: true, matchedPattern: pattern };
    }
  }
  return { isAd: false };
}

/**
 * Sanitizes input text to prevent XSS and HTML injection
 */
export function sanitizeHtml(rawHtml: string): { cleanHtml: string; injectionDetected: boolean; flaggedPayloads: string[] } {
  if (!rawHtml) return { cleanHtml: '', injectionDetected: false, flaggedPayloads: [] };

  const flagged: string[] = [];
  let modified = rawHtml;

  // Patterns that could inject malicious HTML or JS
  const injectionPatterns = [
    { regex: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, label: '<script> execution tag' },
    { regex: /on\w+\s*=\s*["'][^"']*["']/gi, label: 'Inline event handler (e.g. onerror, onload, onclick)' },
    { regex: /on\w+\s*=\s*[^"'\s>]+/gi, label: 'Unquoted inline event handler' },
    { regex: /javascript:\s*[^"'>\s]+/gi, label: 'javascript: URI scheme execution' },
    { regex: /<iframe\b[^>]*>/gi, label: 'Unsanitized <iframe> embed' },
    { regex: /<object\b[^>]*>/gi, label: '<object> binary tag' },
    { regex: /<embed\b[^>]*>/gi, label: '<embed> plugin execution' },
    { regex: /eval\s*\(/gi, label: 'Dynamic eval() execution' },
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.regex.test(modified)) {
      flagged.push(pattern.label);
      modified = modified.replace(pattern.regex, `<!-- [SANITIZED: ${pattern.label}] -->`);
    }
  }

  return {
    cleanHtml: modified,
    injectionDetected: flagged.length > 0,
    flaggedPayloads: flagged,
  };
}

/**
 * Creates a unique audit event
 */
export function createSecurityEvent(
  type: SecurityEvent['type'],
  details: string,
  sourceUrl?: string,
  blockedContent?: string,
  severity: SecurityEvent['severity'] = 'medium',
): SecurityEvent {
  return {
    id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date(),
    type,
    details,
    sourceUrl,
    blockedContent,
    severity,
  };
}
