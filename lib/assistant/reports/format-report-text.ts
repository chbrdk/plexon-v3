import { EQC_TRAIT_LABELS_DE } from '@/lib/assistant/reports/event-quick-check-report-copy';

/** Truncate long issue titles for report tables. */
export function truncateReportText(text: string, maxLength = 120): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

/** Locale date for report meta; returns null when value is missing or invalid. */
export function formatReportGeneratedAt(
  value: string | undefined | null,
  locale = 'de-DE'
): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale);
}

/** Humanize snake_case trait keys for display (German). */
export function humanizeTraitKey(key: string): string {
  const trimmed = key.trim().toLowerCase();
  if (!trimmed) return key;
  if (EQC_TRAIT_LABELS_DE[trimmed]) return EQC_TRAIT_LABELS_DE[trimmed];
  return trimmed
    .replace(/_/g, '-')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract display labels from AUDION string or object list items. */
export function asLabelList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const t = item.trim();
      if (t) out.push(t);
      continue;
    }
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      const label = rec.label ?? rec.title ?? rec.name ?? rec.text;
      if (typeof label === 'string' && label.trim()) {
        out.push(label.trim());
      }
    }
  }
  return out;
}
