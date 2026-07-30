/** Normalize URL or hostname for GEO competitive comparisons. */
export function normalizeGeoDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0] ?? '';
}
