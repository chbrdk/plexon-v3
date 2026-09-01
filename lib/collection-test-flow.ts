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
/** Wave 23 — Event Quick Check quality spine (no ECHON). */
export const COLLECTION_FLOW_TEMPLATE_EQC_QUALITY = 'eqc-quality-v1' as const;
/** Vaillant Group MaFo UC1 — barrier research validate loop (AUDION + CHECKION + BRANDION). */
export const COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH =
  'vaillant-barrier-research-v1' as const;
export const COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL =
  'vaillant-installer-dual-v1' as const;

/**
 * Wave 5: Audion journey kinds (closed set, semantics owned by AUDION) plus PLEXON/CHECKION
 * quality kinds and the legacy opaque `journey` kind (kept for back-compat documents).
 * @see specs/domain/collection-test-flow.md — Node families A/B/C
 * @see specs/domain/eqc-as-collection-flow.md — Wave 23 EQC typed nodes
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
  // Collection config — merge onto start on extract (Wave 11)
  'persona',
  'zielgruppe',
  // Legacy opaque journey embed (Wave 2) — kept for back-compat
  'journey',
  // Family B — CHECKION quality
  'scan',
  'domain_scan',
  'geo_job',
  'compare',
  'set',
  // Family D — BRANDION brand (Wave 24)
  'guideline',
  'brand_measure',
  // Wave 23 — EQC typed actions (no generic agent)
  'research_brief',
  'competitors_suggest',
  'persona_bootstrap',
  'suggest_queries',
  'human_confirm',
  // Legacy quality gates (Wave 1–8B) — migrated to `compare` on load
  'score_gate',
  'issue_gate',
  'geo_gate',
  'quality_ok',
] as const;

export type CollectionFlowNodeKind = (typeof COLLECTION_FLOW_NODE_KINDS)[number];

/** Wave 23 — which draft `human_confirm` pauses on. */
export type CollectionFlowConfirmKind = 'brief' | 'competitors' | 'geo_queries' | 'deep_scan';

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
  /** Score threshold for legacy `score_gate` / `geo_gate` (migrated to compare.value). */
  threshold?: number;
  /** Which score to compare on legacy `score_gate` (default overall). Wave 8A. */
  scoreKind?: CollectionFlowScoreKind;
  /** Min issue count for legacy severity-band issue gates (default 1). */
  minCount?: number;
  /** Regex / substring for `issue_rule_match` (quality) or `url_match`/`title_match` (journey). */
  pattern?: string;
  gateCondition?: CollectionFlowGateCondition | AudionGateCondition;
  /** Catalog path / expression for `compare` or source for `set` (Wave 9 / 18 / 20). */
  path?: string;
  /** Compare op for `compare` (Wave 9). */
  op?: 'gte' | 'lte' | 'gt' | 'lt' | 'eq' | 'neq' | 'exists' | 'not_exists';
  /** Expected value for `compare` (Wave 9) — literal or expression (Wave 18). */
  value?: string | number | boolean | null;
  /** Output alias key for `set` nodes (Wave 20). */
  alias?: string;
  /** Audion persona id on `persona` / `start` (Wave 11). */
  personaId?: string;
  /** Display name for persona picker. */
  personaName?: string;
  /** Audion / TG segment string merged onto start (Wave 11). */
  segment?: string;
  /** Collection target-group id on `zielgruppe`. */
  targetGroupId?: string;
  /** Display name for Zielgruppe picker. */
  targetGroupName?: string;
  /** Soft-Q / SEQ key on `measure` (Wave 11). */
  measureKey?: string;
  /** Brandion guideline id on `guideline` / `brand_measure` (Wave 24). */
  guidelineId?: string;
  /** Brandion analysis fixture id on `brand_measure` (Wave 24). */
  fixtureId?: string;
  /** Brandion measure adapter on `brand_measure` — `fixture` default (Wave 24). */
  adapter?: 'fixture' | (string & {});
  /** Palette preset id for action/measure factories (Wave 11). */
  presetId?: string;
  /** Wave 23 — `human_confirm` which draft to pause on. */
  confirmKind?: CollectionFlowConfirmKind;
  position?: { x: number; y: number };
};

export type CollectionFlowEdgeKind = 'then' | 'when' | 'otherwise' | 'parallel' | 'bind';

export type CollectionFlowEdge = {
  id: string;
  source: string;
  target: string;
  /** For quality gates: which branch this edge represents. */
  when?: 'pass' | 'fail';
  /** Audion edge kind (Wave 5) — journey gates use `when`/`otherwise`, sequential steps `then`. Wave 10 adds authoring-only `bind`. */
  edgeKind?: CollectionFlowEdgeKind;
  /** Catalog path for `bind` edges (Wave 10). Eval SoT remains `compare.path`. */
  bindPath?: string;
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
    personaId?: string | null;
    personaName?: string | null;
    segment?: string | null;
    measureKey?: string | null;
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
  /** Wave 14: per-persona journey segment results (sequential fan-out). */
  journeyPersonaRuns?: Array<{
    personaNodeId: string;
    personaId: string | null;
    personaName: string | null;
    jobId: string | null;
    studyId: string | null;
    waveId: string | null;
    taskCompleted: boolean;
    validEvidence: boolean;
    finalUrl: string | null;
    error?: string | null;
  }> | null;
  issueCount?: number | null;
  criticalCount?: number | null;
  issueGateBranch?: 'pass' | 'fail' | null;
  /** Wave 9: catalog run context (action outputs). */
  context?: {
    outputs: Record<string, Record<string, unknown>>;
  } | null;
  /** Wave 9: compare evaluation results. */
  compareResults?: Array<{
    nodeId: string;
    path: string;
    passed: boolean;
    actual?: string | number | boolean | null;
  }> | null;
  /** Wave 4: Audion evaluate succeeded (journey path only). */
  waveEvaluateOk?: boolean | null;
  /** Wave 4: Collection notes/report PATCHed onto wave. */
  waveRollupOk?: boolean | null;
  /** Wave 4: Knowledge Pack research_brief distillate. */
  knowledgeDistillateOk?: boolean | null;
  /** Wave 23 — paused on human_confirm. */
  awaitingNodeId?: string | null;
  awaitingConfirmKind?: CollectionFlowConfirmKind | null;
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
  /** GEO gate passed when present; true when no geo_gate. Wave 8B (compat). */
  geoGatePassed: boolean;
  geoGateBranch: 'pass' | 'fail' | null;
  /** Wave 9: all `compare` nodes passed (AND). */
  comparePassed: boolean;
  compareResults: Array<{
    nodeId: string;
    path: string;
    passed: boolean;
    actual?: string | number | boolean | null;
  }>;
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
  hasCompareGates: boolean;
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
      scanMode: 'single',
      position: { x: 220, y: 120 },
    },
    {
      id: 'n-score',
      kind: 'compare',
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      path: 'scan.overallScore',
      op: 'gte',
      value: DEFAULT_SCORE_GATE_THRESHOLD,
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

/** First-class AUDION journey nodes shared by journey templates (Wave 5 / 11 / 12). */
function journeyStepNodesAndEdges(
  pageUrl: string,
  xStart: number
): { nodes: CollectionFlowNode[]; edges: CollectionFlowEdge[] } {
  const nodes: CollectionFlowNode[] = [
    {
      id: 'n-zielgruppe',
      kind: 'zielgruppe',
      label: 'Zielgruppe',
      position: { x: xStart, y: 40 },
    },
    {
      id: 'n-persona',
      kind: 'persona',
      label: 'Persona',
      position: { x: xStart + 200, y: 40 },
    },
    {
      id: 'n-start',
      kind: 'start',
      label: 'Start',
      url: pageUrl,
      urlKey: pageUrl,
      maxSteps: 8,
      position: { x: xStart + 400, y: 120 },
    },
    {
      id: 'n-action',
      kind: 'action',
      label: 'Explore',
      presetId: 'action-orientieren',
      text: 'Orientiere dich auf der Seite und finde einen klaren nächsten Schritt. Denke laut.',
      position: { x: xStart + 620, y: 60 },
    },
    {
      id: 'n-success',
      kind: 'success',
      label: 'Done',
      text: 'Aufgabe erledigt — nenne kurz den gefundenen Schritt.',
      position: { x: xStart + 840, y: 60 },
    },
    {
      id: 'n-frage',
      kind: 'measure',
      label: 'Ease',
      measureKey: 'ease',
      presetId: 'frage-ease',
      text: 'Wie leicht war es, dein Ziel zu erreichen?',
      position: { x: xStart + 1040, y: 60 },
    },
  ];
  const edges: CollectionFlowEdge[] = [
    { id: 'e-zg-persona', source: 'n-zielgruppe', target: 'n-persona', edgeKind: 'then' },
    { id: 'e-persona-start', source: 'n-persona', target: 'n-start', edgeKind: 'then' },
    { id: 'e-start-action', source: 'n-start', target: 'n-action', edgeKind: 'then' },
    { id: 'e-action-success', source: 'n-action', target: 'n-success', edgeKind: 'then' },
    { id: 'e-success-frage', source: 'n-success', target: 'n-frage', edgeKind: 'then' },
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
      position: { x: 1260, y: 120 },
    },
    {
      id: 'n-score',
      kind: 'compare',
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      path: 'scan.overallScore',
      op: 'gte',
      value: DEFAULT_SCORE_GATE_THRESHOLD,
      position: { x: 1480, y: 120 },
    },
    {
      id: 'n-ok',
      kind: 'quality_ok',
      label: 'Quality OK',
      position: { x: 1720, y: 40 },
    },
    {
      id: 'n-abandon',
      kind: 'abandon',
      label: 'Abandon',
      position: { x: 1720, y: 200 },
    },
  ];
  const edges: CollectionFlowEdge[] = [
    ...journey.edges,
    { id: 'e-frage-scan', source: 'n-frage', target: 'n-scan', edgeKind: 'then' },
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
      scanMode: 'single',
      position: { x: xScan, y: 120 },
    },
    {
      id: 'n-score',
      kind: 'compare',
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      path: 'scan.overallScore',
      op: 'gte',
      value: DEFAULT_SCORE_GATE_THRESHOLD,
      position: { x: xScan + 200, y: 120 },
    },
    {
      id: 'n-issues',
      kind: 'compare',
      label: 'No critical issues',
      path: 'scan.issues.criticalCount',
      op: 'lt',
      value: DEFAULT_CRITICAL_MIN_COUNT,
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
  const spine = qualitySpineWithIssueGate(pageUrl, 1260);
  const base: CollectionTestFlowDocument = {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES,
    nodes: [...journey.nodes, ...spine.nodes],
    edges: [
      ...journey.edges,
      { id: 'e-frage-scan', source: 'n-frage', target: 'n-scan', edgeKind: 'then' },
      ...spine.edges,
    ],
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
  return { ...base, journeyFlow: extractJourneyFlowFromDocument(base, pageUrl) };
}

/** Vaillant Group UC1 — homeowner barrier research + page quality + Brandion measure. */
export function createVaillantBarrierResearchTemplate(input?: {
  journeyUrl?: string;
  scanUrl?: string;
  guidelineId?: string;
}): CollectionTestFlowDocument {
  const journeyUrl = input?.journeyUrl?.trim() || 'https://www.vaillant.de/heizung/waermepumpe/';
  const scanUrl = input?.scanUrl?.trim() || journeyUrl;
  const guidelineId = input?.guidelineId?.trim() || 'gl-mtinudb1';

  const journeyNodes: CollectionFlowNode[] = [
    {
      id: 'n-zielgruppe',
      kind: 'zielgruppe',
      label: 'Altbau-Familie',
      segment: 'altbau_familie',
      position: { x: 0, y: 40 },
    },
    {
      id: 'n-persona',
      kind: 'persona',
      label: 'Persona',
      position: { x: 200, y: 40 },
    },
    {
      id: 'n-start',
      kind: 'start',
      label: 'Start',
      url: journeyUrl,
      urlKey: journeyUrl,
      maxSteps: 10,
      position: { x: 400, y: 120 },
    },
    {
      id: 'n-prompt',
      kind: 'prompt',
      label: 'Barriere-Frage',
      text: 'Was würde dich aktuell davon abhalten, eine Wärmepumpe zu kaufen? Denke laut auf Deutsch.',
      position: { x: 620, y: 40 },
    },
    {
      id: 'n-observe',
      kind: 'observe',
      label: 'Seite erkunden',
      text: 'Schau dir die Wärmepumpen-Informationen an. Welche Risiken und Unsicherheiten siehst du?',
      observeSeconds: 45,
      position: { x: 840, y: 40 },
    },
    {
      id: 'n-message',
      kind: 'message',
      label: 'Vertiefung',
      text: 'Welche Information würde dir bei der Entscheidung am meisten helfen — Kosten, Förderung oder Eignung für dein Haus?',
      position: { x: 1060, y: 40 },
    },
    {
      id: 'n-measure',
      kind: 'measure',
      label: 'Klarheit',
      measureKey: 'clarity',
      text: 'Wie klar ist dir nach dieser Seite, ob eine Wärmepumpe für dich infrage kommt?',
      position: { x: 1280, y: 40 },
    },
    {
      id: 'n-success',
      kind: 'success',
      label: 'Research done',
      text: 'Danke — fasse kurz deine größte Barriere und deinen Informationsbedarf zusammen.',
      position: { x: 1500, y: 40 },
    },
  ];
  const journeyEdges: CollectionFlowEdge[] = [
    { id: 'e-zg-persona', source: 'n-zielgruppe', target: 'n-persona', edgeKind: 'then' },
    { id: 'e-persona-start', source: 'n-persona', target: 'n-start', edgeKind: 'then' },
    { id: 'e-start-prompt', source: 'n-start', target: 'n-prompt', edgeKind: 'then' },
    { id: 'e-prompt-observe', source: 'n-prompt', target: 'n-observe', edgeKind: 'then' },
    { id: 'e-observe-message', source: 'n-observe', target: 'n-message', edgeKind: 'then' },
    { id: 'e-message-measure', source: 'n-message', target: 'n-measure', edgeKind: 'then' },
    { id: 'e-measure-success', source: 'n-measure', target: 'n-success', edgeKind: 'then' },
  ];

  const spine = qualitySpineWithIssueGate(scanUrl, 1720);
  const brandNodes: CollectionFlowNode[] = [
    {
      id: 'n-guideline',
      kind: 'guideline',
      label: 'Vaillant Group CD',
      guidelineId,
      position: { x: 2380, y: 40 },
    },
    {
      id: 'n-brand',
      kind: 'brand_measure',
      label: 'Brand Measure',
      guidelineId,
      fixtureId: 'demo-landing-pass',
      adapter: 'fixture',
      position: { x: 2600, y: 120 },
    },
    {
      id: 'n-brand-pass',
      kind: 'compare',
      label: 'Brand: keine Fails',
      path: 'brand.failCount',
      op: 'eq',
      value: 0,
      position: { x: 2820, y: 120 },
    },
    {
      id: 'n-ok-final',
      kind: 'quality_ok',
      label: 'Loop OK',
      position: { x: 3040, y: 40 },
    },
    {
      id: 'n-abandon-brand',
      kind: 'abandon',
      label: 'Brand fail',
      position: { x: 3040, y: 200 },
    },
  ];
  const brandEdges: CollectionFlowEdge[] = [
    { id: 'e-issues-guideline', source: 'n-issues', target: 'n-guideline', edgeKind: 'then' },
    { id: 'e-guideline-brand', source: 'n-guideline', target: 'n-brand', edgeKind: 'then' },
    { id: 'e-brand-compare', source: 'n-brand', target: 'n-brand-pass', edgeKind: 'then' },
    {
      id: 'e-brand-ok',
      source: 'n-brand-pass',
      target: 'n-ok-final',
      when: 'pass',
      edgeKind: 'when',
      label: 'pass',
    },
    {
      id: 'e-brand-abandon',
      source: 'n-brand-pass',
      target: 'n-abandon-brand',
      when: 'fail',
      edgeKind: 'otherwise',
      label: 'fail',
    },
  ];

  // Rewire quality spine terminal: issues pass → brand (not n-ok)
  const spineEdges = spine.edges.map((e) =>
    e.id === 'e-issues-ok' ? { ...e, target: 'n-guideline' } : e,
  );
  const nodes = [...journeyNodes, ...spine.nodes, ...brandNodes];
  const edges: CollectionFlowEdge[] = [
    ...journeyEdges,
    { id: 'e-success-scan', source: 'n-success', target: 'n-scan', edgeKind: 'then' },
    ...spineEdges,
    ...brandEdges,
  ];

  const base: CollectionTestFlowDocument = {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_VAILLANT_BARRIER_RESEARCH,
    nodes,
    edges,
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
  return { ...base, journeyFlow: extractJourneyFlowFromDocument(base, journeyUrl) };
}

/** Vaillant Group UC2 — Endkunde + Fachhandwerker dual perspective, then scan + brand. */
export function createVaillantInstallerDualPerspectiveTemplate(input?: {
  customerUrl?: string;
  installerUrl?: string;
  scanUrl?: string;
  guidelineId?: string;
}): CollectionTestFlowDocument {
  const customerUrl = input?.customerUrl?.trim() || 'https://www.vaillant.de/heizung/waermepumpe/';
  const installerUrl = input?.installerUrl?.trim() || 'https://www.vaillant.de/fachpartner/';
  const scanUrl = input?.scanUrl?.trim() || customerUrl;
  const guidelineId = input?.guidelineId?.trim() || 'gl-mtinudb1';

  const journeyNodes: CollectionFlowNode[] = [
    {
      id: 'n-zg-endkunde',
      kind: 'zielgruppe',
      label: 'Endkunde',
      segment: 'homeowner_decision',
      position: { x: 0, y: 40 },
    },
    {
      id: 'n-persona-ek',
      kind: 'persona',
      label: 'Endkunden-Persona',
      position: { x: 200, y: 40 },
    },
    {
      id: 'n-start-ek',
      kind: 'start',
      label: 'B2C Touchpoint',
      url: customerUrl,
      urlKey: customerUrl,
      maxSteps: 8,
      position: { x: 400, y: 120 },
    },
    {
      id: 'n-prompt-ek',
      kind: 'prompt',
      label: 'Endkunden-Bedarf',
      text: 'Was brauchst du als Endkunde, um eine Wärmepumpen-Empfehlung anzunehmen? Denke laut auf Deutsch.',
      position: { x: 620, y: 40 },
    },
    {
      id: 'n-success-ek',
      kind: 'success',
      label: 'Endkunde done',
      text: 'Fasse kurz zusammen, was dir für eine Empfehlung fehlt.',
      position: { x: 840, y: 40 },
    },
    {
      id: 'n-zg-installer',
      kind: 'zielgruppe',
      label: 'Fachhandwerker',
      segment: 'installer_recommendation',
      position: { x: 1060, y: 40 },
    },
    {
      id: 'n-persona-inst',
      kind: 'persona',
      label: 'Installateur-Persona',
      position: { x: 1260, y: 40 },
    },
    {
      id: 'n-start-inst',
      kind: 'start',
      label: 'Profi Touchpoint',
      url: installerUrl,
      urlKey: installerUrl,
      maxSteps: 8,
      position: { x: 1480, y: 120 },
    },
    {
      id: 'n-prompt-inst',
      kind: 'prompt',
      label: 'Installateur-Bedarf',
      text: 'Was brauchst du, um Vaillant Deinem Kunden sicher empfehlen zu können?',
      position: { x: 1700, y: 40 },
    },
    {
      id: 'n-success-inst',
      kind: 'success',
      label: 'Installateur done',
      text: 'Welche Opportunity siehst du, wenn Endkunde und Fachhandwerker zusammenarbeiten?',
      position: { x: 1920, y: 40 },
    },
  ];
  const journeyEdges: CollectionFlowEdge[] = [
    { id: 'e-zg-ek', source: 'n-zg-endkunde', target: 'n-persona-ek', edgeKind: 'then' },
    { id: 'e-ek-start', source: 'n-persona-ek', target: 'n-start-ek', edgeKind: 'then' },
    { id: 'e-start-prompt-ek', source: 'n-start-ek', target: 'n-prompt-ek', edgeKind: 'then' },
    { id: 'e-prompt-success-ek', source: 'n-prompt-ek', target: 'n-success-ek', edgeKind: 'then' },
    { id: 'e-ek-zg-inst', source: 'n-success-ek', target: 'n-zg-installer', edgeKind: 'then' },
    { id: 'e-zg-inst-persona', source: 'n-zg-installer', target: 'n-persona-inst', edgeKind: 'then' },
    { id: 'e-inst-start', source: 'n-persona-inst', target: 'n-start-inst', edgeKind: 'then' },
    { id: 'e-start-prompt-inst', source: 'n-start-inst', target: 'n-prompt-inst', edgeKind: 'then' },
    { id: 'e-prompt-success-inst', source: 'n-prompt-inst', target: 'n-success-inst', edgeKind: 'then' },
  ];

  const spine = qualitySpineWithIssueGate(scanUrl, 2140);
  const brandNodes: CollectionFlowNode[] = [
    {
      id: 'n-guideline',
      kind: 'guideline',
      label: 'Vaillant Group CD',
      guidelineId,
      position: { x: 2800, y: 40 },
    },
    {
      id: 'n-brand',
      kind: 'brand_measure',
      label: 'Brand Measure',
      guidelineId,
      fixtureId: 'demo-landing-pass',
      adapter: 'fixture',
      position: { x: 3020, y: 120 },
    },
    {
      id: 'n-brand-pass',
      kind: 'compare',
      label: 'Brand: keine Fails',
      path: 'brand.failCount',
      op: 'eq',
      value: 0,
      position: { x: 3240, y: 120 },
    },
    {
      id: 'n-ok-final',
      kind: 'quality_ok',
      label: 'Loop OK',
      position: { x: 3460, y: 40 },
    },
    {
      id: 'n-abandon-brand',
      kind: 'abandon',
      label: 'Brand fail',
      position: { x: 3460, y: 200 },
    },
  ];
  const brandEdges: CollectionFlowEdge[] = [
    { id: 'e-issues-guideline', source: 'n-issues', target: 'n-guideline', edgeKind: 'then' },
    { id: 'e-guideline-brand', source: 'n-guideline', target: 'n-brand', edgeKind: 'then' },
    { id: 'e-brand-compare', source: 'n-brand', target: 'n-brand-pass', edgeKind: 'then' },
    {
      id: 'e-brand-ok',
      source: 'n-brand-pass',
      target: 'n-ok-final',
      when: 'pass',
      edgeKind: 'when',
      label: 'pass',
    },
    {
      id: 'e-brand-abandon',
      source: 'n-brand-pass',
      target: 'n-abandon-brand',
      when: 'fail',
      edgeKind: 'otherwise',
      label: 'fail',
    },
  ];

  const spineEdges = spine.edges.map((e) =>
    e.id === 'e-issues-ok' ? { ...e, target: 'n-guideline' } : e,
  );
  const nodes = [...journeyNodes, ...spine.nodes, ...brandNodes];
  const edges: CollectionFlowEdge[] = [
    ...journeyEdges,
    { id: 'e-success-inst-scan', source: 'n-success-inst', target: 'n-scan', edgeKind: 'then' },
    ...spineEdges,
    ...brandEdges,
  ];

  const base: CollectionTestFlowDocument = {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_VAILLANT_INSTALLER_DUAL,
    nodes,
    edges,
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
  return { ...base, journeyFlow: extractJourneyFlowFromDocument(base, customerUrl, { personaNodeId: 'n-persona-ek' }) };
}

/**
 * Wave 23 — Event Quick Check spine (quick depth; no ECHON).
 * Competitors + deep_scan confirm nodes omitted; complete depth can insert them at bootstrap.
 */
export function createEqcQualityTemplate(
  url: string,
  opts?: { maxPages?: number; includeCompetitors?: boolean }
): CollectionTestFlowDocument {
  const pageUrl = url.trim() || 'https://example.com';
  const maxPages = opts?.maxPages ?? 50;
  const includeCompetitors = Boolean(opts?.includeCompetitors);

  const nodes: CollectionFlowNode[] = [
    { id: 'n-start', kind: 'start', label: 'Start', url: pageUrl, position: { x: 0, y: 80 } },
    {
      id: 'n-brief',
      kind: 'research_brief',
      label: 'Unternehmensprofil',
      position: { x: 220, y: 80 },
    },
    {
      id: 'n-confirm-brief',
      kind: 'human_confirm',
      label: 'Profil bestätigen',
      confirmKind: 'brief',
      position: { x: 440, y: 80 },
    },
  ];
  const edges: CollectionFlowEdge[] = [
    { id: 'e-start-brief', source: 'n-start', target: 'n-brief', edgeKind: 'then' },
    { id: 'e-brief-confirm', source: 'n-brief', target: 'n-confirm-brief', edgeKind: 'then' },
  ];

  let prev = 'n-confirm-brief';
  let x = 660;

  if (includeCompetitors) {
    nodes.push(
      {
        id: 'n-competitors',
        kind: 'competitors_suggest',
        label: 'Wettbewerber',
        position: { x, y: 80 },
      },
      {
        id: 'n-confirm-competitors',
        kind: 'human_confirm',
        label: 'Wettbewerber bestätigen',
        confirmKind: 'competitors',
        position: { x: x + 220, y: 80 },
      }
    );
    edges.push(
      { id: 'e-to-competitors', source: prev, target: 'n-competitors', edgeKind: 'then' },
      {
        id: 'e-competitors-confirm',
        source: 'n-competitors',
        target: 'n-confirm-competitors',
        edgeKind: 'then',
      }
    );
    prev = 'n-confirm-competitors';
    x += 440;
  }

  nodes.push(
    {
      id: 'n-domain',
      kind: 'domain_scan',
      label: 'Domain-Scan',
      url: pageUrl,
      maxPages,
      position: { x, y: 80 },
    },
    {
      id: 'n-persona-boot',
      kind: 'persona_bootstrap',
      label: 'Persona erstellen',
      position: { x: x + 220, y: 80 },
    },
    {
      id: 'n-suggest-q',
      kind: 'suggest_queries',
      label: 'GEO-Fragen',
      position: { x: x + 440, y: 80 },
    },
    {
      id: 'n-confirm-geo',
      kind: 'human_confirm',
      label: 'GEO-Fragen bestätigen',
      confirmKind: 'geo_queries',
      position: { x: x + 660, y: 80 },
    },
    {
      id: 'n-geo',
      kind: 'geo_job',
      label: 'GEO Analyse',
      url: pageUrl,
      text: "{{ $('n-suggest-q').json.text }}",
      companyName: "{{ $('n-brief').json.displayName }}",
      position: { x: x + 880, y: 80 },
    },
    {
      id: 'n-score',
      kind: 'compare',
      label: 'Score ≥ 70',
      path: 'domain.overallScore',
      op: 'gte',
      value: 70,
      position: { x: x + 1100, y: 80 },
    },
    {
      id: 'n-ok',
      kind: 'quality_ok',
      label: 'Bereit',
      position: { x: x + 1320, y: 40 },
    },
    {
      id: 'n-abandon',
      kind: 'abandon',
      label: 'Nicht bereit',
      position: { x: x + 1320, y: 160 },
    }
  );

  edges.push(
    { id: 'e-to-domain', source: prev, target: 'n-domain', edgeKind: 'then' },
    { id: 'e-domain-persona', source: 'n-domain', target: 'n-persona-boot', edgeKind: 'then' },
    { id: 'e-persona-suggest', source: 'n-persona-boot', target: 'n-suggest-q', edgeKind: 'then' },
    { id: 'e-suggest-confirm', source: 'n-suggest-q', target: 'n-confirm-geo', edgeKind: 'then' },
    { id: 'e-confirm-geo', source: 'n-confirm-geo', target: 'n-geo', edgeKind: 'then' },
    { id: 'e-geo-score', source: 'n-geo', target: 'n-score', edgeKind: 'then' },
    { id: 'e-score-ok', source: 'n-score', target: 'n-ok', edgeKind: 'when', when: 'pass' },
    {
      id: 'e-score-abandon',
      source: 'n-score',
      target: 'n-abandon',
      edgeKind: 'otherwise',
      when: 'fail',
    }
  );

  return {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_EQC_QUALITY,
    nodes,
    edges,
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
}

export function documentHasEqcSpine(doc: CollectionTestFlowDocument): boolean {
  if (doc.templateId === COLLECTION_FLOW_TEMPLATE_EQC_QUALITY) return true;
  return doc.nodes.some(
    (n) =>
      n.kind === 'research_brief' ||
      n.kind === 'human_confirm' ||
      n.kind === 'persona_bootstrap' ||
      n.kind === 'suggest_queries' ||
      n.kind === 'competitors_suggest'
  );
}

export function scoreGateThreshold(nodes: CollectionFlowNode[]): number {
  const gate =
    nodes.find((n) => n.kind === 'compare' && typeof n.value === 'number') ??
    nodes.find((n) => n.kind === 'score_gate') ??
    nodes.find((n) => n.kind === 'geo_gate');
  const t =
    typeof gate?.value === 'number'
      ? gate.value
      : typeof gate?.threshold === 'number'
        ? gate.threshold
        : undefined;
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
  return start?.url?.trim() || start?.urlKey?.trim() || null;
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
  'brand_measure',
  'compare',
  'set',
  'score_gate',
  'issue_gate',
  'geo_gate',
  'quality_ok',
  'research_brief',
  'competitors_suggest',
  'persona_bootstrap',
  'suggest_queries',
  'human_confirm',
]);

/** Brandion Family D action kinds (Wave 24). */
export const BRAND_FAMILY_KINDS = new Set<CollectionFlowNodeKind>(['brand_measure']);

export function documentHasBrandMeasure(doc: CollectionTestFlowDocument): boolean {
  return doc.nodes.some((n) => n.kind === 'brand_measure');
}

/** Merge upstream `guideline` config onto `brand_measure` nodes missing guidelineId. */
export function mergeGuidelineConfigOntoBrandMeasure(
  nodes: CollectionFlowNode[]
): CollectionFlowNode[] {
  const guidelineCfg = [...nodes].reverse().find((n) => n.kind === 'guideline');
  const guidelineId = guidelineCfg?.guidelineId?.trim() || null;
  if (!guidelineId) return nodes;
  return nodes.map((n) => {
    if (n.kind !== 'brand_measure') return n;
    if (n.guidelineId?.trim()) return n;
    return { ...n, guidelineId };
  });
}

const LEGACY_QUALITY_GATE_KINDS = new Set<CollectionFlowNodeKind>([
  'score_gate',
  'issue_gate',
  'geo_gate',
]);

function legacyGateToCompare(node: CollectionFlowNode): CollectionFlowNode {
  const threshold =
    typeof node.threshold === 'number' && Number.isFinite(node.threshold)
      ? node.threshold
      : DEFAULT_SCORE_GATE_THRESHOLD;
  const minCount =
    typeof node.minCount === 'number' && Number.isFinite(node.minCount) ? node.minCount : 1;
  const base = { id: node.id, label: node.label, position: node.position, note: node.note };

  if (node.kind === 'score_gate') {
    const kind = (node.scoreKind ?? 'overall').trim().toLowerCase() || 'overall';
    const path = kind === 'overall' ? 'scan.overallScore' : `scan.scores.${kind}`;
    return {
      ...base,
      kind: 'compare',
      path,
      op: node.gateCondition === 'score_below' ? 'lt' : 'gte',
      value: threshold,
    };
  }
  if (node.kind === 'geo_gate') {
    const cond = node.gateCondition ?? 'cited_share_at_least';
    if (cond === 'geo_fitness_at_least' || cond === 'geo_fitness_below') {
      return {
        ...base,
        kind: 'compare',
        path: 'geo.geoFitness',
        op: cond === 'geo_fitness_below' ? 'lt' : 'gte',
        value: threshold,
      };
    }
    return {
      ...base,
      kind: 'compare',
      path: 'geo.citedShare',
      op: cond === 'cited_share_below' ? 'lt' : 'gte',
      value: threshold,
    };
  }
  const cond = node.gateCondition ?? 'critical_issues';
  if (cond === 'no_critical_issues') {
    return { ...base, kind: 'compare', path: 'scan.issues.criticalCount', op: 'eq', value: 0 };
  }
  if (cond === 'no_serious_issues') {
    return { ...base, kind: 'compare', path: 'scan.issues.seriousCount', op: 'eq', value: 0 };
  }
  if (cond === 'no_issues') {
    return { ...base, kind: 'compare', path: 'scan.issues.issueCount', op: 'eq', value: 0 };
  }
  if (cond === 'serious_issues') {
    return {
      ...base,
      kind: 'compare',
      path: 'scan.issues.seriousCount',
      op: 'lt',
      value: minCount,
    };
  }
  if (cond === 'any_issues') {
    return { ...base, kind: 'compare', path: 'scan.issues.issueCount', op: 'lt', value: minCount };
  }
  return {
    ...base,
    kind: 'compare',
    path: 'scan.issues.criticalCount',
    op: 'lt',
    value: minCount,
  };
}

/** Wave 9: convert legacy score/issue/geo gates to `compare`. */
export function migrateLegacyQualityGates(
  doc: CollectionTestFlowDocument
): CollectionTestFlowDocument {
  if (!doc.nodes.some((n) => LEGACY_QUALITY_GATE_KINDS.has(n.kind))) return doc;
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      LEGACY_QUALITY_GATE_KINDS.has(n.kind) ? legacyGateToCompare(n) : n
    ),
    edges: doc.edges.map((e) => ({ ...e })),
  };
}

/**
 * Wave 22: expand opaque `journey` canvas stub into first-class nodes from `journeyFlow`.
 * No-op when first-class journey kinds already exist or embed is missing.
 */
export function migrateOpaqueJourneyEmbed(
  doc: CollectionTestFlowDocument
): CollectionTestFlowDocument {
  const opaque = doc.nodes.filter((n) => n.kind === 'journey');
  if (opaque.length === 0) return doc;

  const hasFirstClass = doc.nodes.some(
    (n) =>
      n.kind === 'start' ||
      JOURNEY_SEGMENT_DETECT_KINDS.has(n.kind) ||
      n.kind === 'success' ||
      n.kind === 'abandon' ||
      n.kind === 'measure'
  );
  if (hasFirstClass) {
    // Drop orphan opaque stubs when first-class graph already exists.
    const remove = new Set(opaque.map((n) => n.id));
    return {
      ...doc,
      nodes: doc.nodes.filter((n) => !remove.has(n.id)),
      edges: doc.edges.filter((e) => !remove.has(e.source) && !remove.has(e.target)),
    };
  }

  const embed = doc.journeyFlow;
  if (!embed?.nodes?.length) return doc;

  const stub = opaque[0]!;
  const baseX = stub.position?.x ?? 0;
  const baseY = stub.position?.y ?? 120;
  const expandedNodes: CollectionFlowNode[] = embed.nodes.map((n, i) => ({
    id: n.id,
    kind: n.kind as CollectionFlowNodeKind,
    label: n.label || n.kind,
    text: n.text ?? undefined,
    url: n.urlKey ?? undefined,
    urlKey: n.urlKey ?? undefined,
    maxSteps: n.maxSteps ?? undefined,
    personaId: n.personaId ?? undefined,
    personaName: n.personaName ?? undefined,
    segment: n.segment ?? undefined,
    measureKey: n.measureKey ?? undefined,
    position: { x: baseX + i * 200, y: baseY },
  }));
  const expandedEdges: CollectionFlowEdge[] = (embed.edges ?? []).map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    edgeKind: e.kind,
    when: e.kind === 'when' ? 'pass' : e.kind === 'otherwise' ? 'fail' : undefined,
  }));

  const opaqueIds = new Set(opaque.map((n) => n.id));
  const embedIds = new Set(expandedNodes.map((n) => n.id));
  const startId = expandedNodes.find((n) => n.kind === 'start')?.id;
  const endId =
    expandedNodes.find((n) => n.kind === 'success')?.id ??
    expandedNodes[expandedNodes.length - 1]?.id;

  const rewired: CollectionFlowEdge[] = [];
  for (const e of doc.edges) {
    if (opaqueIds.has(e.source) && opaqueIds.has(e.target)) continue;
    if (opaqueIds.has(e.target) && startId) {
      rewired.push({ ...e, target: startId });
      continue;
    }
    if (opaqueIds.has(e.source) && endId) {
      rewired.push({ ...e, source: endId });
      continue;
    }
    if (opaqueIds.has(e.source) || opaqueIds.has(e.target)) continue;
    rewired.push(e);
  }

  const kept = doc.nodes.filter((n) => !opaqueIds.has(n.id) && !embedIds.has(n.id));
  return {
    ...doc,
    nodes: [...kept, ...expandedNodes],
    edges: [...rewired, ...expandedEdges],
  };
}

/**
 * Persona slots for Wave 14 sequential fan-out.
 * Primary = Zielgruppe → then → Persona; siblings = Zielgruppe → parallel → Persona.
 */
export type JourneyPersonaSlot = {
  nodeId: string;
  personaId: string | null;
  personaName: string | null;
  segment: string | null;
  via: 'then' | 'parallel' | 'orphan';
  primary: boolean;
};

function journeyCandidateNodes(doc: CollectionTestFlowDocument): CollectionFlowNode[] {
  const firstQualityIdx = doc.nodes.findIndex((n) => QUALITY_FAMILY_KINDS.has(n.kind));
  return (firstQualityIdx === -1 ? doc.nodes : doc.nodes.slice(0, firstQualityIdx)).filter(
    (n) => n.kind !== 'journey'
  );
}

export function listJourneyPersonaSlots(doc: CollectionTestFlowDocument): JourneyPersonaSlot[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const ziel = doc.nodes.find((n) => n.kind === 'zielgruppe');
  const slots: JourneyPersonaSlot[] = [];
  const seen = new Set<string>();

  const pushPersona = (
    node: CollectionFlowNode,
    via: JourneyPersonaSlot['via'],
    primary: boolean
  ) => {
    if (node.kind !== 'persona' || seen.has(node.id)) return;
    seen.add(node.id);
    slots.push({
      nodeId: node.id,
      personaId: node.personaId?.trim() || null,
      personaName: node.personaName?.trim() || null,
      segment: node.segment?.trim() || ziel?.segment?.trim() || null,
      via,
      primary,
    });
  };

  if (ziel) {
    const outs = doc.edges.filter(
      (e) => e.source === ziel.id && (e.edgeKind ?? 'then') !== 'bind'
    );
    const thenTargets = outs.filter((e) => (e.edgeKind ?? 'then') === 'then');
    const parallelTargets = outs.filter((e) => e.edgeKind === 'parallel');
    let primarySet = false;
    for (const e of thenTargets) {
      const n = byId.get(e.target);
      if (!n || n.kind !== 'persona') continue;
      pushPersona(n, 'then', !primarySet);
      primarySet = true;
    }
    for (const e of parallelTargets) {
      const n = byId.get(e.target);
      if (!n || n.kind !== 'persona') continue;
      pushPersona(n, 'parallel', !primarySet);
      if (!primarySet) primarySet = true;
    }
  }

  for (const n of doc.nodes) {
    if (n.kind === 'persona') pushPersona(n, 'orphan', slots.length === 0);
  }

  if (slots.length > 0 && !slots.some((s) => s.primary)) {
    slots[0]!.primary = true;
  }
  return slots;
}

function startNodeForPersona(
  doc: CollectionTestFlowDocument,
  candidateNodes: CollectionFlowNode[],
  personaNodeId: string,
): CollectionFlowNode | null {
  const candidateIds = new Set(candidateNodes.map((n) => n.id));
  for (const e of doc.edges) {
    if (e.source !== personaNodeId || (e.edgeKind ?? 'then') !== 'then') continue;
    if (!candidateIds.has(e.target)) continue;
    const target = candidateNodes.find((n) => n.id === e.target && n.kind === 'start');
    if (target) return target;
  }
  return null;
}

function upstreamZielgruppeForPersona(
  doc: CollectionTestFlowDocument,
  personaNodeId: string,
): CollectionFlowNode | null {
  const inEdge = doc.edges.find(
    (e) => e.target === personaNodeId && (e.edgeKind ?? 'then') === 'then',
  );
  if (!inEdge) return null;
  return doc.nodes.find((n) => n.id === inEdge.source && n.kind === 'zielgruppe') ?? null;
}

/** Walk `then` edges from a start until the next zielgruppe (sequential dual-journey chains). */
function reachableJourneyChainIds(
  doc: CollectionTestFlowDocument,
  candidateNodes: CollectionFlowNode[],
  startId: string,
): Set<string> {
  const candidateIds = new Set(candidateNodes.map((n) => n.id));
  const ids = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (ids.has(id)) continue;
    const node = candidateNodes.find((n) => n.id === id);
    if (!node) continue;
    ids.add(id);
    for (const e of doc.edges) {
      if (e.source !== id || (e.edgeKind ?? 'then') !== 'then') continue;
      if (!candidateIds.has(e.target)) continue;
      const targetNode = candidateNodes.find((n) => n.id === e.target);
      if (targetNode?.kind === 'zielgruppe') continue;
      queue.push(e.target);
    }
  }
  return ids;
}

/**
 * Build an embedded Audion-shaped journey subgraph from first-class journey nodes on the
 * canvas (Wave 5 / 11 / 14). Config kinds `persona` / `zielgruppe` merge onto `start` and are
 * omitted from the agent graph. Falls back to `doc.journeyFlow` / null when no start.
 * @see specs/domain/collection-test-flow.md — Wave 5–7 / 11 / 14 implementation notes
 */
export function extractJourneyFlowFromDocument(
  doc: CollectionTestFlowDocument,
  url: string,
  opts?: { personaNodeId?: string | null }
): EmbeddedAudionJourneyFlow | null {
  const pageUrl = url.trim() || 'https://example.com';
  const candidateNodes = journeyCandidateNodes(doc);

  if (!candidateNodes.some((n) => n.kind === 'start')) {
    if (doc.journeyFlow?.nodes?.length) return patchJourneyFlowUrl(doc.journeyFlow, pageUrl);
    return null;
  }

  const configKinds = new Set<CollectionFlowNodeKind>(['persona', 'zielgruppe', 'guideline']);
  const allStarts = candidateNodes.filter((n) => n.kind === 'start');
  const slots = listJourneyPersonaSlots(doc);
  const forcedId = opts?.personaNodeId?.trim() || null;

  let activeStart = allStarts[0] ?? null;
  let pageUrlForStart = pageUrl;
  if (forcedId) {
    const mapped = startNodeForPersona(doc, candidateNodes, forcedId);
    if (mapped) {
      activeStart = mapped;
      pageUrlForStart = mapped.url?.trim() || mapped.urlKey?.trim() || pageUrl;
    }
  } else if (allStarts.length > 1) {
    const primarySlot = slots.find((s) => s.primary) ?? slots[0];
    if (primarySlot?.nodeId) {
      const mapped = startNodeForPersona(doc, candidateNodes, primarySlot.nodeId);
      if (mapped) {
        activeStart = mapped;
        pageUrlForStart = mapped.url?.trim() || mapped.urlKey?.trim() || pageUrl;
      }
    }
  } else if (allStarts.length === 1) {
    pageUrlForStart =
      allStarts[0]!.url?.trim() || allStarts[0]!.urlKey?.trim() || pageUrl;
  }

  if (!activeStart) {
    if (doc.journeyFlow?.nodes?.length) return patchJourneyFlowUrl(doc.journeyFlow, pageUrl);
    return null;
  }

  const chainIds =
    allStarts.length > 1
      ? reachableJourneyChainIds(doc, candidateNodes, activeStart.id)
      : new Set(
          candidateNodes.filter((n) => !configKinds.has(n.kind)).map((n) => n.id),
        );

  const agentNodes = candidateNodes.filter(
    (n) => !configKinds.has(n.kind) && chainIds.has(n.id),
  );
  const start = agentNodes.find((n) => n.kind === 'start');
  if (!start) {
    if (doc.journeyFlow?.nodes?.length) return patchJourneyFlowUrl(doc.journeyFlow, pageUrl);
    return null;
  }

  const allPersonas = doc.nodes.filter((n) => n.kind === 'persona');
  const personaCfg = forcedId
    ? allPersonas.find((n) => n.id === forcedId)
    : slots.find((s) => s.primary)
      ? allPersonas.find((n) => n.id === slots.find((s) => s.primary)!.nodeId)
      : [...allPersonas].reverse()[0];
  const zielCfg = forcedId
    ? upstreamZielgruppeForPersona(doc, forcedId)
    : doc.nodes.find((n) => n.kind === 'zielgruppe');
  const mergedPersonaId = start.personaId?.trim() || personaCfg?.personaId?.trim() || null;
  const mergedPersonaName =
    start.personaName?.trim() || personaCfg?.personaName?.trim() || null;
  const mergedSegment =
    start.segment?.trim() ||
    zielCfg?.segment?.trim() ||
    personaCfg?.segment?.trim() ||
    null;

  const ids = new Set(agentNodes.map((n) => n.id));
  const edges = doc.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .filter((e) => (e.edgeKind ?? 'then') !== 'bind')
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
  const nodes = agentNodes.map((n) => {
    if (n.kind === 'start') {
      return {
        id: n.id,
        kind: n.kind,
        label: n.label,
        text: n.text ?? null,
        urlKey: pageUrlForStart,
        maxSteps: n.maxSteps ?? 8,
        personaId: mergedPersonaId,
        personaName: mergedPersonaName,
        segment: mergedSegment,
        measureKey: null,
      };
    }
    return {
      id: n.id,
      kind: n.kind,
      label: n.label,
      text: n.text ?? null,
      urlKey: n.urlKey ?? null,
      maxSteps: n.maxSteps ?? null,
      personaId: null,
      personaName: null,
      segment: null,
      measureKey: n.kind === 'measure' ? (n.measureKey ?? null) : null,
    };
  });
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
  url: string,
  opts?: { personaNodeId?: string | null }
): EmbeddedAudionJourneyFlow | null {
  if (!documentHasJourneySegment(doc)) return null;
  const extracted = extractJourneyFlowFromDocument(doc, url, opts);
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
  hasCompareGates: boolean;
  scorePassed: boolean;
  issueGatePassed: boolean;
  geoGatePassed: boolean;
  comparePassed: boolean;
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
    return input.hasJourneySegment
      ? `Collection bereit — Task ok, Score ${input.overallScore ?? '—'}.`
      : `Collection bereit — Score ${input.overallScore ?? '—'}.`;
  }
  if (input.hasJourneySegment && !input.taskCompleted) {
    return 'Journey-Task nicht abgeschlossen — Collection nicht bereit.';
  }
  if (!input.pageEvidenceValid) {
    return 'Page-Evidence ungültig oder Scan blockiert — Collection nicht bereit.';
  }
  if (input.hasCompareGates && !input.comparePassed) {
    return 'Compare verfehlt — Catalog-Pfad / Op nicht erfüllt.';
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
  hasCompareGates?: boolean;
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
  const hasCompareGates = Boolean(partial.hasCompareGates);
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
    comparePassed: !hasCompareGates,
    compareResults: [],
    criticalCount: null,
    issueCount: null,
    citedShare: null,
    geoFitness: null,
    qualityPassed,
    collectionReady,
    hasJourneySegment: partial.hasJourneySegment,
    hasIssueGate,
    hasGeoGate,
    hasCompareGates,
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
      hasCompareGates,
      scorePassed: false,
      issueGatePassed: !hasIssueGate,
      geoGatePassed: !hasGeoGate,
      comparePassed: !hasCompareGates,
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
   * Default true.
   */
  requirePageScore?: boolean;
  /** Score gate node when present (legacy / implicit). */
  scoreGate?: CollectionFlowNode | null;
  /** Issue gate node when present on the flow (legacy). */
  issueGate?: CollectionFlowNode | null;
  issueSignals?: IssueGateSignals | null;
  /** GEO gate node when present (legacy). */
  geoGate?: CollectionFlowNode | null;
  geoSignals?: GeoGateSignals | null;
  /** Wave 9: evaluated compare nodes (preferred quality path). */
  compareResults?: Array<{
    nodeId: string;
    path: string;
    passed: boolean;
    actual?: string | number | boolean | null;
  }> | null;
}): CollectionVerdict {
  const threshold = input.threshold ?? DEFAULT_SCORE_GATE_THRESHOLD;
  const blockers = [...(input.blockers ?? [])];
  const hasJourneySegment = Boolean(input.hasJourneySegment);
  const hasIssueGate = Boolean(input.issueGate);
  const hasGeoGate = Boolean(input.geoGate);
  const compareResults = input.compareResults ?? [];
  const hasCompareGates = compareResults.length > 0;
  /** Default true (Wave 1–8A); GEO-only / compare-only may set false. */
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
      hasCompareGates,
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
      hasCompareGates,
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

  // Wave 9: when compare nodes exist, they own qualityPassed (AND).
  // Legacy score/issue/geo still evaluated for compat flags / tests without compares.
  const comparePassed = hasCompareGates ? compareResults.every((r) => r.passed) : true;

  const scorePassed = hasCompareGates
    ? comparePassed
    : !requirePageScore
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
  if (!hasCompareGates && hasIssueGate && input.issueGate) {
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
  if (!hasCompareGates && hasGeoGate && input.geoGate) {
    if (!input.geoSignals) {
      geoGatePassed = false;
      geoGateBranch = 'fail';
      blockers.push('GEO signals fehlen');
    } else {
      geoGatePassed = evaluateGeoGatePassed(input.geoGate, input.geoSignals);
      geoGateBranch = geoGatePassed ? 'pass' : 'fail';
    }
  }

  const qualityPassed = hasCompareGates
    ? comparePassed && pageEvidenceValid
    : scorePassed && issueGatePassed && geoGatePassed;

  let terminalKind: CollectionVerdict['terminalKind'];
  let terminalNodeId: string | null;
  if (hasCompareGates && !comparePassed) {
    const failed = compareResults.find((r) => !r.passed);
    terminalKind = 'abandon';
    terminalNodeId = failed?.nodeId ?? 'n-abandon';
  } else if (!scorePassed) {
    terminalKind = 'abandon';
    terminalNodeId = 'n-abandon';
  } else if (!hasCompareGates && hasIssueGate && !issueGatePassed) {
    terminalKind = 'abandon';
    terminalNodeId = 'n-abandon';
  } else if (!hasCompareGates && hasGeoGate && !geoGatePassed) {
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
    comparePassed,
    compareResults,
    criticalCount,
    issueCount,
    citedShare,
    geoFitness,
    qualityPassed,
    collectionReady,
    hasJourneySegment,
    hasIssueGate,
    hasGeoGate,
    hasCompareGates,
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
      hasCompareGates,
      scorePassed,
      issueGatePassed,
      geoGatePassed,
      comparePassed,
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
  const base: CollectionTestFlowDocument = {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId:
      typeof doc.templateId === 'string' ? doc.templateId : COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
    nodes: doc.nodes as CollectionFlowNode[],
    edges: doc.edges as CollectionFlowEdge[],
    journeyFlow: (doc.journeyFlow as EmbeddedAudionJourneyFlow | null | undefined) ?? null,
    lastVerdict: (doc.lastVerdict as CollectionVerdict | null | undefined) ?? null,
    lastRun: (doc.lastRun as CollectionFlowLastRun | null | undefined) ?? null,
  };
  return migrateOpaqueJourneyEmbed(migrateLegacyQualityGates(base));
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
  const compareIds = doc.nodes.filter((n) => n.kind === 'compare').map((n) => n.id);
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
    markMany(compareIds, 'skipped');
    mark(okId, 'skipped');
    mark(abandonId, 'skipped');
    return states;
  }

  markMany(journeyIds, 'done');
  mark(scanId, scanId ? 'done' : 'idle');
  mark(geoJobId, geoJobId ? 'done' : 'idle');

  const resultsById = new Map(
    (verdict.compareResults ?? []).map((r) => [r.nodeId, r.passed] as const)
  );
  let failedCompare = false;
  for (const id of compareIds) {
    if (failedCompare) {
      mark(id, 'skipped');
      continue;
    }
    const passed = resultsById.get(id);
    if (passed === false) {
      mark(id, 'done');
      failedCompare = true;
    } else {
      mark(id, 'done');
    }
  }

  if (!verdict.qualityPassed || failedCompare || verdict.terminalKind !== 'quality_ok') {
    mark(okId, 'skipped');
    mark(abandonId, 'done');
  } else {
    mark(okId, 'done');
    mark(abandonId, 'skipped');
  }
  return states;
}
