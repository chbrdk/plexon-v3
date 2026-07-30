import type {
  EventQuickCheckReportGeoCompetitor,
} from '@/lib/assistant/reports/event-quick-check-report-types';
import type {
  EventQuickCheckReportCitationQueryRun,
} from '@/lib/assistant/reports/event-quick-check-report-types';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain';

export type EventQuickCheckGeoBarChartModel = {
  title: string;
  subtitle?: string;
  labels: string[];
  values: number[];
  valueLabel: string;
  horizontal?: boolean;
};

export type EventQuickCheckCitationHighlight = {
  query: string;
  domain: string;
  position: number;
};

export type CitationCompetitorChartSeries = {
  key: string;
  label: string;
  isOwn: boolean;
};

export type CitationCompetitorChartModel = {
  title: string;
  subtitle?: string;
  rows: Array<Record<string, string | number>>;
  series: CitationCompetitorChartSeries[];
  valueLabel: string;
  maxPosition: number;
};

const COMPETITOR_CHART_COLORS = [
  'var(--color-theme-accent, var(--color-secondary-dx-green))',
  '#6366f1',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#8b5cf6',
];

export function citationCompetitorChartColor(index: number): string {
  return COMPETITOR_CHART_COLORS[index % COMPETITOR_CHART_COLORS.length] ?? COMPETITOR_CHART_COLORS[0];
}

function truncateDomainLabel(domain: string, maxLength = 20): string {
  const normalized = domain.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function resolveCitationChartSeries(
  runs: EventQuickCheckReportCitationQueryRun[],
  ownHost: string,
  knownCompetitors: string[] = []
): CitationCompetitorChartSeries[] {
  const ownKey = ownHost || '__own__';
  const frequency = new Map<string, number>();
  const known = new Set(
    knownCompetitors.map((d) => normalizeGeoDomain(d)).filter(Boolean)
  );

  for (const run of runs) {
    const seenInRun = new Set<string>();
    for (const citation of run.citations) {
      const key = normalizeGeoDomain(citation.domain);
      if (!key || seenInRun.has(key)) continue;
      seenInRun.add(key);
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
  }

  const series: CitationCompetitorChartSeries[] = [];
  const used = new Set<string>();

  if (ownHost) {
    series.push({
      key: ownKey,
      label: EQC_REPORT_COPY.geoOwnDomainLabel,
      isOwn: true,
    });
    used.add(ownHost);
  }

  const ranked = [...frequency.entries()]
    .filter(([domain]) => !used.has(domain))
    .sort((a, b) => {
      const aKnown = known.has(a[0]) ? 1 : 0;
      const bKnown = known.has(b[0]) ? 1 : 0;
      if (aKnown !== bKnown) return bKnown - aKnown;
      return b[1] - a[1];
    });

  for (const [domain] of ranked) {
    if (series.length >= 5) break;
    series.push({
      key: domain,
      label: truncateDomainLabel(domain),
      isOwn: false,
    });
    used.add(domain);
  }

  return series;
}

export function buildCitationCompetitorChart(
  runs: EventQuickCheckReportCitationQueryRun[],
  ownHost: string,
  knownCompetitors: string[] = []
): CitationCompetitorChartModel | null {
  if (runs.length === 0) return null;

  const normalizedOwnHost = normalizeGeoDomain(ownHost);
  const ownKey = normalizedOwnHost || '__own__';
  const series = resolveCitationChartSeries(runs, normalizedOwnHost, knownCompetitors);
  if (series.length === 0) return null;

  let maxPosition = 6;
  const rows = runs.map((run, index) => {
    const row: Record<string, string | number> = {
      queryLabel: citationQueryChartLabel(run.query, index),
      queryText: run.query,
    };

    for (const item of series) {
      const match = run.citations.find((c) => {
        const key = normalizeGeoDomain(c.domain);
        return item.isOwn ? key === normalizedOwnHost : key === item.key;
      });
      const position = match?.position ?? 0;
      row[item.key] = position;
      if (position > maxPosition) maxPosition = position;
    }

    return row;
  });

  const hasCompetitorData = series.some((s) => !s.isOwn);

  return {
    title: EQC_REPORT_COPY.chartCitationPositions,
    subtitle: hasCompetitorData
      ? EQC_REPORT_COPY.chartCitationCompetitorsHint
      : EQC_REPORT_COPY.chartCitationPositionsHint,
    rows,
    series,
    valueLabel: EQC_REPORT_COPY.colPosition,
    maxPosition: Math.max(6, maxPosition),
  };
}

function truncateLabel(text: string, maxLength = 42): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Strip trailing persona suffix e.g. " (Wera)" for chart labels. */
export function citationQueryChartLabel(query: string, index: number): string {
  const withoutPersona = query.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const base = withoutPersona || query.trim();
  return truncateLabel(base) || `${EQC_REPORT_COPY.chartQueryFallback} ${index + 1}`;
}

export function buildCitationPositionChart(
  citations: EventQuickCheckCitationHighlight[]
): EventQuickCheckGeoBarChartModel | null {
  if (citations.length === 0) return null;
  return {
    title: EQC_REPORT_COPY.chartCitationPositions,
    subtitle: EQC_REPORT_COPY.chartCitationPositionsHint,
    labels: citations.map((c, i) => citationQueryChartLabel(c.query, i)),
    values: citations.map((c) => c.position),
    valueLabel: EQC_REPORT_COPY.colPosition,
    horizontal: true,
  };
}

export function buildCompetitorScoreChart(
  competitors: EventQuickCheckReportGeoCompetitor[]
): EventQuickCheckGeoBarChartModel | null {
  const ranked = competitors
    .filter((c) => c.score != null && !Number.isNaN(Number(c.score)))
    .slice(0, 8);
  if (ranked.length < 2) return null;
  return {
    title: EQC_REPORT_COPY.chartCompetitorScores,
    labels: ranked.map((c) => truncateLabel(c.name, 24)),
    values: ranked.map((c) => Number(c.score)),
    valueLabel: EQC_REPORT_COPY.colScore,
    horizontal: false,
  };
}

export function buildEeatScoreChart(
  dimensions: Array<{ label: string; score: number }>
): EventQuickCheckGeoBarChartModel | null {
  if (dimensions.length < 2) return null;
  return {
    title: EQC_REPORT_COPY.chartEeatScores,
    labels: dimensions.map((d) => truncateLabel(d.label, 20)),
    values: dimensions.map((d) => d.score),
    valueLabel: EQC_REPORT_COPY.colScore,
    horizontal: true,
  };
}
