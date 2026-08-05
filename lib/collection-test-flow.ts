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

export const COLLECTION_FLOW_NODE_KINDS = [
  'start',
  'journey',
  'scan',
  'score_gate',
  'issue_gate',
  'quality_ok',
  'abandon',
] as const;

export type CollectionFlowNodeKind = (typeof COLLECTION_FLOW_NODE_KINDS)[number];

export type CollectionFlowGateCondition =
  | 'score_at_least'
  | 'critical_issues'
  | 'no_critical_issues'
  | 'issue_rule_match';

export type CollectionFlowNode = {
  id: string;
  kind: CollectionFlowNodeKind;
  label: string;
  /** Absolute or relative page URL for `scan` / `start` nodes. */
  url?: string;
  /** Score threshold for `score_gate` + `score_at_least` (default 70). */
  threshold?: number;
  /** Min issue count for `critical_issues` (default 1). */
  minCount?: number;
  /** Regex / substring for `issue_rule_match` against ruleId. */
  pattern?: string;
  gateCondition?: CollectionFlowGateCondition;
  position?: { x: number; y: number };
};

export type CollectionFlowEdge = {
  id: string;
  source: string;
  target: string;
  /** For gates: which branch this edge represents. */
  when?: 'pass' | 'fail';
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
  url: string;
  status: string;
  overallScore: number | null;
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
  criticalCount: number | null;
  issueCount: number | null;
  qualityPassed: boolean;
  /**
   * Quality-only: flowCompleted ∧ pageEvidenceValid ∧ qualityPassed.
   * With journey: taskCompleted ∧ validEvidence ∧ qualityPassed.
   */
  collectionReady: boolean;
  hasJourneySegment: boolean;
  hasIssueGate: boolean;
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
    { id: 'e-start-scan', source: 'n-start', target: 'n-scan' },
    { id: 'e-scan-score', source: 'n-scan', target: 'n-score' },
    { id: 'e-score-ok', source: 'n-score', target: 'n-ok', when: 'pass', label: 'pass' },
    {
      id: 'e-score-abandon',
      source: 'n-score',
      target: 'n-abandon',
      when: 'fail',
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

export function createJourneyQualityTemplate(url: string): CollectionTestFlowDocument {
  const pageUrl = url.trim() || 'https://example.com';
  const journeyFlow = createMinimalAudionJourneyFlow(pageUrl);
  const nodes: CollectionFlowNode[] = [
    { id: 'n-start', kind: 'start', label: 'Start', url: pageUrl, position: { x: 0, y: 120 } },
    {
      id: 'n-journey',
      kind: 'journey',
      label: 'AUDION journey',
      url: pageUrl,
      position: { x: 200, y: 120 },
    },
    {
      id: 'n-scan',
      kind: 'scan',
      label: 'Page scan',
      url: pageUrl,
      position: { x: 420, y: 120 },
    },
    {
      id: 'n-score',
      kind: 'score_gate',
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      gateCondition: 'score_at_least',
      threshold: DEFAULT_SCORE_GATE_THRESHOLD,
      position: { x: 640, y: 120 },
    },
    {
      id: 'n-ok',
      kind: 'quality_ok',
      label: 'Quality OK',
      position: { x: 880, y: 40 },
    },
    {
      id: 'n-abandon',
      kind: 'abandon',
      label: 'Abandon',
      position: { x: 880, y: 200 },
    },
  ];
  const edges: CollectionFlowEdge[] = [
    { id: 'e-start-journey', source: 'n-start', target: 'n-journey' },
    { id: 'e-journey-scan', source: 'n-journey', target: 'n-scan' },
    { id: 'e-scan-score', source: 'n-scan', target: 'n-score' },
    { id: 'e-score-ok', source: 'n-score', target: 'n-ok', when: 'pass', label: 'pass' },
    {
      id: 'e-score-abandon',
      source: 'n-score',
      target: 'n-abandon',
      when: 'fail',
      label: 'fail',
    },
  ];
  return {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
    nodes,
    edges,
    journeyFlow,
    lastVerdict: null,
    lastRun: null,
  };
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
    { id: 'e-scan-score', source: 'n-scan', target: 'n-score' },
    { id: 'e-score-issues', source: 'n-score', target: 'n-issues', when: 'pass', label: 'pass' },
    {
      id: 'e-score-abandon',
      source: 'n-score',
      target: 'n-abandon',
      when: 'fail',
      label: 'fail',
    },
    { id: 'e-issues-ok', source: 'n-issues', target: 'n-ok', when: 'pass', label: 'pass' },
    {
      id: 'e-issues-abandon',
      source: 'n-issues',
      target: 'n-abandon',
      when: 'fail',
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
      { id: 'e-start-scan', source: 'n-start', target: 'n-scan' },
      ...spine.edges,
    ],
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };
}

/** Wave 3: journey + quality + issue_gate. */
export function createJourneyQualityIssuesTemplate(url: string): CollectionTestFlowDocument {
  const pageUrl = url.trim() || 'https://example.com';
  const journeyFlow = createMinimalAudionJourneyFlow(pageUrl);
  const spine = qualitySpineWithIssueGate(pageUrl, 420);
  return {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES,
    nodes: [
      { id: 'n-start', kind: 'start', label: 'Start', url: pageUrl, position: { x: 0, y: 120 } },
      {
        id: 'n-journey',
        kind: 'journey',
        label: 'AUDION journey',
        url: pageUrl,
        position: { x: 200, y: 120 },
      },
      ...spine.nodes,
    ],
    edges: [
      { id: 'e-start-journey', source: 'n-start', target: 'n-journey' },
      { id: 'e-journey-scan', source: 'n-journey', target: 'n-scan' },
      ...spine.edges,
    ],
    journeyFlow,
    lastVerdict: null,
    lastRun: null,
  };
}

export function scoreGateThreshold(nodes: CollectionFlowNode[]): number {
  const gate = nodes.find((n) => n.kind === 'score_gate');
  const t = gate?.threshold;
  return typeof t === 'number' && Number.isFinite(t) ? t : DEFAULT_SCORE_GATE_THRESHOLD;
}

export function scanNodeUrl(nodes: CollectionFlowNode[]): string | null {
  const scan = nodes.find((n) => n.kind === 'scan');
  const url = scan?.url?.trim();
  return url || null;
}

export function startNodeUrl(nodes: CollectionFlowNode[]): string | null {
  const start = nodes.find((n) => n.kind === 'start');
  return start?.url?.trim() || null;
}

export function documentHasJourneySegment(doc: CollectionTestFlowDocument): boolean {
  return Boolean(doc.journeyFlow?.nodes?.length) || doc.nodes.some((n) => n.kind === 'journey');
}

export function documentHasIssueGate(doc: CollectionTestFlowDocument): boolean {
  return doc.nodes.some((n) => n.kind === 'issue_gate');
}

export function issueGateNode(nodes: CollectionFlowNode[]): CollectionFlowNode | null {
  return nodes.find((n) => n.kind === 'issue_gate') ?? null;
}

export type IssueGateSignals = {
  criticalCount: number;
  issueCount: number;
  /** ruleIds present (for issue_rule_match). */
  ruleIds?: string[];
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
  if (cond === 'issue_rule_match') {
    const pattern = gate.pattern?.trim();
    if (!pattern) return true;
    try {
      const re = new RegExp(pattern, 'i');
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
  scorePassed: boolean;
  issueGatePassed: boolean;
  criticalCount: number | null;
  overallScore: number | null;
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
    return input.hasJourneySegment
      ? `Collection bereit — Task ok, Score ${input.overallScore ?? '—'} ≥ ${input.threshold}${crit}.`
      : `Collection bereit — Score ${input.overallScore ?? '—'} ≥ ${input.threshold}${crit}.`;
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
  pageEvidenceCaveat?: string | null;
  taskCompleted?: boolean;
}): CollectionVerdict {
  const taskCompleted = partial.taskCompleted ?? false;
  const pageEvidenceValid = false;
  const qualityPassed = false;
  const validEvidence = false;
  const collectionReady = false;
  const hasIssueGate = Boolean(partial.hasIssueGate);
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
    criticalCount: null,
    issueCount: null,
    qualityPassed,
    collectionReady,
    hasJourneySegment: partial.hasJourneySegment,
    hasIssueGate,
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
      scorePassed: false,
      issueGatePassed: !hasIssueGate,
      criticalCount: null,
      overallScore: partial.overallScore,
      threshold: partial.threshold,
      terminalKind: null,
    }),
  };
}

/**
 * Derive Collection verdict from CHECKION scan (+ optional journey / issue signals).
 */
export function deriveCollectionVerdict(input: {
  scanStatus: string;
  overallScore: number | null;
  threshold?: number;
  blockers?: string[];
  /** When true, require journey task/evidence flags for collectionReady. */
  hasJourneySegment?: boolean;
  taskCompleted?: boolean;
  journeyValidEvidence?: boolean;
  /** Issue gate node when present on the flow. */
  issueGate?: CollectionFlowNode | null;
  issueSignals?: IssueGateSignals | null;
}): CollectionVerdict {
  const threshold = input.threshold ?? DEFAULT_SCORE_GATE_THRESHOLD;
  const blockers = [...(input.blockers ?? [])];
  const hasJourneySegment = Boolean(input.hasJourneySegment);
  const hasIssueGate = Boolean(input.issueGate);
  const statusRaw = input.scanStatus.trim().toLowerCase();

  if (statusRaw === 'queued' || statusRaw === 'running' || statusRaw === 'paused') {
    return emptyRunningOrErrorFields({
      status: 'running',
      overallScore: input.overallScore,
      threshold,
      blockers,
      hasJourneySegment,
      hasIssueGate,
      taskCompleted: hasJourneySegment ? Boolean(input.taskCompleted) : true,
    });
  }

  if (statusRaw === 'failed' || statusRaw === 'cancelled' || statusRaw === 'cancelling') {
    if (!blockers.length) blockers.push(`Scan status: ${statusRaw}`);
    return emptyRunningOrErrorFields({
      status: 'error',
      overallScore: input.overallScore,
      threshold,
      blockers,
      hasJourneySegment,
      hasIssueGate,
      pageEvidenceCaveat: blockers[0] ?? 'Scan fehlgeschlagen',
      taskCompleted: hasJourneySegment ? Boolean(input.taskCompleted) : false,
    });
  }

  // completed (or unknown terminal treated as complete attempt)
  const score = input.overallScore;
  let pageEvidenceValid = true;
  let pageEvidenceCaveat: string | null = null;

  if (score == null || !Number.isFinite(score)) {
    pageEvidenceValid = false;
    pageEvidenceCaveat = 'overallScore fehlt';
    blockers.push('overallScore fehlt');
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
  const scorePassed = pageEvidenceValid && typeof score === 'number' && score >= threshold;

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

  const qualityPassed = scorePassed && issueGatePassed;
  // Terminal: fail at earliest gate
  let terminalKind: CollectionVerdict['terminalKind'];
  let terminalNodeId: string | null;
  if (!scorePassed) {
    terminalKind = 'abandon';
    terminalNodeId = 'n-abandon';
  } else if (hasIssueGate && !issueGatePassed) {
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
    criticalCount,
    issueCount,
    qualityPassed,
    collectionReady,
    hasJourneySegment,
    hasIssueGate,
    overallScore: score,
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
      scorePassed,
      issueGatePassed,
      criticalCount,
      overallScore: score,
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

/** Paint node states after a run from the derived verdict (+ optional lastRun). */
export function nodeStatesFromVerdict(
  doc: CollectionTestFlowDocument,
  verdict: CollectionVerdict,
  lastRun?: CollectionFlowLastRun | null
): Record<string, CollectionFlowNodeRunState> {
  const states: Record<string, CollectionFlowNodeRunState> = {};
  for (const n of doc.nodes) states[n.id] = 'idle';

  if (verdict.status === 'pending') return states;

  const mark = (id: string, s: CollectionFlowNodeRunState) => {
    if (states[id] !== undefined) states[id] = s;
  };

  const hasJourney = documentHasJourneySegment(doc);
  mark('n-start', 'done');

  if (verdict.status === 'running') {
    if (hasJourney && !lastRun?.audionJobId) {
      mark('n-journey', 'running');
    } else if (hasJourney) {
      mark('n-journey', 'done');
      mark('n-scan', 'running');
    } else {
      mark('n-scan', 'running');
    }
    return states;
  }

  if (verdict.status === 'error') {
    if (hasJourney && !lastRun?.scanId && !verdict.pageEvidenceValid) {
      // Journey failed before / without a completed scan handoff
      if (lastRun?.audionJobId && verdict.taskCompleted) {
        mark('n-journey', 'done');
        mark('n-scan', 'error');
      } else if (lastRun?.audionJobId) {
        mark('n-journey', 'error');
        mark('n-scan', 'skipped');
      } else {
        mark('n-journey', 'error');
        mark('n-scan', 'skipped');
      }
    } else {
      if (hasJourney) mark('n-journey', 'done');
      mark('n-scan', 'error');
    }
    mark('n-score', 'skipped');
    mark('n-issues', 'skipped');
    mark('n-ok', 'skipped');
    mark('n-abandon', 'skipped');
    return states;
  }

  if (hasJourney) mark('n-journey', 'done');
  mark('n-scan', 'done');
  mark('n-score', 'done');

  const hasIssues = documentHasIssueGate(doc);
  if (!verdict.scorePassed) {
    if (hasIssues) mark('n-issues', 'skipped');
    mark('n-ok', 'skipped');
    mark('n-abandon', 'done');
    return states;
  }

  if (hasIssues) {
    mark('n-issues', 'done');
  }

  if (verdict.terminalKind === 'quality_ok') {
    mark('n-ok', 'done');
    mark('n-abandon', 'skipped');
  } else {
    mark('n-ok', 'skipped');
    mark('n-abandon', 'done');
  }
  return states;
}
