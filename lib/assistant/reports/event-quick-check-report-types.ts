import type { UiTone } from '@/lib/assistant/ui-blocks/types';
import type { GeoMeasurement } from '@/lib/geo/measurement';

export const EVENT_QUICK_CHECK_REPORT_BLOCK_TYPE = 'event_quick_check_report' as const;
export const EVENT_QUICK_CHECK_REPORT_TEMPLATE_ID = 'event_quick_check' as const;

export type EventQuickCheckReportKpiTile = {
  label: string;
  value: string | number;
  unit?: string;
  tone?: UiTone;
  hint?: string;
};

export type EventQuickCheckReportWorkflowStep = {
  id: string;
  label: string;
  status: 'done' | 'error' | 'skipped' | 'running' | 'pending';
  detail: string;
};

export type EventQuickCheckReportDomainIssue = {
  title: string;
  count: number;
};

export type EventQuickCheckReportDomainSection = {
  scanId: string;
  domain: string;
  url: string;
  status: string;
  score: number;
  totalPages: number;
  stats: { errors: number; warnings: number; notices: number; total: number };
  topIssues: EventQuickCheckReportDomainIssue[];
  checkionHref: string;
  seoPagesAnalyzed?: number;
};

export type EventQuickCheckReportDistributionSlice = {
  id: string;
  label: string;
  value: number;
};

/** Checkion-parity corpus donuts (Readability / Eco / Link mix). */
export type EventQuickCheckReportDistributionsSection = {
  readability?: {
    bands: EventQuickCheckReportDistributionSlice[];
    score?: number;
    grade?: string;
    dwellSecondsMedian?: number | null;
  };
  eco?: {
    grades: EventQuickCheckReportDistributionSlice[];
    grade?: string;
    avgCo2?: number;
  };
  links?: {
    slices: EventQuickCheckReportDistributionSlice[];
    internal: number;
    external: number;
    broken: number;
    total: number;
  };
};

export type EventQuickCheckReportDomainComparisonRow = {
  domain: string;
  role: 'own' | 'competitor';
  score: number;
  totalPages: number;
  stats: { errors: number; warnings: number; notices: number; total: number };
  scanId: string;
  checkionHref: string;
};

export type EventQuickCheckReportDomainComparisonSection = {
  checkionProjectId?: string;
  checkionProjectHref?: string;
  rows: EventQuickCheckReportDomainComparisonRow[];
  failedDomains?: string[];
};

export type EventQuickCheckReportPersonaTrait = {
  name: string;
  displayName: string;
  score: number;
};

export type EventQuickCheckReportPersonaSection = {
  id: string;
  name: string;
  segment: string;
  confidence: number;
  headline: string;
  bio?: string;
  traits: EventQuickCheckReportPersonaTrait[];
  goals: string[];
  painPoints: string[];
  interests: string[];
  /** GEO questions authored for this persona (complete scan). */
  geoQuestions?: string[];
};

export type EventQuickCheckReportGeoCompetitor = {
  name: string;
  score?: number | null;
  shareOfVoice?: number | null;
  avgPosition?: number | null;
  mentionCount?: number | null;
};

export type EventQuickCheckReportCitationEntry = {
  domain: string;
  position: number;
  context?: string;
};

export type EventQuickCheckReportCitationQueryRun = {
  queryId?: string;
  query: string;
  answerText?: string;
  rawAnswerExcerpt?: string;
  citations: EventQuickCheckReportCitationEntry[];
};

export type EventQuickCheckReportCitationModelSlice = {
  modelId: string;
  modelLabel: string;
  citations: Array<{ query: string; domain: string; position: number }>;
  runs?: EventQuickCheckReportCitationQueryRun[];
};

export type EventQuickCheckReportGeoEeatDimension = {
  key: string;
  label: string;
  score: number;
  reasoning?: string;
};

export type EventQuickCheckReportMarketSection = {
  status: 'complete' | 'failed' | 'skipped' | 'partial';
  errorMessage?: string;
  query?: string;
  threadId?: string;
  runId?: string;
  executiveSummary?: string;
  keyFindings: string[];
  implications?: string;
  echonHref?: string;
};

export type EventQuickCheckReportGeoSection = {
  status: 'complete' | 'failed' | 'skipped' | 'partial';
  errorMessage?: string;
  measurement?: GeoMeasurement;
  questions: string[];
  overallScore?: number | null;
  /** Citation strength 0–100 (CHECKION citedShare). Distinct from geoFitness. */
  citedShare?: number | null;
  geoFitnessScore?: number | null;
  jobId?: string;
  url?: string;
  competitors: EventQuickCheckReportGeoCompetitor[];
  eeatDimensions: EventQuickCheckReportGeoEeatDimension[];
  /** Gaps from GEO fitness reading (FAQs, Author, …). */
  eeatMissingElements?: string[];
  geoFitnessReasoning?: string;
  recommendations: Array<{ title: string; description: string; priority?: number }>;
  citationHighlights: Array<{ query: string; domain: string; position: number }>;
  citationHighlightsByModel?: EventQuickCheckReportCitationModelSlice[];
};

export type EventQuickCheckReportInsightFinding = {
  title: string;
  description: string;
  severity: UiTone;
};

export type EventQuickCheckReportRecommendation = {
  title: string;
  description: string;
  priority?: number;
  category?: string;
};

export type EventQuickCheckReportInsightsSection = {
  assessment?: string;
  fazit?: string;
  fazitTone?: UiTone;
  findings: EventQuickCheckReportInsightFinding[];
  recommendations: EventQuickCheckReportRecommendation[];
};

export type EventQuickCheckReportAppendixRow = [string, string, string];

export type EventQuickCheckReportAppendixSection = {
  scanId?: string;
  geoJobId?: string;
  platformProjectId?: string;
  audionProjectId?: string;
  stepTable: { columns: string[]; rows: EventQuickCheckReportAppendixRow[] };
  links: Array<{ label: string; href: string; external?: boolean }>;
};

export type EventQuickCheckReportModel = {
  templateId: typeof EVENT_QUICK_CHECK_REPORT_TEMPLATE_ID;
  meta: {
    title: string;
    url: string;
    domain: string;
    projectName: string;
    platformProjectId?: string;
    /** AUDION project for persona chat deep-link (`/chat?projectId=`). */
    audionProjectId?: string;
    generatedAt: string;
    playbookLabel: string;
    checkionOnly?: boolean;
  };
  executive: {
    summary?: string;
    fazit?: string;
    fazitTone?: UiTone;
    kpiTiles: EventQuickCheckReportKpiTile[];
  };
  workflow: {
    steps: EventQuickCheckReportWorkflowStep[];
  };
  domain?: EventQuickCheckReportDomainSection;
  /** Corpus composition donuts — own magazine band after Domain. */
  distributions?: EventQuickCheckReportDistributionsSection;
  domainComparison?: EventQuickCheckReportDomainComparisonSection;
  persona?: EventQuickCheckReportPersonaSection;
  personas?: EventQuickCheckReportPersonaSection[];
  market?: EventQuickCheckReportMarketSection;
  geo: EventQuickCheckReportGeoSection;
  /** Extra GEO layers when both recall and live were run. `geo` is the primary (first) layer. */
  geoLayers?: EventQuickCheckReportGeoSection[];
  insights?: EventQuickCheckReportInsightsSection;
  appendix: EventQuickCheckReportAppendixSection;
};
