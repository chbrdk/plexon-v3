import { normalizeCheckionCompetitorDomains } from '@/lib/integrations/checkion-project-competitors-client';

const MIN_COMPETITORS = 1;
const MAX_COMPETITORS = 5;

/** Normalize user-edited competitor domains before persisting on CHECKION project. */
export function applyCompetitorEdits(
  draft: string[],
  edits?: { competitors?: string[] },
  maxCount = 3
): string[] {
  const cap = Math.min(Math.max(maxCount, MIN_COMPETITORS), MAX_COMPETITORS);
  const source = edits?.competitors?.length ? edits.competitors : draft;
  const cleaned = normalizeCheckionCompetitorDomains(source).slice(0, cap);

  if (cleaned.length < MIN_COMPETITORS) {
    const fallback = normalizeCheckionCompetitorDomains(draft).slice(0, cap);
    if (fallback.length >= MIN_COMPETITORS) return fallback;
    throw new Error('COMPETITORS_EMPTY');
  }

  return cleaned;
}
