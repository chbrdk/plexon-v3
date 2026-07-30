/**
 * Helpers for result card content: detect HTML vs plain/markdown and sanitize for display.
 * Used by ReactFlowBoard WYSIWYG editor and display.
 */

import DOMPurify from 'isomorphic-dompurify';

export const ALLOWED_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'span',
];

/** Allowed attributes for sanitization (e.g. style for font-size/color). */
export const ALLOWED_ATTR = ['style'];

/** Safe style properties we preserve from the editor (color, font-size). */
const SAFE_STYLE_PATTERN = /(color|font-size)\s*:\s*([^;]+)/gi;

function preserveSafeStyles(styleValue: string): string {
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SAFE_STYLE_PATTERN.source, 'gi');
  while ((m = re.exec(styleValue)) !== null) {
    const val = m[2].trim();
    if (val && !/javascript:|expression\s*\(/i.test(val)) parts.push(`${m[1].toLowerCase()}: ${val}`);
  }
  return parts.join('; ');
}

let hookAdded = false;
const styleRestoreMap = new WeakMap<Element, string>();

function ensureStyleHook(): void {
  if (hookAdded) return;
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'style' && data.attrValue) {
      const preserved = preserveSafeStyles(data.attrValue);
      if (preserved) styleRestoreMap.set(node, preserved);
      (data as { keepAttr?: boolean }).keepAttr = false;
    }
  });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const style = styleRestoreMap.get(node);
    if (style) {
      node.setAttribute('style', style);
      styleRestoreMap.delete(node);
    }
  });
  hookAdded = true;
}

/**
 * Convert legacy <font color="..."> to <span style="color: ..."> so sanitizer keeps the color.
 * Chrome's execCommand(foreColor) may output <font> when styleWithCSS is not set.
 */
function normalizeFontToSpan(html: string): string {
  return html
    .replace(/<font\s+color=["']([^"']+)["']\s*>/gi, '<span style="color: $1">')
    .replace(/<\/font>/gi, '</span>');
}

/**
 * Sanitize HTML from the card editor for safe display. Preserves color and font-size in style attributes.
 * Normalizes legacy <font color> to <span style="color"> before sanitizing.
 */
export function sanitizeCardContentHtml(dirty: string): string {
  ensureStyleHook();
  const normalized = normalizeFontToSpan(dirty);
  return DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS: ALLOWED_HTML_TAGS,
    ALLOWED_ATTR,
  });
}

export function isHtmlContent(content: string): boolean {
  return /^\s*</.test(content.trim());
}
