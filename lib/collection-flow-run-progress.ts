/**
 * Heuristic weight-based map of AUDION journey job progress → run states / outputs / inspector
 * data for the embedded journey subgraph on a Collection Test Flow (Wave 6).
 * Simplified port of Audion `ux-flow-run-progress.ts` (no branch/replan resolution, no dual-run).
 * @see specs/domain/collection-test-flow.md — Wave 5–7 implementation notes
 */

import type { EmbeddedAudionJourneyFlow } from './collection-test-flow';

export type FlowNodeRunState = 'idle' | 'active' | 'done' | 'skipped' | 'error';

/** Live agent output attached to a flow node during Testen. */
export type FlowNodeRunOutput = {
  step?: number | null;
  label?: string | null;
  text?: string | null;
  imageUrl?: string | null;
};

export type FlowNodeInspectorStep = {
  step?: number | null;
  action?: string | null;
  target?: string | null;
  result?: string | null;
  reasoning?: string | null;
  timestamp?: string | null;
  imageUrl?: string | null;
};

export type FlowNodeInspectorData = {
  steps: FlowNodeInspectorStep[];
  gateEvaluation?: { matched?: boolean; evidence?: string | null; condition?: string | null } | null;
};

export type FlowJobRunSummary = {
  jobId?: string | null;
  status?: string;
  success?: boolean | null;
  stepCount: number;
  elapsedSeconds?: number | null;
  finalUrl?: string | null;
  error?: string | null;
};

export type FlowRunProgressStep = {
  step?: number;
  action?: string;
  target?: string;
  result?: string;
  reasoning?: string | null;
  timestamp?: string | null;
  screenshot?: string | null;
  screenshotUrl?: string | null;
};

export type FlowRunProgressInput = {
  status: 'running' | 'complete' | 'error' | string;
  steps?: FlowRunProgressStep[] | null;
  finalUrl?: string | null;
  success?: boolean | null;
  error?: string | null;
  /** Job id for rewriting relative screenshot paths. */
  jobId?: string | null;
  gateSignals?: Record<string, unknown> | null;
};

type JourneyNode = EmbeddedAudionJourneyFlow['nodes'][number];
type JourneyEdge = EmbeddedAudionJourneyFlow['edges'][number];

function nodeWeight(kind: string): number {
  switch (kind) {
    case 'start':
      return 0;
    case 'observe':
    case 'action':
      return 2;
    case 'gate':
    case 'prompt':
    case 'message':
    case 'measure':
      return 1;
    case 'success':
    case 'abandon':
      return 1;
    default:
      return 1;
  }
}

/**
 * Linear default path: start at `start` (or the first node) and follow the first
 * `then`/`when` outgoing edge at each step. No branch/replan resolution (MVP heuristic).
 */
export function defaultJourneyPath(flow: EmbeddedAudionJourneyFlow): JourneyNode[] {
  const nodes = flow.nodes ?? [];
  if (!nodes.length) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, JourneyEdge[]>();
  for (const e of flow.edges ?? []) {
    const list = outgoing.get(e.from) ?? [];
    list.push(e);
    outgoing.set(e.from, list);
  }
  const start = nodes.find((n) => n.kind === 'start') ?? nodes[0];
  const path: JourneyNode[] = [start];
  const visited = new Set([start.id]);
  let current = start;
  while (path.length <= nodes.length) {
    const outs = outgoing.get(current.id) ?? [];
    const next = outs.find((e) => e.kind === 'then') ?? outs.find((e) => e.kind === 'when') ?? outs[0];
    if (!next) break;
    const nextNode = byId.get(next.to);
    if (!nextNode || visited.has(nextNode.id)) break;
    path.push(nextNode);
    visited.add(nextNode.id);
    current = nextNode;
  }
  return path;
}

function cursorIndex(path: JourneyNode[], stepCount: number): number {
  if (!path.length) return 0;
  if (stepCount <= 0) return 0;
  let budget = stepCount;
  for (let i = 0; i < path.length; i++) {
    const w = Math.max(1, nodeWeight(path[i].kind));
    if (i === 0 && path[i].kind === 'start') continue;
    if (budget < w) return i;
    budget -= w;
  }
  return path.length - 1;
}

/** Map agent job snapshot to per-node run states for canvas highlighting (Wave 6). */
export function mapJobToFlowNodeStates(
  flow: EmbeddedAudionJourneyFlow,
  job: FlowRunProgressInput
): Record<string, FlowNodeRunState> {
  const nodes = flow.nodes ?? [];
  const states: Record<string, FlowNodeRunState> = {};
  for (const n of nodes) states[n.id] = 'idle';
  if (!nodes.length) return states;

  const path = defaultJourneyPath(flow);
  if (!path.length) return states;
  const steps = job.steps ?? [];

  if (job.status === 'error') {
    const idx = cursorIndex(path, steps.length);
    for (let i = 0; i < idx; i++) states[path[i].id] = 'done';
    states[path[idx].id] = 'error';
    return states;
  }

  if (job.status === 'complete') {
    const ok = job.success === true;
    for (const n of path) {
      if (n.kind === 'success') states[n.id] = ok ? 'done' : 'skipped';
      else if (n.kind === 'abandon') states[n.id] = ok ? 'skipped' : 'done';
      else states[n.id] = 'done';
    }
    return states;
  }

  // running
  const idx = cursorIndex(path, steps.length);
  for (let i = 0; i < idx; i++) states[path[i].id] = 'done';
  states[path[idx].id] = 'active';
  return states;
}

function rewriteScreenshotUrl(
  url: string | null | undefined,
  jobId?: string | null,
  stepNum?: number | null
): string | null {
  if (url?.trim()) {
    const raw = url.trim();
    if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (raw.startsWith('/api/')) return raw;
    if (raw.startsWith('/run/')) return `/api/ux-journey-agent${raw}`;
    return raw;
  }
  if (jobId && stepNum != null && stepNum > 0) {
    return `/api/ux-journey-agent/run/${encodeURIComponent(jobId)}/step/${stepNum}/screenshot`;
  }
  return null;
}

function stepHeadline(step: FlowRunProgressStep): string {
  const action = step.action?.trim();
  const target = step.target?.trim();
  if (action && target) return `${action}: ${target.slice(0, 80)}`;
  if (action) return action;
  if (target) return target.slice(0, 100);
  return `Step ${step.step ?? '?'}`;
}

function stepBodyText(step: FlowRunProgressStep): string | null {
  const parts: string[] = [];
  if (step.result?.trim()) parts.push(step.result.trim());
  if (step.reasoning?.trim()) parts.push(step.reasoning.trim());
  if (!parts.length) return null;
  const joined = parts.join('\n');
  return joined.length > 420 ? `${joined.slice(0, 419)}…` : joined;
}

/** Attach the latest agent step text/image to nodes along the default path (Wave 6). */
export function mapJobToFlowNodeOutputs(
  flow: EmbeddedAudionJourneyFlow,
  job: FlowRunProgressInput
): Record<string, FlowNodeRunOutput> {
  const out: Record<string, FlowNodeRunOutput> = {};
  const steps = job.steps ?? [];
  if (!steps.length) return out;

  const path = defaultJourneyPath(flow);
  if (!path.length) return out;

  const states = mapJobToFlowNodeStates(flow, job);
  const activeId = Object.entries(states).find(([, s]) => s === 'active' || s === 'error')?.[0] ?? null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const ordinal = i + 1;
    const idx = cursorIndex(path, ordinal);
    const node = path[idx];
    if (!node) continue;
    const stepNum = step.step ?? ordinal;
    out[node.id] = {
      step: stepNum,
      label: stepHeadline(step),
      text: stepBodyText(step),
      imageUrl: rewriteScreenshotUrl(step.screenshotUrl ?? step.screenshot, job.jobId, stepNum),
    };
  }

  if (activeId && steps.length) {
    const last = steps[steps.length - 1];
    const stepNum = last.step ?? steps.length;
    out[activeId] = {
      step: stepNum,
      label: stepHeadline(last),
      text: stepBodyText(last),
      imageUrl: rewriteScreenshotUrl(last.screenshotUrl ?? last.screenshot, job.jobId, stepNum),
    };
  }

  return out;
}

/** Map every agent step per flow node for the inspector panel (not just latest). */
export function mapJobToFlowNodeInspector(
  flow: EmbeddedAudionJourneyFlow,
  job: FlowRunProgressInput
): Record<string, FlowNodeInspectorData> {
  const out: Record<string, FlowNodeInspectorData> = {};
  const steps = job.steps ?? [];
  if (!steps.length) return out;

  const path = defaultJourneyPath(flow);
  if (!path.length) return out;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const ordinal = i + 1;
    const idx = cursorIndex(path, ordinal);
    const node = path[idx];
    if (!node) continue;
    const stepNum = step.step ?? ordinal;
    if (!out[node.id]) out[node.id] = { steps: [], gateEvaluation: null };
    out[node.id].steps.push({
      step: stepNum,
      action: step.action ?? null,
      target: step.target ?? null,
      result: step.result ?? null,
      reasoning: step.reasoning ?? null,
      timestamp: step.timestamp ?? null,
      imageUrl: rewriteScreenshotUrl(step.screenshotUrl ?? step.screenshot, job.jobId, stepNum),
    });
  }

  for (const n of flow.nodes ?? []) {
    if (n.kind !== 'gate') continue;
    const gate = job.gateSignals;
    if (!out[n.id]) out[n.id] = { steps: [], gateEvaluation: null };
    out[n.id].gateEvaluation = gate
      ? { matched: Boolean(gate.goalReached), evidence: null, condition: null }
      : null;
  }

  return out;
}

/** Job-level metrics for the flow board inspector / run strip. */
export function buildJobRunSummary(job: FlowRunProgressInput): FlowJobRunSummary {
  const steps = job.steps ?? [];
  const stamps = steps
    .map((s) => (s.timestamp ? Date.parse(s.timestamp) : NaN))
    .filter((t) => !Number.isNaN(t));
  const elapsedSeconds =
    stamps.length >= 2 ? Math.max(0, (Math.max(...stamps) - Math.min(...stamps)) / 1000) : null;
  return {
    jobId: job.jobId ?? null,
    status: job.status,
    success: job.success ?? null,
    stepCount: steps.length,
    elapsedSeconds,
    finalUrl: job.finalUrl ?? null,
    error: job.error ?? null,
  };
}
