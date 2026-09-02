import type { CheckionCorpusPageRow } from '@/lib/integrations/checkion-domain-scans-v3-client';

export type PersonaPageRelevancePersona = {
  id: string;
  name: string;
  role: string;
  targetGroupName?: string | null;
};

export type RankedCorpusPage = {
  url: string;
  scanId: string;
  overallScore: number | null;
  errors: number;
  warnings: number;
  accessibility?: number;
  seo?: number;
  resultsHref: string;
  relevanceTier: 'high' | 'medium' | 'low';
  relevanceScore: number;
  rationale: string;
};

const STOP_WORDS = new Set([
  'und',
  'der',
  'die',
  'das',
  'für',
  'mit',
  'persona',
  'seite',
  'seiten',
  'the',
  'and',
  'for',
  'page',
  'www',
  'com',
  'de',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function overlapScore(haystack: string, needles: string[]): number {
  const hayTokens = new Set(tokenize(haystack));
  if (!hayTokens.size || !needles.length) return 0;
  let hits = 0;
  for (const needle of needles) {
    if (hayTokens.has(needle)) hits += 1;
  }
  return hits / Math.max(needles.length, 1);
}

function tierFromScore(score: number): RankedCorpusPage['relevanceTier'] {
  if (score >= 0.45) return 'high';
  if (score >= 0.2) return 'medium';
  return 'low';
}

function buildRationale(
  page: CheckionCorpusPageRow,
  persona: PersonaPageRelevancePersona,
  score: number,
): string {
  const tags = page.classification?.tags?.slice(0, 3) ?? [];
  const summary = page.classification?.shortSummary?.trim();
  if (tags.length > 0) {
    return `Tags (${tags.join(', ')}) passen zu ${persona.name} (${persona.role}).`;
  }
  if (summary) {
    return `${summary.slice(0, 120)} — relevant für ${persona.role}.`;
  }
  try {
    const path = new URL(page.url).pathname;
    if (score >= 0.35) {
      return `URL-Pfad ${path} spricht ${persona.role} wahrscheinlich an.`;
    }
    return `Corpus-Seite ${path} — moderate Überschneidung mit ${persona.name}.`;
  } catch {
    return `Corpus-Seite — moderate Überschneidung mit ${persona.name}.`;
  }
}

export function scorePageForPersona(
  page: CheckionCorpusPageRow,
  persona: PersonaPageRelevancePersona,
): number {
  const personaTokens = [
    ...tokenize(persona.name),
    ...tokenize(persona.role),
    ...(persona.targetGroupName ? tokenize(persona.targetGroupName) : []),
  ];
  const urlScore = overlapScore(page.url, personaTokens) * 0.55;
  const tagText = (page.classification?.tags ?? []).join(' ');
  const tagScore = overlapScore(tagText, personaTokens) * 0.3;
  const summaryScore = overlapScore(page.classification?.shortSummary ?? '', personaTokens) * 0.15;
  const richness =
    (page.classification?.tags?.length ? 0.08 : 0) +
    (page.classification?.shortSummary?.trim() ? 0.05 : 0);
  return Math.min(1, urlScore + tagScore + summaryScore + richness);
}

export function rankCorpusPagesForPersona(
  pages: CheckionCorpusPageRow[],
  persona: PersonaPageRelevancePersona,
  topK = 8,
): RankedCorpusPage[] {
  const ranked = pages
    .map((page) => {
      const relevanceScore = scorePageForPersona(page, persona);
      return {
        url: page.url,
        scanId: page.scanId,
        overallScore: page.overallScore,
        errors: page.errors,
        warnings: page.warnings,
        accessibility: page.scores?.accessibility,
        seo: page.scores?.seo,
        resultsHref: page.resultsPath,
        relevanceScore,
        relevanceTier: tierFromScore(relevanceScore),
        rationale: buildRationale(page, persona, relevanceScore),
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore || (a.overallScore ?? 100) - (b.overallScore ?? 100))
    .slice(0, topK);
  return ranked;
}

export function corpusAggregateMetrics(pages: CheckionCorpusPageRow[]): {
  corpusSize: number;
  avgScore: number | null;
  pagesWithErrors: number;
} {
  const scores = pages.map((p) => p.overallScore).filter((s): s is number => s != null);
  const avgScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  return {
    corpusSize: pages.length,
    avgScore,
    pagesWithErrors: pages.filter((p) => p.errors > 0).length,
  };
}
