/**
 * Collection Test Flow — quality + journey domain types + verdict (Wave 1–2).
 * Spec: specs/domain/collection-test-flow.md
 */

export const COLLECTION_FLOW_SCHEMA_VERSION = '2026-08-collection-flow-v1' as const;

export const COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY = 'page-quality' as const;
export const COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY = 'journey-quality' as const;
export const COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES = 'page-quality-issues' as const;
export const COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES =
  'journey-quality-issues' as const;

/**
 * Wave 5: Audion journey kinds (closed set, semantics owned by AUDION) plus PLEXON/CHECKION
 * quality kinds and the legacy opaque `journey` kind (kept for back-compat documents).
 * @see specs/domain/collection-test-flow.md — Node families A/B/C
 */
export const COLLECTION_FLOW_NODE_KINDS = [
  // Family A — AUDION journey (closed set, do not redefine semantics)
  'start',
  'prompt',
  'observe',
  'action',
  'gate',
  'message',
  'success',
  'abandon',
  'measure',
  // Legacy opaque journey embed (Wave 2) — kept for back-compat
  'journey',
  // Family B — CHECKION quality
  'scan',
  'domain_scan',
  'geo_job',
  'score_gate',
  'issue_gate',
  'geo_gate',
  'quality_ok',
] as const;

export type CollectionFlowNodeKind = (typeof COLLECTION_FLOW_NODE_KINDS)[number];

/** Page scan depth on `scan` nodes (CHECKION POST /api/scans mode). */
export type CollectionFlowScanMode = 'single' | 'deep';

/** Score card kinds from CHECKION GET /api/scans/:id/scores (+ overall). */
export type CollectionFlowScoreKind =
  | 'overall'
  | 'accessibility'
  | 'seo'
  | 'performance'
  | 'ux'
  | 'eco'
  | 'best_practices'
  | 'geo'
  | (string & {});

/** Quality gate conditions — evaluated by PLEXON against CHECKION signals. */
export type CollectionFlowGateCondition =
  | 'score_at_least'
  | 'score_below'
  | 'critical_issues'
  | 'no_critical_issues'
  | 'serious_issues'
  | 'no_serious_issues'
  | 'any_issues'
  | 'no_issues'
  | 'issue_rule_match'
  | 'cited_share_at_least'
  | 'cited_share_below'
  | 'geo_fitness_at_least'
  | 'geo_fitness_below';
/** AUDION journey gate conditions (closed set, AUDION emits gateSignals). */
export type AudionGateCondition =
  | 'frustration_high'
  | 'url_match'
  | 'title_match'
  | 'consent_accepted'
  | 'consent_rejected'
  | 'goal_reached'
  | 'confusion_named'
  | 'time_elapsed';

export type CollectionFlowNode = {
  id: string;
  kind: CollectionFlowNodeKind;
  label: string;
  /** Absolute or relative page URL for `scan` / `domain_scan` / `geo_job` / `start` nodes. */
  url?: string;
  /** Brand hint on `geo_job` when URL empty (Checkion: url or companyName). Wave 8B. */
  companyName?: string;
  /** AUDION `start` node URL key (Wave 5 first-class journey nodes). */
  urlKey?: string;
  /**
   * Instruction / question text for prompt|action|message|abandon|success|measure|observe.
   * On `geo_job`: optional queries, one prompt per line.
   */
  text?: string;
  /** Free-form annotation, persisted on the flow jsonb. */
  note?: string;
  /** Observe window in seconds (kind `observe`). */
  observeSeconds?: number;
  /** Max agent steps (kind `start`). */
  maxSteps?: number;
  /** CHECKION page scan mode on `scan` (default single). Wave 8A. */
  scanMode?: CollectionFlowScanMode;
  /** Domain crawl page cap on `domain_scan`. Wave 8A. */
  maxPages?: number;
  /** Score threshold for `score_gate` (default 70). */
  threshold?: number;
  /** Which score to compare on `score_gate` (default overall). Wave 8A. */
  scoreKind?: CollectionFlowScoreKind;
  /** Min issue count for severity-band issue gates (default 1). */
  minCount?: number;
  /** Regex / substring for `issue_rule_match` (quality) or `url_match`/`title_match` (journey). */
  pattern?: string;
  gateCondition?: CollectionFlowGateCondition | AudionGateCondition;
  position?: { x: number; y: number };
};

export type CollectionFlowEdgeKind = 'then' | 'when' | 'otherwise' | 'parallel';

export type CollectionFlowEdge = {
  id: string;
  source: string;
  target: string;
  /** For quality gates: which branch this edge represents. */
  when?: 'pass' | 'fail';
  /** Audion edge kind (Wave 5) — journey gates use `when`/`otherwise`, sequential steps `then`. */
  edgeKind?: CollectionFlowEdgeKind;
  label?: string;
};

/** Minimal Audion `UxTestFlow`-shaped snapshot (edges use from/to). */
export type EmbeddedAudionJourneyFlow = {
  id: string;
  name: string;
  description: string;
  scenarioIndex: number;
  primaryArchetype: string;
  nodeKindsUsed: string[];
  defaultWaveKey: string;
  compileReady: boolean;
  domainProfileId?: string | null;
  softScoreKeys?: string[] | null;
  nodes: Array<{
    id: string;
    kind: string;
    label: string;
    text?: string | null;
    urlKey?: string | null;
    maxSteps?: number | null;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    kind: 'then' | 'when' | 'otherwise' | 'parallel';
  }>;
};

export type CollectionFlowLastRun = {
  startedAt: string;
  completedAt: string | null;
  scanId: string | null;
  /** Wave 8A: domain crawl id when quality path used `domain_scan`. */
  domainScanId?: string | null;
  /** Wave 8B: GEO job id when quality path used `geo_job`. */
  geoJobId?: string | null;
  /** Wave 8A: page scan mode used (`single`|`deep`) or `domain`. */
  scanMode?: CollectionFlowScanMode | 'domain' | null;
  url: string;
  status: string;
  overallScore: number | null;
  /** Wave 8B: GEO citedShare (0–100) when geo ran. */
  citedShare?: number | null;
  /** Wave 8B: EEAT geoFitness / overall when present. */
  geoFitness?: number | null;
  /** Wave 8A: score card kind that was gated (if not overall). */
  scoreKind?: string | null;
  error?: string | null;
  audionJobId?: string | null;
  audionStudyId?: string | null;
  audionWaveId?: string | null;
  stepUrl?: string | null;
  issueCount?: number | null;
  criticalCount?: number | null;
  issueGateBranch?: 'pass' | 'fail' | null;
  /** Wave 4: Audion evaluate succeeded (journey path only). */
  waveEvaluateOk?: boolean | null;
  /** Wave 4: Collection notes/report PATCHed onto wave. */
  waveRollupOk?: boolean | null;
  /** Wave 4: Knowledge Pack research_brief distillate. */
  knowledgeDistillateOk?: boolean | null;
};

export type CollectionVerdict = {
  status: 'pending' | 'running' | 'complete' | 'error';
  flowCompleted: boolean;
  terminalKind: 'quality_ok' | 'abandon' | null;
  terminalNodeId: string | null;
  /** Journey task / goal (Wave 2); quality-only treats as true. */
  taskCompleted: boolean;
  pageEvidenceValid: boolean;
  pageEvidenceCaveat: string | null;
  /** Journey validEvidence ∧ pageEvidenceValid when journey present. */
  validEvidence: boolean;
  /** Score gate passed (overallScore ≥ threshold when score_gate present). */
  scorePassed: boolean;
  /** Issue gate passed when present; true when no issue_gate. */
  issueGatePassed: boolean;
  issueGateBranch: 'pass' | 'fail' | null;
  /** GEO gate passed when present; true when no geo_gate. Wave 8B. */
  geoGatePassed: boolean;
  geoGateBranch: 'pass' | 'fail' | null;
  criticalCount: number | null;
  issueCount: number | null;
  citedShare: number | null;
  geoFitness: number | null;
  qualityPassed: boolean;
  /**
   * Quality-only: flowCompleted ∧ pageEvidenceValid ∧ qualityPassed.
   * With journey: taskCompleted ∧ validEvidence ∧ qualityPassed.
   */
  collectionReady: boolean;
  hasJourneySegment: boolean;
  hasIssueGate: boolean;
  hasGeoGate: boolean;
  overallScore: number | null;
  threshold: number;
  blockers: string[];
  summary: string;
};

export type CollectionTestFlowDocument = {
  schemaVersion: typeof COLLECTION_FLOW_SCHEMA_VERSION;
  templateId: string;
  nodes: CollectionFlowNode[];
  edges: CollectionFlowEdge[];
  /** Embedded Audion journey subgraph (Wave 2). */
  journeyFlow?: EmbeddedAudionJourneyFlow | null;
  lastVerdict?: CollectionVerdict | null;
  lastRun?: CollectionFlowLastRun | null;
};

export const DEFAULT_SCORE_GATE_THRESHOLD = 70;

export function createMinimalAudionJourneyFlow(url: string): EmbeddedAudionJourneyFlow {
  const pageUrl = url.trim() || 'https://example.com';
  return {
    id: 'collection-journey-min',
    name: 'Collection journey',
    description: 'Minimal journey segment for Collection Test Flow Wave 2.',
    scenarioIndex: 0,
    primaryArchetype: 'findability',
    nodeKindsUsed: ['start', 'action', 'success'],
    defaultWaveKey: 'collection-journey',
    compileReady: true,
    domainProfileId: 'core',
    softScoreKeys: ['ease', 'findability', 'clarity', 'usefulness', 'likelihood', 'overall'],
    nodes: [
      {
        id: 'n-start',
        kind: 'start',
        label: 'Start',
        urlKey: pageUrl,
        maxSteps: 8,
      },
      {
        id: 'n-action',
        kind: 'action',
        label: 'Explore',
        text: 'Orientiere dich auf der Seite und finde einen klaren nächsten Schritt. Denke laut.',
      },
      {
        id: 'n-success',
        kind: 'success',
        label: 'Done',
        text: 'Aufgabe erledigt — nenne kurz den gefundenen Schritt.',
      },
    ],
    edges: [
      { id: 'e-start-action', from: 'n-start', to: 'n-action', kind: 'then' },
      { id: 'e-action-success', from: 'n-action', to: 'n-success', kind: 'then' },
    ],
  };
}

export function createPageQualityTemplate(url: string): CollectionTestFlowDocument {
  const pageUrl = url.trim() || 'https://example.com';
  const nodes: CollectionFlowNode[] = [
    { id: 'n-start', kind: 'start', label: 'Start', url: pageUrl, position: { x: 0, y: 120 } },
    {
      id: 'n-scan',
      kind: 'scan',
      label: 'Page scan',
      url: pageUrl,
      position: { x: 220, y: 120 },
    },
    {
      id: 'n-score',
      kind: 'score_gate',
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      gateCondition: 'score_at_least',
      threshold: DEFAULT_SCORE_GATE_THRESHOLD,
      position: { x: 460, y: 120 },
    },
    {
      id: 'n-ok',
      kind: 'quality_ok',
      label: 'Quality OK',
      position: { x: 720, y: 40 },
    },
    {
      id: 'n-abandon',
      kind: 'abandon',
      label: 'Abandon',
      position: { x: 720, y: 200 },
    },
  ];
  const edges: CollectionFlowEdge[] = [
    { id: 'e-start-scan', source: 'n-start', target: 'n-scan', edgeKind: 'then' },
    { id: 'e-scan-score', source: 'n-scan', target: 'n-score', edgeKind: 'then' },
    {
      id: 'e-score-ok',
      source: 'n-score',
      target: 'n-ok',
      when: 'pass',
      edgeKind: 'when',
      label: 'pass',
    },
    {
      id: 'e-score-abandon',
      source: 'n-score',
      target: 'n-abandon',
      when: 'fail',
      edgeKind: 'otherwise',
      label: 'fail',
    },
  ];
  return {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
    nodes,
    edges,
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
}

/** First-class AUDION journey nodes shared by journey templates (Wave 5). */
function journeyStepNodesAndEdges(
  pageUrl: string,
  xStart: number
): { nodes: CollectionFlowNode[]; edges: CollectionFlowEdge[] } {
  const nodes: CollectionFlowNode[] = [
    {
      id: 'n-start',
      kind: 'start',
      label: 'Start',
      url: pageUrl,
      urlKey: pageUrl,
      maxSteps: 8,
      position: { x: xStart, y: 120 },
    },
    {
      id: 'n-action',
      kind: 'action',
      label: 'Explore',
      text: 'Orientiere dich auf der Seite und finde einen klaren nächsten Schritt. Denke laut.',
      position: { x: xStart + 220, y: 60 },
    },
    {
      id: 'n-success',
      kind: 'success',
      label: 'Done',
      text: 'Aufgabe erledigt — nenne kurz den gefundenen Schritt.',
      position: { x: xStart + 440, y: 60 },
    },
  ];
  const edges: CollectionFlowEdge[] = [
    { id: 'e-start-action', source: 'n-start', target: 'n-action', edgeKind: 'then' },
    { id: 'e-action-success', source: 'n-action', target: 'n-success', edgeKind: 'then' },
  ];
  return { nodes, edges };
}

export function createJourneyQualityTemplate(url: string): CollectionTestFlowDocument {
  const pageUrl = url.trim() || 'https://example.com';
  const journey = journeyStepNodesAndEdges(pageUrl, 0);
  const nodes: CollectionFlowNode[] = [
    ...journey.nodes,
    {
      id: 'n-scan',
      kind: 'scan',
      label: 'Page scan',
      url: pageUrl,
      position: { x: 660, y: 120 },
    },
    {
      id: 'n-score',
      kind: 'score_gate',
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      gateCondition: 'score_at_least',
      threshold: DEFAULT_SCORE_GATE_THRESHOLD,
      position: { x: 880, y: 120 },
    },
    {
      id: 'n-ok',
      kind: 'quality_ok',
      label: 'Quality OK',
      position: { x: 1120, y: 40 },
    },
    {
      id: 'n-abandon',
      kind: 'abandon',
      label: 'Abandon',
      position: { x: 1120, y: 200 },
    },
  ];
  const edges: CollectionFlowEdge[] = [
    ...journey.edges,
    { id: 'e-success-scan', source: 'n-success', target: 'n-scan', edgeKind: 'then' },
    { id: 'e-scan-score', source: 'n-scan', target: 'n-score', edgeKind: 'then' },
    {
      id: 'e-score-ok',
      source: 'n-score',
      target: 'n-ok',
      when: 'pass',
      edgeKind: 'when',
      label: 'pass',
    },
    {
      id: 'e-score-abandon',
      source: 'n-score',
      target: 'n-abandon',
      when: 'fail',
      edgeKind: 'otherwise',
      label: 'fail',
    },
  ];
  const base: CollectionTestFlowDocument = {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
    nodes,
    edges,
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
  return { ...base, journeyFlow: extractJourneyFlowFromDocument(base, pageUrl) };
}

const DEFAULT_CRITICAL_MIN_COUNT = 1;

function qualitySpineWithIssueGate(pageUrl: string, xScan: number): {
  nodes: CollectionFlowNode[];
  edges: CollectionFlowEdge[];
} {
  const nodes: CollectionFlowNode[] = [
    {
      id: 'n-scan',
      kind: 'scan',
      label: 'Page scan',
      url: pageUrl,
      position: { x: xScan, y: 120 },
    },
    {
      id: 'n-score',
      kind: 'score_gate',
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      gateCondition: 'score_at_least',
      threshold: DEFAULT_SCORE_GATE_THRESHOLD,
      position: { x: xScan + 200, y: 120 },
    },
    {
      id: 'n-issues',
      kind: 'issue_gate',
      label: 'No critical issues',
      gateCondition: 'critical_issues',
      minCount: DEFAULT_CRITICAL_MIN_COUNT,
      position: { x: xScan + 420, y: 120 },
    },
    {
      id: 'n-ok',
      kind: 'quality_ok',
      label: 'Quality OK',
      position: { x: xScan + 660, y: 40 },
    },
    {
      id: 'n-abandon',
      kind: 'abandon',
      label: 'Abandon',
      position: { x: xScan + 660, y: 200 },
    },
  ];
  const edges: CollectionFlowEdge[] = [
    { id: 'e-scan-score', source: 'n-scan', target: 'n-score', edgeKind: 'then' },
    {
      id: 'e-score-issues',
      source: 'n-score',
      target: 'n-issues',
      when: 'pass',
      edgeKind: 'when',
      label: 'pass',
    },
    {
      id: 'e-score-abandon',
      source: 'n-score',
      target: 'n-abandon',
      when: 'fail',
      edgeKind: 'otherwise',
      label: 'fail',
    },
    {
      id: 'e-issues-ok',
      source: 'n-issues',
      target: 'n-ok',
      when: 'pass',
      edgeKind: 'when',
      label: 'pass',
    },
    {
      id: 'e-issues-abandon',
      source: 'n-issues',
      target: 'n-abandon',
      when: 'fail',
      edgeKind: 'otherwise',
      label: 'fail',
    },
  ];
  return { nodes, edges };
}

/** Wave 3: page quality + issue_gate after score. */
export function createPageQualityIssuesTemplate(url: string): CollectionTestFlowDocument {
  const pageUrl = url.trim() || 'https://example.com';
  const spine = qualitySpineWithIssueGate(pageUrl, 220);
  return {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES,
    nodes: [
      { id: 'n-start', kind: 'start', label: 'Start', url: pageUrl, position: { x: 0, y: 120 } },
      ...spine.nodes,
    ],
    edges: [
      { id: 'e-start-scan', source: 'n-start', target: 'n-scan', edgeKind: 'then' },
      ...spine.edges,
    ],
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
}

/** Wave 3/5: journey + quality + issue_gate (first-class journey nodes). */
export function createJourneyQualityIssuesTemplate(url: string): CollectionTestFlowDocument {
  const pageUrl = url.trim() || 'https://example.com';
  const journey = journeyStepNodesAndEdges(pageUrl, 0);
  const spine = qualitySpineWithIssueGate(pageUrl, 660);
  const base: CollectionTestFlowDocument = {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES,
    nodes: [...journey.nodes, ...spine.nodes],
    edges: [
      ...journey.edges,
      { id: 'e-success-scan', source: 'n-success', target: 'n-scan', edgeKind: 'then' },
      ...spine.edges,
    ],
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
  return { ...base, journeyFlow: extractJourneyFlowFromDocument(base, pageUrl) };
}

export function scoreGateThreshold(nodes: CollectionFlowNode[]): number {
  const gate =
    nodes.find((n) => n.kind === 'score_gate') ?? nodes.find((n) => n.kind === 'geo_gate');
  const t = gate?.threshold;
  return typeof t === 'number' && Number.isFinite(t) ? t : DEFAULT_SCORE_GATE_THRESHOLD;
}

export function scanNodeUrl(nodes: CollectionFlowNode[]): string | null {
  const scan =
    nodes.find((n) => n.kind === 'scan') ??
    nodes.find((n) => n.kind === 'domain_scan');
  const url = scan?.url?.trim();
  return url || null;
}

export function qualityScanNode(nodes: CollectionFlowNode[]): CollectionFlowNode | null {
  return (
    nodes.find((n) => n.kind === 'domain_scan') ??
    nodes.find((n) => n.kind === 'scan') ??
    null
  );
}

export function startNodeUrl(nodes: CollectionFlowNode[]): string | null {
  const start = nodes.find((n) => n.kind === 'start');
  return start?.url?.trim() || null;
}

/** Kinds whose presence on the canvas implies a real journey segment (Wave 5). */
const JOURNEY_SEGMENT_DETECT_KINDS = new Set<CollectionFlowNodeKind>([
  'prompt',
  'observe',
  'action',
  'message',
  'measure',
  'gate',
]);

export function documentHasJourneySegment(doc: CollectionTestFlowDocument): boolean {
  if (Boolean(doc.journeyFlow?.nodes?.length)) return true;
  return doc.nodes.some(
    (n) => n.kind === 'journey' || JOURNEY_SEGMENT_DETECT_KINDS.has(n.kind)
  );
}

/** Quality-family kinds — used to find where the journey subgraph ends on the canvas. */
const QUALITY_FAMILY_KINDS = new Set<CollectionFlowNodeKind>([
  'scan',
  'domain_scan',
  'geo_job',
  'score_gate',
  'issue_gate',
  'geo_gate',
  'quality_ok',
]);

/**
 * Build an embedded Audion-shaped journey subgraph from first-class journey nodes on the
 * canvas (Wave 5). Falls back to `doc.journeyFlow` / null when the canvas has no journey nodes.
 * @see specs/domain/collection-test-flow.md — Wave 5–7 implementation notes
 */
export function extractJourneyFlowFromDocument(
  doc: CollectionTestFlowDocument,
  url: string
): EmbeddedAudionJourneyFlow | null {
  const pageUrl = url.trim() || 'https://example.com';
  const firstQualityIdx = doc.nodes.findIndex((n) => QUALITY_FAMILY_KINDS.has(n.kind));
  const candidateNodes = (
    firstQualityIdx === -1 ? doc.nodes : doc.nodes.slice(0, firstQualityIdx)
  ).filter((n) => n.kind !== 'journey');

  if (!candidateNodes.some((n) => n.kind === 'start')) {
    if (doc.journeyFlow?.nodes?.length) return patchJourneyFlowUrl(doc.journeyFlow, pageUrl);
    return null;
  }

  const ids = new Set(candidateNodes.map((n) => n.id));
  const edges = doc.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      kind: (e.edgeKind ??
        (e.when === 'pass' ? 'when' : e.when === 'fail' ? 'otherwise' : 'then')) as
        | 'then'
        | 'when'
        | 'otherwise'
        | 'parallel',
    }));
  const nodes = candidateNodes.map((n) => ({
    id: n.id,
    kind: n.kind,
    label: n.label,
    text: n.text ?? null,
    urlKey: n.kind === 'start' ? pageUrl : (n.urlKey ?? null),
    maxSteps: n.kind === 'start' ? (n.maxSteps ?? 8) : (n.maxSteps ?? null),
  }));
  const nodeKindsUsed = [...new Set(nodes.map((n) => n.kind))];

  return {
    id: doc.journeyFlow?.id ?? 'collection-journey-canvas',
    name: doc.journeyFlow?.name ?? 'Collection journey',
    description:
      doc.journeyFlow?.description ?? 'Journey segment extracted from Collection Test Flow canvas.',
    scenarioIndex: doc.journeyFlow?.scenarioIndex ?? 0,
    primaryArchetype: doc.journeyFlow?.primaryArchetype ?? 'findability',
    nodeKindsUsed,
    defaultWaveKey: doc.journeyFlow?.defaultWaveKey ?? 'collection-journey',
    compileReady: nodes.length > 0 && edges.length > 0,
    domainProfileId: doc.journeyFlow?.domainProfileId ?? 'core',
    softScoreKeys: doc.journeyFlow?.softScoreKeys ?? [
      'ease',
      'findability',
      'clarity',
      'usefulness',
      'likelihood',
      'overall',
    ],
    nodes,
    edges,
  };
}

export function documentHasIssueGate(doc: CollectionTestFlowDocument): boolean {
  return doc.nodes.some((n) => n.kind === 'issue_gate');
}

export function documentHasGeoGate(doc: CollectionTestFlowDocument): boolean {
  return doc.nodes.some((n) => n.kind === 'geo_gate');
}

export function documentHasGeoJob(doc: CollectionTestFlowDocument): boolean {
  return doc.nodes.some((n) => n.kind === 'geo_job');
}

export function issueGateNode(nodes: CollectionFlowNode[]): CollectionFlowNode | null {
  return nodes.find((n) => n.kind === 'issue_gate') ?? null;
}

export function geoJobNode(nodes: CollectionFlowNode[]): CollectionFlowNode | null {
  return nodes.find((n) => n.kind === 'geo_job') ?? null;
}

export function geoGateNode(nodes: CollectionFlowNode[]): CollectionFlowNode | null {
  return nodes.find((n) => n.kind === 'geo_gate') ?? null;
}

/** Parse newline-separated GEO queries from `geo_job.text`. */
export function geoJobQueriesFromText(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export type IssueGateSignals = {
  criticalCount: number;
  seriousCount: number;
  issueCount: number;
  /** ruleIds present (for issue_rule_match). */
  ruleIds?: string[];
};

export type GeoGateSignals = {
  citedShare: number | null;
  geoFitness: number | null;
};

/** Whether the issue_gate quality intent is satisfied (pass branch). */
export function evaluateIssueGatePassed(
  gate: CollectionFlowNode,
  signals: IssueGateSignals
): boolean {
  const cond = gate.gateCondition ?? 'critical_issues';
  const minCount =
    typeof gate.minCount === 'number' && Number.isFinite(gate.minCount)
      ? gate.minCount
      : DEFAULT_CRITICAL_MIN_COUNT;
  if (cond === 'no_critical_issues') {
    return signals.criticalCount === 0;
  }
  if (cond === 'no_serious_issues') {
    return signals.seriousCount === 0;
  }
  if (cond === 'no_issues') {
    return signals.issueCount === 0;
  }
  if (cond === 'serious_issues') {
    return signals.seriousCount < minCount;
  }
  if (cond === 'any_issues') {
    return signals.issueCount < minCount;
  }
  if (cond === 'issue_rule_match') {
    const pattern = gate.pattern?.trim();
    if (!pattern) return true;
    try {
      const re = new RegExp(pattern, 'i');
      // Pass when NO matching rule — match ⇒ fail quality (same as Wave 3).
      return !(signals.ruleIds ?? []).some((id) => re.test(id));
    } catch {
      return !(signals.ruleIds ?? []).some((id) =>
        id.toLowerCase().includes(pattern.toLowerCase())
      );
    }
  }
  // critical_issues: fail quality when criticalCount ≥ minCount
  return signals.criticalCount < minCount;
}

export function scoreGateNode(nodes: CollectionFlowNode[]): CollectionFlowNode | null {
  return nodes.find((n) => n.kind === 'score_gate') ?? null;
}

/** Effective numeric score for a score_gate (overall or dimension). */
export function resolveScoreForGate(
  gate: CollectionFlowNode | null | undefined,
  overallScore: number | null,
  scoresByKind?: Record<string, number> | null
): number | null {
  const kind = (gate?.scoreKind ?? 'overall').trim().toLowerCase() || 'overall';
  if (kind === 'overall') {
    return typeof overallScore === 'number' && Number.isFinite(overallScore)
      ? overallScore
      : null;
  }
  const v = scoresByKind?.[kind];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function evaluateScoreGatePassed(
  gate: CollectionFlowNode | null | undefined,
  score: number | null,
  pageEvidenceValid: boolean
): boolean {
  if (!pageEvidenceValid || typeof score !== 'number' || !Number.isFinite(score)) {
    return false;
  }
  const threshold =
    typeof gate?.threshold === 'number' && Number.isFinite(gate.threshold)
      ? gate.threshold
      : DEFAULT_SCORE_GATE_THRESHOLD;
  const cond = gate?.gateCondition === 'score_below' ? 'score_below' : 'score_at_least';
  if (cond === 'score_below') return score < threshold;
  return score >= threshold;
}

/** Whether the geo_gate quality intent is satisfied (pass branch). Wave 8B. */
export function evaluateGeoGatePassed(
  gate: CollectionFlowNode,
  signals: GeoGateSignals
): boolean {
  const threshold =
    typeof gate.threshold === 'number' && Number.isFinite(gate.threshold)
      ? gate.threshold
      : DEFAULT_SCORE_GATE_THRESHOLD;
  const cond = gate.gateCondition ?? 'cited_share_at_least';
  if (cond === 'cited_share_below') {
    return typeof signals.citedShare === 'number' && signals.citedShare < threshold;
  }
  if (cond === 'geo_fitness_at_least') {
    return typeof signals.geoFitness === 'number' && signals.geoFitness >= threshold;
  }
  if (cond === 'geo_fitness_below') {
    return typeof signals.geoFitness === 'number' && signals.geoFitness < threshold;
  }
  // cited_share_at_least (default)
  return typeof signals.citedShare === 'number' && signals.citedShare >= threshold;
}

function patchJourneyFlowUrl(
  journeyFlow: EmbeddedAudionJourneyFlow,
  url: string
): EmbeddedAudionJourneyFlow {
  const pageUrl = url.trim() || 'https://example.com';
  return {
    ...journeyFlow,
    nodes: journeyFlow.nodes.map((n) =>
      n.kind === 'start' ? { ...n, urlKey: pageUrl } : n
    ),
  };
}

export function resolveJourneyFlowForRun(
  doc: CollectionTestFlowDocument,
  url: string
): EmbeddedAudionJourneyFlow | null {
  if (!documentHasJourneySegment(doc)) return null;
  const extracted = extractJourneyFlowFromDocument(doc, url);
  if (extracted?.nodes?.length) return extracted;
  if (doc.journeyFlow?.nodes?.length) {
    return patchJourneyFlowUrl(doc.journeyFlow, url);
  }
  return createMinimalAudionJourneyFlow(url);
}

function buildSummary(input: {
  status: CollectionVerdict['status'];
  flowCompleted: boolean;
  pageEvidenceValid: boolean;
  qualityPassed: boolean;
  collectionReady: boolean;
  taskCompleted: boolean;
  hasJourneySegment: boolean;
  hasIssueGate: boolean;
  hasGeoGate: boolean;
  scorePassed: boolean;
  issueGatePassed: boolean;
  geoGatePassed: boolean;
  criticalCount: number | null;
  overallScore: number | null;
  citedShare: number | null;
  threshold: number;
  terminalKind: CollectionVerdict['terminalKind'];
}): string {
  if (input.status === 'running') {
    return input.hasJourneySegment
      ? 'Läuft — Journey/Scan werden ausgewertet.'
      : 'Läuft — Scan/Score werden ausgewertet.';
  }
  if (input.status === 'error') return 'Fehler — Flow nicht abgeschlossen.';
  if (input.status === 'pending') return 'Noch kein Lauf.';
  if (input.collectionReady) {
    const crit =
      input.hasIssueGate && input.criticalCount != null
        ? `, ${input.criticalCount} critical`
        : '';
    const geo =
      input.hasGeoGate && input.citedShare != null ? `, cited ${input.citedShare}%` : '';
    return input.hasJourneySegment
      ? `Collection bereit — Task ok, Score ${input.overallScore ?? '—'} ≥ ${input.threshold}${crit}${geo}.`
      : `Collection bereit — Score ${input.overallScore ?? '—'} ≥ ${input.threshold}${crit}${geo}.`;
  }
  if (input.hasJourneySegment && !input.taskCompleted) {
    return 'Journey-Task nicht abgeschlossen — Collection nicht bereit.';
  }
  if (!input.pageEvidenceValid) {
    return 'Page-Evidence ungültig oder Scan blockiert — Collection nicht bereit.';
  }
  if (!input.scorePassed) {
    return `Score Gate verfehlt — Score ${input.overallScore ?? '—'} < ${input.threshold}.`;
  }
  if (input.hasIssueGate && !input.issueGatePassed) {
    return `Issue Gate verfehlt — ${input.criticalCount ?? 0} critical issue(s).`;
  }
  if (input.hasGeoGate && !input.geoGatePassed) {
    return `GEO Gate verfehlt — citedShare ${input.citedShare ?? '—'} / threshold ${input.threshold}.`;
  }
  if (input.terminalKind === 'abandon') {
    return `Quality Gate verfehlt — Score ${input.overallScore ?? '—'} < ${input.threshold}.`;
  }
  if (input.flowCompleted && !input.qualityPassed) {
    return 'Flow beendet ohne Quality-Pass.';
  }
  return 'Run beendet — Collection nicht bereit.';
}

function emptyRunningOrErrorFields(partial: {
  status: CollectionVerdict['status'];
  overallScore: number | null;
  threshold: number;
  blockers: string[];
  hasJourneySegment: boolean;
  hasIssueGate?: boolean;
  hasGeoGate?: boolean;
  pageEvidenceCaveat?: string | null;
  taskCompleted?: boolean;
}): CollectionVerdict {
  const taskCompleted = partial.taskCompleted ?? false;
  const pageEvidenceValid = false;
  const qualityPassed = false;
  const validEvidence = false;
  const collectionReady = false;
  const hasIssueGate = Boolean(partial.hasIssueGate);
  const hasGeoGate = Boolean(partial.hasGeoGate);
  return {
    status: partial.status,
    flowCompleted: false,
    terminalKind: null,
    terminalNodeId: null,
    taskCompleted,
    pageEvidenceValid,
    pageEvidenceCaveat: partial.pageEvidenceCaveat ?? null,
    validEvidence,
    scorePassed: false,
    issueGatePassed: !hasIssueGate,
    issueGateBranch: null,
    geoGatePassed: !hasGeoGate,
    geoGateBranch: null,
    criticalCount: null,
    issueCount: null,
    citedShare: null,
    geoFitness: null,
    qualityPassed,
    collectionReady,
    hasJourneySegment: partial.hasJourneySegment,
    hasIssueGate,
    hasGeoGate,
    overallScore: partial.overallScore,
    threshold: partial.threshold,
    blockers: partial.blockers,
    summary: buildSummary({
      status: partial.status,
      flowCompleted: false,
      pageEvidenceValid,
      qualityPassed,
      collectionReady,
      taskCompleted,
      hasJourneySegment: partial.hasJourneySegment,
      hasIssueGate,
      hasGeoGate,
      scorePassed: false,
      issueGatePassed: !hasIssueGate,
      geoGatePassed: !hasGeoGate,
      criticalCount: null,
      overallScore: partial.overallScore,
      citedShare: null,
      threshold: partial.threshold,
      terminalKind: null,
    }),
  };
}

/**
 * Derive Collection verdict from CHECKION scan (+ optional journey / issue / GEO signals).
 */
export function deriveCollectionVerdict(input: {
  scanStatus: string;
  overallScore: number | null;
  /** Effective score for the score_gate (may be a dimension). Defaults to overallScore. */
  gatedScore?: number | null;
  threshold?: number;
  blockers?: string[];
  /** When true, require journey task/evidence flags for collectionReady. */
  hasJourneySegment?: boolean;
  taskCompleted?: boolean;
  journeyValidEvidence?: boolean;
  /**
   * When false, missing page score does not invalidate evidence (GEO-only / no score_gate).
   * Default true when a score_gate is present.
   */
  requirePageScore?: boolean;
  /** Score gate node when present (for score_below / scoreKind). */
  scoreGate?: CollectionFlowNode | null;
  /** Issue gate node when present on the flow. */
  issueGate?: CollectionFlowNode | null;
  issueSignals?: IssueGateSignals | null;
  /** GEO gate node when present. Wave 8B. */
  geoGate?: CollectionFlowNode | null;
  geoSignals?: GeoGateSignals | null;
}): CollectionVerdict {
  const threshold = input.threshold ?? DEFAULT_SCORE_GATE_THRESHOLD;
  const blockers = [...(input.blockers ?? [])];
  const hasJourneySegment = Boolean(input.hasJourneySegment);
  const hasIssueGate = Boolean(input.issueGate);
  const hasGeoGate = Boolean(input.geoGate);
  /** Default true (Wave 1–8A); GEO-only sets false. */
  const requirePageScore = input.requirePageScore ?? true;
  const statusRaw = input.scanStatus.trim().toLowerCase();

  if (statusRaw === 'queued' || statusRaw === 'running' || statusRaw === 'paused') {
    return emptyRunningOrErrorFields({
      status: 'running',
      overallScore: input.overallScore,
      threshold,
      blockers,
      hasJourneySegment,
      hasIssueGate,
      hasGeoGate,
      taskCompleted: hasJourneySegment ? Boolean(input.taskCompleted) : true,
    });
  }

  if (
    statusRaw === 'failed' ||
    statusRaw === 'cancelled' ||
    statusRaw === 'cancelling' ||
    statusRaw === 'error'
  ) {
    if (!blockers.length) blockers.push(`Scan status: ${statusRaw}`);
    return emptyRunningOrErrorFields({
      status: 'error',
      overallScore: input.overallScore,
      threshold,
      blockers,
      hasJourneySegment,
      hasIssueGate,
      hasGeoGate,
      pageEvidenceCaveat: blockers[0] ?? 'Scan fehlgeschlagen',
      taskCompleted: hasJourneySegment ? Boolean(input.taskCompleted) : false,
    });
  }

  // completed / complete (or unknown terminal treated as complete attempt)
  const score =
    input.gatedScore !== undefined ? input.gatedScore : input.overallScore;
  let pageEvidenceValid = true;
  let pageEvidenceCaveat: string | null = null;

  if (requirePageScore && (score == null || !Number.isFinite(score))) {
    pageEvidenceValid = false;
    pageEvidenceCaveat = 'Score fehlt';
    blockers.push('Score fehlt');
  }
  for (const b of blockers) {
    if (/403|401|blocked|junk|empty/i.test(b)) {
      pageEvidenceValid = false;
      pageEvidenceCaveat = pageEvidenceCaveat ?? b;
    }
  }

  const taskCompleted = hasJourneySegment
    ? Boolean(input.taskCompleted)
    : true;
  const journeyValidEvidence = hasJourneySegment
    ? (input.journeyValidEvidence ?? Boolean(input.taskCompleted))
    : true;
  const validEvidence = journeyValidEvidence && pageEvidenceValid;
  const scorePassed = !requirePageScore
    ? true
    : evaluateScoreGatePassed(
        input.scoreGate ?? {
          id: '_implicit-score',
          kind: 'score_gate',
          label: 'Score',
          threshold,
          gateCondition: 'score_at_least',
        },
        typeof score === 'number' ? score : null,
        pageEvidenceValid
      );

  const criticalCount = input.issueSignals?.criticalCount ?? null;
  const issueCount = input.issueSignals?.issueCount ?? null;
  let issueGatePassed = true;
  let issueGateBranch: 'pass' | 'fail' | null = null;
  if (hasIssueGate && input.issueGate) {
    if (!input.issueSignals) {
      issueGatePassed = false;
      issueGateBranch = 'fail';
      blockers.push('Issue signals fehlen');
    } else {
      issueGatePassed = evaluateIssueGatePassed(input.issueGate, input.issueSignals);
      issueGateBranch = issueGatePassed ? 'pass' : 'fail';
    }
  }

  const citedShare = input.geoSignals?.citedShare ?? null;
  const geoFitness = input.geoSignals?.geoFitness ?? null;
  let geoGatePassed = true;
  let geoGateBranch: 'pass' | 'fail' | null = null;
  if (hasGeoGate && input.geoGate) {
    if (!input.geoSignals) {
      geoGatePassed = false;
      geoGateBranch = 'fail';
      blockers.push('GEO signals fehlen');
    } else {
      geoGatePassed = evaluateGeoGatePassed(input.geoGate, input.geoSignals);
      geoGateBranch = geoGatePassed ? 'pass' : 'fail';
    }
  }

  const qualityPassed = scorePassed && issueGatePassed && geoGatePassed;
  // Terminal: fail at earliest gate
  let terminalKind: CollectionVerdict['terminalKind'];
  let terminalNodeId: string | null;
  if (!scorePassed) {
    terminalKind = 'abandon';
    terminalNodeId = 'n-abandon';
  } else if (hasIssueGate && !issueGatePassed) {
    terminalKind = 'abandon';
    terminalNodeId = 'n-abandon';
  } else if (hasGeoGate && !geoGatePassed) {
    terminalKind = 'abandon';
    terminalNodeId = 'n-abandon';
  } else if (qualityPassed) {
    terminalKind = 'quality_ok';
    terminalNodeId = 'n-ok';
  } else {
    terminalKind = 'abandon';
    terminalNodeId = 'n-abandon';
  }
  const flowCompleted = true;
  const collectionReady = hasJourneySegment
    ? taskCompleted && validEvidence && qualityPassed
    : flowCompleted && pageEvidenceValid && qualityPassed;

  return {
    status: 'complete',
    flowCompleted,
    terminalKind,
    terminalNodeId,
    taskCompleted,
    pageEvidenceValid,
    pageEvidenceCaveat,
    validEvidence,
    scorePassed,
    issueGatePassed,
    issueGateBranch,
    geoGatePassed,
    geoGateBranch,
    criticalCount,
    issueCount,
    citedShare,
    geoFitness,
    qualityPassed,
    collectionReady,
    hasJourneySegment,
    hasIssueGate,
    hasGeoGate,
    overallScore: input.overallScore,
    threshold,
    blockers,
    summary: buildSummary({
      status: 'complete',
      flowCompleted,
      pageEvidenceValid,
      qualityPassed,
      collectionReady,
      taskCompleted,
      hasJourneySegment,
      hasIssueGate,
      hasGeoGate,
      scorePassed,
      issueGatePassed,
      geoGatePassed,
      criticalCount,
      overallScore: typeof score === 'number' ? score : input.overallScore,
      citedShare,
      threshold,
      terminalKind,
    }),
  };
}

/** Journey-only failure before scan (Wave 2). */
export function deriveJourneyErrorVerdict(input: {
  error: string;
  threshold?: number;
  blockers?: string[];
}): CollectionVerdict {
  const threshold = input.threshold ?? DEFAULT_SCORE_GATE_THRESHOLD;
  const blockers = [...(input.blockers ?? []), input.error];
  return emptyRunningOrErrorFields({
    status: 'error',
    overallScore: null,
    threshold,
    blockers,
    hasJourneySegment: true,
    pageEvidenceCaveat: input.error,
    taskCompleted: false,
  });
}

export function ensureFlowDocument(raw: unknown): CollectionTestFlowDocument {
  if (!raw || typeof raw !== 'object') {
    return createPageQualityTemplate('');
  }
  const doc = raw as Partial<CollectionTestFlowDocument>;
  if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
    return createPageQualityTemplate('');
  }
  return {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId:
      typeof doc.templateId === 'string' ? doc.templateId : COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
    nodes: doc.nodes as CollectionFlowNode[],
    edges: doc.edges as CollectionFlowEdge[],
    journeyFlow: (doc.journeyFlow as EmbeddedAudionJourneyFlow | null | undefined) ?? null,
    lastVerdict: (doc.lastVerdict as CollectionVerdict | null | undefined) ?? null,
    lastRun: (doc.lastRun as CollectionFlowLastRun | null | undefined) ?? null,
  };
}

export type CollectionFlowNodeRunState = 'idle' | 'running' | 'done' | 'error' | 'skipped';

function findNodeIdByKind(
  nodes: CollectionFlowNode[],
  kind: CollectionFlowNodeKind
): string | null {
  return nodes.find((n) => n.kind === kind)?.id ?? null;
}

/**
 * Journey-family node ids on the canvas before the first quality-family node (Wave 5).
 * Generalizes the old hardcoded `n-journey` id to support first-class journey nodes
 * (`start` → `action`/`prompt`/… → `success`) as well as the legacy opaque `journey` kind.
 */
function journeyMiddleNodeIds(doc: CollectionTestFlowDocument): string[] {
  const firstQualityIdx = doc.nodes.findIndex((n) => QUALITY_FAMILY_KINDS.has(n.kind));
  const slice = firstQualityIdx === -1 ? doc.nodes : doc.nodes.slice(0, firstQualityIdx);
  return slice.filter((n) => n.kind !== 'start').map((n) => n.id);
}

/** Paint node states after a run from the derived verdict (+ optional lastRun). */
export function nodeStatesFromVerdict(
  doc: CollectionTestFlowDocument,
  verdict: CollectionVerdict,
  lastRun?: CollectionFlowLastRun | null
): Record<string, CollectionFlowNodeRunState> {
  const states: Record<string, CollectionFlowNodeRunState> = {};
  for (const n of doc.nodes) states[n.id] = 'idle';

  if (verdict.status === 'pending') return states;

  const mark = (id: string | null, s: CollectionFlowNodeRunState) => {
    if (id && states[id] !== undefined) states[id] = s;
  };
  const markMany = (ids: string[], s: CollectionFlowNodeRunState) => {
    for (const id of ids) mark(id, s);
  };

  const hasJourney = documentHasJourneySegment(doc);
  const startId = findNodeIdByKind(doc.nodes, 'start');
  const qualityNode = qualityScanNode(doc.nodes);
  const scanId = qualityNode?.id ?? null;
  const geoJobId = findNodeIdByKind(doc.nodes, 'geo_job');
  const scoreId = findNodeIdByKind(doc.nodes, 'score_gate');
  const issuesId = findNodeIdByKind(doc.nodes, 'issue_gate');
  const geoGateId = findNodeIdByKind(doc.nodes, 'geo_gate');
  const okId = findNodeIdByKind(doc.nodes, 'quality_ok');
  const abandonId = [...doc.nodes].reverse().find((n) => n.kind === 'abandon')?.id ?? null;
  const journeyIds = hasJourney ? journeyMiddleNodeIds(doc) : [];

  mark(startId, 'done');

  if (verdict.status === 'running') {
    if (hasJourney && !lastRun?.audionJobId) {
      markMany(journeyIds, 'running');
    } else if (hasJourney) {
      markMany(journeyIds, 'done');
      mark(scanId ?? geoJobId, 'running');
    } else {
      mark(scanId ?? geoJobId, 'running');
    }
    return states;
  }

  if (verdict.status === 'error') {
    if (hasJourney && !lastRun?.scanId && !lastRun?.geoJobId && !verdict.pageEvidenceValid) {
      // Journey failed before / without a completed scan handoff
      if (lastRun?.audionJobId && verdict.taskCompleted) {
        markMany(journeyIds, 'done');
        mark(scanId ?? geoJobId, 'error');
      } else if (lastRun?.audionJobId) {
        markMany(journeyIds, 'error');
        mark(scanId, 'skipped');
        mark(geoJobId, 'skipped');
      } else {
        markMany(journeyIds, 'error');
        mark(scanId, 'skipped');
        mark(geoJobId, 'skipped');
      }
    } else {
      markMany(journeyIds, 'done');
      if (lastRun?.geoJobId && !lastRun?.scanId && !lastRun?.domainScanId) {
        mark(geoJobId, 'error');
        mark(scanId, 'skipped');
      } else {
        mark(scanId, 'error');
        mark(geoJobId, lastRun?.geoJobId ? 'error' : 'skipped');
      }
    }
    mark(scoreId, 'skipped');
    mark(issuesId, 'skipped');
    mark(geoGateId, 'skipped');
    mark(okId, 'skipped');
    mark(abandonId, 'skipped');
    return states;
  }

  markMany(journeyIds, 'done');
  mark(scanId, scanId ? 'done' : 'idle');
  mark(geoJobId, geoJobId ? 'done' : 'idle');
  mark(scoreId, scoreId ? 'done' : 'idle');

  const hasIssues = documentHasIssueGate(doc);
  const hasGeo = documentHasGeoGate(doc);
  if (!verdict.scorePassed) {
    if (hasIssues) mark(issuesId, 'skipped');
    if (hasGeo) mark(geoGateId, 'skipped');
    mark(okId, 'skipped');
    mark(abandonId, 'done');
    return states;
  }

  if (hasIssues) {
    mark(issuesId, 'done');
    if (!verdict.issueGatePassed) {
      if (hasGeo) mark(geoGateId, 'skipped');
      mark(okId, 'skipped');
      mark(abandonId, 'done');
      return states;
    }
  }

  if (hasGeo) {
    mark(geoGateId, 'done');
  }

  if (verdict.terminalKind === 'quality_ok') {
    mark(okId, 'done');
    mark(abandonId, 'skipped');
  } else {
    mark(okId, 'skipped');
    mark(abandonId, 'done');
  }
  return states;
}
