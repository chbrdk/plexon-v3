import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import { formatGeoModelLabel, sortGeoModelIds } from '@/lib/integrations/format-geo-model-label';
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain';
import { GEO_COMPETITIVE_ANSWER_TEXT_MAX } from '@/lib/integrations/geo-competitive-answer-limits';

type CitationQueryRun = NonNullable<
  NonNullable<GeoEeatJobPreview['citationHighlightsByModel']>[number]['runs']
>[number];

type CompetitiveMetricsRow = {
  domain: string;
  shareOfVoice?: number;
  avgPosition?: number;
  mentionCount?: number;
  queryCount?: number;
};

type CompetitiveBlock = {
  queries?: string[];
  competitors?: string[];
  metrics?: CompetitiveMetricsRow[];
  runs?: Array<{
    queryId?: string;
    query?: string;
    answerText?: string;
    citations?: Array<{ domain?: string; position?: number; context?: string }>;
    rawAnswerExcerpt?: string;
  }>;
};

type GeoPayload = {
  pages?: Array<{
    url?: string;
    geoFitnessScore?: number;
    eeatScores?: Record<string, { score?: number; reasoning?: string }>;
  }>;
  recommendations?: Array<{ title?: string; description?: string; priority?: number }>;
  competitive?: CompetitiveBlock;
  competitiveByModel?: Record<string, CompetitiveBlock>;
  competitiveOnly?: boolean;
};

function scoreFromMetrics(metrics: CompetitiveMetricsRow | undefined): number | null {
  if (!metrics) return null;
  if (typeof metrics.shareOfVoice === 'number' && metrics.shareOfVoice >= 0) {
    return Math.min(100, Math.round(metrics.shareOfVoice * 100));
  }
  if (typeof metrics.avgPosition === 'number' && metrics.avgPosition >= 1) {
    if (metrics.avgPosition <= 10) return Math.round(110 - 10 * metrics.avgPosition);
    return 0;
  }
  return null;
}

function collectCompetitiveBlocks(payload: GeoPayload): CompetitiveBlock[] {
  const blocks: CompetitiveBlock[] = [];
  if (payload.competitive) blocks.push(payload.competitive);
  if (payload.competitiveByModel) {
    blocks.push(...Object.values(payload.competitiveByModel));
  }
  return blocks;
}

type GeoCompetitorRow = NonNullable<GeoEeatJobPreview['competitors']>[number];

function competitiveScoresForUrl(
  payload: GeoPayload,
  url: string
): { ownScore: number | null; competitors: GeoCompetitorRow[] } {
  const host = normalizeGeoDomain(url);
  const blocks = collectCompetitiveBlocks(payload);
  const competitorMap = new Map<string, GeoCompetitorRow>();
  const ownScores: number[] = [];

  for (const block of blocks) {
    for (const m of block.metrics ?? []) {
      const domain = normalizeGeoDomain(m.domain);
      if (!domain) continue;
      const score = scoreFromMetrics(m);
      const row = {
        name: m.domain,
        score,
        shareOfVoice: m.shareOfVoice,
        avgPosition: m.avgPosition,
        mentionCount: m.mentionCount,
      };
      if (host && domain === host) {
        if (score != null) ownScores.push(score);
      } else if (!competitorMap.has(domain) || (score != null && competitorMap.get(domain)?.score == null)) {
        competitorMap.set(domain, row);
      }
    }
    for (const name of block.competitors ?? []) {
      const domain = normalizeGeoDomain(name);
      if (!domain || domain === host) continue;
      if (!competitorMap.has(domain)) {
        competitorMap.set(domain, { name, score: null });
      }
    }
  }

  const competitors = [...competitorMap.values()]
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .slice(0, 12);

  return {
    ownScore: ownScores.length
      ? Math.round(ownScores.reduce((a, b) => a + b, 0) / ownScores.length)
      : null,
    competitors,
  };
}

function avgGeoFitness(pages: GeoPayload['pages']): number | null {
  const scores = (pages ?? [])
    .map((p) => p.geoFitnessScore)
    .filter((s): s is number => typeof s === 'number' && !Number.isNaN(s));
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function firstEeatScores(pages: GeoPayload['pages']): GeoEeatJobPreview['eeatScores'] | undefined {
  const page = (pages ?? []).find((p) => p.eeatScores);
  if (!page?.eeatScores) return undefined;
  const out: NonNullable<GeoEeatJobPreview['eeatScores']> = {};
  for (const key of ['trust', 'experience', 'expertise', 'authoritativeness'] as const) {
    const dim = page.eeatScores[key];
    if (dim && typeof dim.score === 'number') {
      out[key] = {
        score: dim.score,
        reasoning: typeof dim.reasoning === 'string' ? dim.reasoning.slice(0, 280) : undefined,
      };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function collectQueries(payload: GeoPayload): string[] {
  const set = new Set<string>();
  for (const block of collectCompetitiveBlocks(payload)) {
    for (const q of block.queries ?? []) {
      const trimmed = String(q).trim();
      if (trimmed) set.add(trimmed);
    }
    for (const run of block.runs ?? []) {
      const q = String(run.query ?? '').trim();
      if (q) set.add(q);
    }
  }
  return [...set].slice(0, 20);
}

function collectRunsFromBlock(block: CompetitiveBlock): CitationQueryRun[] {
  const runs: CitationQueryRun[] = [];
  for (const run of block.runs ?? []) {
    const query = String(run.query ?? '').trim();
    if (!query) continue;
    const citations = (run.citations ?? [])
      .map((c) => ({
        domain: String(c.domain ?? '').trim(),
        position: Number(c.position ?? 0),
        context: typeof c.context === 'string' ? c.context.slice(0, 280) : undefined,
      }))
      .filter((c) => c.domain && c.position > 0);
    const rawAnswerExcerpt =
      typeof run.rawAnswerExcerpt === 'string' ? run.rawAnswerExcerpt.trim() : undefined;
    const answerText =
      typeof run.answerText === 'string'
        ? run.answerText.trim().slice(0, GEO_COMPETITIVE_ANSWER_TEXT_MAX) || undefined
        : undefined;
    if (citations.length === 0 && !rawAnswerExcerpt && !answerText) continue;
    runs.push({
      queryId: typeof run.queryId === 'string' ? run.queryId : undefined,
      query,
      answerText,
      rawAnswerExcerpt: rawAnswerExcerpt || undefined,
      citations,
    });
  }
  return runs.slice(0, 12);
}

function collectCitationsFromBlock(
  block: CompetitiveBlock,
  ownHost: string
): NonNullable<GeoEeatJobPreview['citationHighlights']> {
  const rows: NonNullable<GeoEeatJobPreview['citationHighlights']> = [];
  for (const run of block.runs ?? []) {
    const query = String(run.query ?? '').trim();
    for (const c of run.citations ?? []) {
      const domain = String(c.domain ?? '').trim();
      if (!domain) continue;
      if (ownHost && normalizeGeoDomain(domain) === ownHost) {
        rows.push({
          query,
          domain,
          position: Number(c.position ?? 0),
        });
      }
    }
  }
  return rows.slice(0, 12);
}

function collectCitationsByModel(
  payload: GeoPayload,
  ownHost: string
): NonNullable<GeoEeatJobPreview['citationHighlightsByModel']> {
  const slices: NonNullable<GeoEeatJobPreview['citationHighlightsByModel']> = [];

  if (payload.competitiveByModel && Object.keys(payload.competitiveByModel).length > 0) {
    for (const modelId of sortGeoModelIds(Object.keys(payload.competitiveByModel))) {
      const block = payload.competitiveByModel[modelId];
      if (!block) continue;
      const citations = collectCitationsFromBlock(block, ownHost);
      const runs = collectRunsFromBlock(block);
      if (citations.length === 0 && runs.length === 0) continue;
      slices.push({
        modelId,
        modelLabel: formatGeoModelLabel(modelId),
        citations,
        runs: runs.length > 0 ? runs : undefined,
      });
    }
    return slices;
  }

  if (payload.competitive) {
    const citations = collectCitationsFromBlock(payload.competitive, ownHost);
    const runs = collectRunsFromBlock(payload.competitive);
    if (citations.length > 0 || runs.length > 0) {
      slices.push({
        modelId: 'default',
        modelLabel: formatGeoModelLabel('default'),
        citations,
        runs: runs.length > 0 ? runs : undefined,
      });
    }
  }

  return slices;
}

function collectCitations(payload: GeoPayload, ownHost: string): GeoEeatJobPreview['citationHighlights'] {
  const byModel = collectCitationsByModel(payload, ownHost);
  if (byModel.length > 0) return byModel[0]?.citations ?? [];
  return [];
}

/** Map CHECKION GET /geo-eeat/[jobId] JSON (+ nested payload) to assistant preview. */
export function parseGeoEeatJobPreview(
  json: Record<string, unknown>,
  jobId: string
): GeoEeatJobPreview {
  const url = String(json.url ?? '');
  const status = String(json.status ?? 'unknown');
  const payload = (json.payload ?? {}) as GeoPayload;

  const geoFitnessScore = avgGeoFitness(payload.pages);
  const { ownScore, competitors } = competitiveScoresForUrl(payload, url);
  const overallScore =
    json.overallScore != null
      ? Number(json.overallScore)
      : ownScore ?? geoFitnessScore ?? null;

  const keywords = Array.isArray(json.keywords)
    ? (json.keywords as string[])
    : collectQueries(payload);

  const recommendations = (payload.recommendations ?? [])
    .map((r) => ({
      title: String(r.title ?? 'Empfehlung'),
      description: String(r.description ?? ''),
      priority: r.priority,
    }))
    .filter((r) => r.title)
    .slice(0, 8);

  const ownHost = normalizeGeoDomain(url);
  const citationHighlightsByModel = collectCitationsByModel(payload, ownHost);

  return {
    jobId: String(json.jobId ?? jobId),
    url,
    status,
    overallScore: overallScore != null && !Number.isNaN(overallScore) ? overallScore : null,
    geoFitnessScore,
    eeatScores: firstEeatScores(payload.pages),
    competitors:
      competitors.length > 0
        ? competitors
        : Array.isArray(json.competitors)
          ? (json.competitors as Array<Record<string, unknown>>).map((c) => ({
              name: String(c.name ?? c.domain ?? '—'),
              score: c.score != null ? Number(c.score) : null,
            }))
          : [],
    keywords,
    queries: collectQueries(payload),
    recommendations: recommendations.length ? recommendations : undefined,
    citationHighlights: collectCitations(payload, ownHost),
    citationHighlightsByModel:
      citationHighlightsByModel.length > 0 ? citationHighlightsByModel : undefined,
    competitiveOnly: Boolean(payload.competitiveOnly),
  };
}
