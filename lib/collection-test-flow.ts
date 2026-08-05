/**
 * Collection Test Flow — quality-path domain types + verdict (Wave 1).
 * Spec: specs/domain/collection-test-flow.md
 */

export const COLLECTION_FLOW_SCHEMA_VERSION = '2026-08-collection-flow-v1' as const;

export const COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY = 'page-quality' as const;

export const COLLECTION_FLOW_NODE_KINDS = [
  'start',
  'scan',
  'score_gate',
  'quality_ok',
  'abandon',
] as const;

export type CollectionFlowNodeKind = (typeof COLLECTION_FLOW_NODE_KINDS)[number];

export type CollectionFlowGateCondition = 'score_at_least';

export type CollectionFlowNode = {
  id: string;
  kind: CollectionFlowNodeKind;
  label: string;
  /** Absolute or relative page URL for `scan` nodes. */
  url?: string;
  /** Score threshold for `score_gate` + `score_at_least` (default 70). */
  threshold?: number;
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

export type CollectionFlowLastRun = {
  startedAt: string;
  completedAt: string | null;
  scanId: string | null;
  url: string;
  status: string;
  overallScore: number | null;
  error?: string | null;
};

export type CollectionVerdict = {
  status: 'pending' | 'running' | 'complete' | 'error';
  flowCompleted: boolean;
  terminalKind: 'quality_ok' | 'abandon' | null;
  terminalNodeId: string | null;
  pageEvidenceValid: boolean;
  pageEvidenceCaveat: string | null;
  qualityPassed: boolean;
  /** Wave 1 quality-only: ready when flow completed ∧ evidence valid ∧ quality passed. */
  collectionReady: boolean;
  overallScore: number | null;
  threshold: number;
  blockers: string[];
  summary: string;
};

export type CollectionTestFlowDocument = {
  schemaVersion: typeof COLLECTION_FLOW_SCHEMA_VERSION;
  templateId: typeof COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY | string;
  nodes: CollectionFlowNode[];
  edges: CollectionFlowEdge[];
  lastVerdict?: CollectionVerdict | null;
  lastRun?: CollectionFlowLastRun | null;
};

export const DEFAULT_SCORE_GATE_THRESHOLD = 70;

export function createPageQualityTemplate(url: string): CollectionTestFlowDocument {
  const pageUrl = url.trim() || 'https://example.com';
  const nodes: CollectionFlowNode[] = [
    { id: 'n-start', kind: 'start', label: 'Start', position: { x: 0, y: 120 } },
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

function buildSummary(input: {
  status: CollectionVerdict['status'];
  flowCompleted: boolean;
  pageEvidenceValid: boolean;
  qualityPassed: boolean;
  collectionReady: boolean;
  overallScore: number | null;
  threshold: number;
  terminalKind: CollectionVerdict['terminalKind'];
}): string {
  if (input.status === 'running') return 'Läuft — Scan/Score werden ausgewertet.';
  if (input.status === 'error') return 'Fehler — Flow nicht abgeschlossen.';
  if (input.status === 'pending') return 'Noch kein Lauf.';
  if (input.collectionReady) {
    return `Collection bereit — Score ${input.overallScore ?? '—'} ≥ ${input.threshold}.`;
  }
  if (!input.pageEvidenceValid) {
    return 'Page-Evidence ungültig oder Scan blockiert — Collection nicht bereit.';
  }
  if (input.terminalKind === 'abandon') {
    return `Quality Gate verfehlt — Score ${input.overallScore ?? '—'} < ${input.threshold}.`;
  }
  if (input.flowCompleted && !input.qualityPassed) {
    return 'Flow beendet ohne Quality-Pass.';
  }
  return 'Run beendet — Collection nicht bereit.';
}

/**
 * Derive Collection verdict from a finished (or failed) CHECKION single-page scan.
 * Wave 1: no journey segment — `collectionReady` = evidence ∧ quality pass.
 */
export function deriveCollectionVerdict(input: {
  scanStatus: string;
  overallScore: number | null;
  threshold?: number;
  blockers?: string[];
}): CollectionVerdict {
  const threshold = input.threshold ?? DEFAULT_SCORE_GATE_THRESHOLD;
  const blockers = [...(input.blockers ?? [])];
  const statusRaw = input.scanStatus.trim().toLowerCase();

  if (statusRaw === 'queued' || statusRaw === 'running' || statusRaw === 'paused') {
    return {
      status: 'running',
      flowCompleted: false,
      terminalKind: null,
      terminalNodeId: null,
      pageEvidenceValid: false,
      pageEvidenceCaveat: null,
      qualityPassed: false,
      collectionReady: false,
      overallScore: input.overallScore,
      threshold,
      blockers,
      summary: buildSummary({
        status: 'running',
        flowCompleted: false,
        pageEvidenceValid: false,
        qualityPassed: false,
        collectionReady: false,
        overallScore: input.overallScore,
        threshold,
        terminalKind: null,
      }),
    };
  }

  if (statusRaw === 'failed' || statusRaw === 'cancelled' || statusRaw === 'cancelling') {
    if (!blockers.length) blockers.push(`Scan status: ${statusRaw}`);
    return {
      status: 'error',
      flowCompleted: false,
      terminalKind: null,
      terminalNodeId: null,
      pageEvidenceValid: false,
      pageEvidenceCaveat: blockers[0] ?? 'Scan fehlgeschlagen',
      qualityPassed: false,
      collectionReady: false,
      overallScore: input.overallScore,
      threshold,
      blockers,
      summary: buildSummary({
        status: 'error',
        flowCompleted: false,
        pageEvidenceValid: false,
        qualityPassed: false,
        collectionReady: false,
        overallScore: input.overallScore,
        threshold,
        terminalKind: null,
      }),
    };
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

  const qualityPassed = pageEvidenceValid && typeof score === 'number' && score >= threshold;
  const terminalKind: CollectionVerdict['terminalKind'] = qualityPassed ? 'quality_ok' : 'abandon';
  const terminalNodeId = qualityPassed ? 'n-ok' : 'n-abandon';
  const flowCompleted = true;
  const collectionReady = flowCompleted && pageEvidenceValid && qualityPassed;

  return {
    status: 'complete',
    flowCompleted,
    terminalKind,
    terminalNodeId,
    pageEvidenceValid,
    pageEvidenceCaveat,
    qualityPassed,
    collectionReady,
    overallScore: score,
    threshold,
    blockers,
    summary: buildSummary({
      status: 'complete',
      flowCompleted,
      pageEvidenceValid,
      qualityPassed,
      collectionReady,
      overallScore: score,
      threshold,
      terminalKind,
    }),
  };
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
    templateId: typeof doc.templateId === 'string' ? doc.templateId : COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
    nodes: doc.nodes as CollectionFlowNode[],
    edges: doc.edges as CollectionFlowEdge[],
    lastVerdict: (doc.lastVerdict as CollectionVerdict | null | undefined) ?? null,
    lastRun: (doc.lastRun as CollectionFlowLastRun | null | undefined) ?? null,
  };
}

export type CollectionFlowNodeRunState = 'idle' | 'running' | 'done' | 'error' | 'skipped';

/** Paint node states after a run from the derived verdict. */
export function nodeStatesFromVerdict(
  doc: CollectionTestFlowDocument,
  verdict: CollectionVerdict
): Record<string, CollectionFlowNodeRunState> {
  const states: Record<string, CollectionFlowNodeRunState> = {};
  for (const n of doc.nodes) states[n.id] = 'idle';

  if (verdict.status === 'pending') return states;

  const mark = (id: string, s: CollectionFlowNodeRunState) => {
    if (states[id] !== undefined) states[id] = s;
  };

  mark('n-start', 'done');

  if (verdict.status === 'running') {
    mark('n-scan', 'running');
    return states;
  }

  if (verdict.status === 'error') {
    mark('n-scan', 'error');
    mark('n-score', 'skipped');
    mark('n-ok', 'skipped');
    mark('n-abandon', 'skipped');
    return states;
  }

  mark('n-scan', 'done');
  mark('n-score', 'done');
  if (verdict.terminalKind === 'quality_ok') {
    mark('n-ok', 'done');
    mark('n-abandon', 'skipped');
  } else {
    mark('n-ok', 'skipped');
    mark('n-abandon', 'done');
  }
  return states;
}
