/**
 * Promote chat capability traces → Flow draft or Playbook recipe (Wave C3).
 * @see specs/domain/capability-catalog.md
 */

import { getCapability } from '@/lib/capabilities/catalog';
import type {
  PromoteRejectCode,
  PromoteTraceStep,
} from '@/lib/capabilities/types';
import { extractUrlFromText } from '@/lib/assistant/conversation-context';
import { pathPlatformProjectFlow } from '@/lib/constants';
import {
  COLLECTION_FLOW_SCHEMA_VERSION,
  DEFAULT_SCORE_GATE_THRESHOLD,
  type CollectionFlowEdge,
  type CollectionFlowNode,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import { validateCollectionFlowForRun } from '@/lib/collection-flow-validate';
import {
  createCollectionTestFlow,
  toCollectionTestFlowResponse,
  type CollectionTestFlowResponse,
} from '@/lib/db/collection-test-flows';

export const COLLECTION_FLOW_TEMPLATE_ASSISTANT_PROMOTE = 'assistant-promote-v1' as const;

export type PromoteClassification =
  | {
      ok: true;
      target: 'flow' | 'playbook';
      flowCapabilityIds: string[];
      exploreCapabilityIds: string[];
    }
  | {
      ok: false;
      code: PromoteRejectCode;
      message: string;
    };

export type PromoteFlowPreview = {
  target: 'flow';
  name: string;
  nodeLabels: string[];
  capabilityIds: string[];
  exploreCapabilityIds: string[];
  doc: CollectionTestFlowDocument;
};

export type PromotePlaybookRecipe = {
  target: 'playbook';
  title: string;
  prompt: string;
  exploreCapabilityIds: string[];
  notes: string;
};

const WORKFLOW_TO_CAPABILITY: Record<string, string> = {
  quick_scan: 'checkion.scan',
  domain_scan: 'checkion.domain_scan',
  geo_analysis: 'checkion.geo_job',
  persona_bootstrap: 'audion.persona_bootstrap',
};

/**
 * Classify a trace without writing. Flow only when ≥1 step has surfaces.flow.
 * Explore-only → playbook (ok with target playbook), not a hard reject — callers choose UX.
 */
export function classifyPromoteTrace(steps: PromoteTraceStep[]): PromoteClassification {
  if (!steps.length) {
    return { ok: false, code: 'empty_trace', message: 'No capability steps to promote' };
  }

  const flowCapabilityIds: string[] = [];
  const exploreCapabilityIds: string[] = [];

  for (const step of steps) {
    const cap = getCapability(step.capabilityId);
    if (!cap) {
      if (isExploreAlias(step.capabilityId)) {
        exploreCapabilityIds.push(step.capabilityId);
        continue;
      }
      return {
        ok: false,
        code: 'unknown_capability',
        message: `Unknown capability: ${step.capabilityId}`,
      };
    }
    if (cap.surfaces.flow) {
      for (const field of cap.inputFields.filter((f) => f.required)) {
        const v = step.inputs?.[field.name];
        if (v === undefined || v === null || v === '') {
          return {
            ok: false,
            code: 'unbound_required_input',
            message: `${cap.id} missing required input: ${field.name}`,
          };
        }
      }
      flowCapabilityIds.push(cap.id);
    } else {
      exploreCapabilityIds.push(cap.id);
    }
  }

  if (flowCapabilityIds.length === 0) {
    if (exploreCapabilityIds.length > 0) {
      return {
        ok: true,
        target: 'playbook',
        flowCapabilityIds: [],
        exploreCapabilityIds,
      };
    }
    return {
      ok: false,
      code: 'explore_only',
      message: 'No flow-capable steps in trace',
    };
  }

  return {
    ok: true,
    target: 'flow',
    flowCapabilityIds,
    exploreCapabilityIds,
  };
}

function isExploreAlias(id: string): boolean {
  return (
    id.startsWith('brandion.tokens') ||
    id.startsWith('brandion.guidelines') ||
    id.startsWith('audion.persona') ||
    id.startsWith('plexon_ui') ||
    id === 'brandion.tokens_list'
  );
}

type HistoryMsg = {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown> | null;
};

/** Map recent assistant workflow metadata (+ explore heuristics) into promote steps. */
export function extractPromoteTraceFromHistory(history: HistoryMsg[]): PromoteTraceStep[] {
  const steps: PromoteTraceStep[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (msg.role !== 'assistant' || !msg.metadata) continue;
    const workflowType =
      typeof msg.metadata.workflowType === 'string' ? msg.metadata.workflowType : '';
    const capId = WORKFLOW_TO_CAPABILITY[workflowType];
    if (!capId || seen.has(`${capId}:${workflowType}`)) continue;

    const priorUser = [...history.slice(0, i)].reverse().find((m) => m.role === 'user');
    const url =
      extractUrlFromText(priorUser?.content ?? '') ||
      extractUrlFromText(msg.content) ||
      undefined;

    const inputs: Record<string, unknown> = {};
    if (url) inputs.url = url;
    if (capId === 'checkion.geo_job' && !inputs.url) {
      // geo can run without url when company/text exists — allow empty optional fields
    }

    // Skip if required url missing for scan/domain — leave for classify to reject
    steps.push({ capabilityId: capId, inputs });
    seen.add(`${capId}:${workflowType}`);
  }

  if (steps.length === 0) {
    return extractExploreHintsFromHistory(history);
  }
  return steps;
}

export function extractExploreHintsFromHistory(history: HistoryMsg[]): PromoteTraceStep[] {
  const text = history
    .slice(-8)
    .map((m) => m.content)
    .join('\n')
    .toLowerCase();
  const steps: PromoteTraceStep[] = [];
  if (/\b(persona|zielgruppe|audience)\b/.test(text)) {
    steps.push({ capabilityId: 'audion.persona.read', inputs: {} });
  }
  if (/\b(farbe|color|token|brandion|guideline|design\s*system|markenfarbe)\b/.test(text)) {
    steps.push({ capabilityId: 'brandion.tokens_list', inputs: {} });
  }
  return steps;
}

function capabilityNodeKind(capabilityId: string): string | null {
  const cap = getCapability(capabilityId);
  return cap?.flow?.nodeKinds[0] ?? null;
}

/**
 * Build a closed Collection Flow document from flow-capable promote steps.
 * Always new graph: start → mapped capability nodes → optional score gate for page scan.
 */
export function buildPromotedFlowDocument(
  steps: PromoteTraceStep[],
  options: { name?: string } = {}
):
  | { ok: true; preview: PromoteFlowPreview }
  | { ok: false; code: PromoteRejectCode; message: string } {
  const classified = classifyPromoteTrace(steps);
  if (!classified.ok) return classified;
  if (classified.target !== 'flow') {
    return {
      ok: false,
      code: 'explore_only',
      message: 'Trace is playbook-only — use buildPlaybookRecipe',
    };
  }

  const flowSteps = steps.filter((s) => classified.flowCapabilityIds.includes(s.capabilityId));
  const url =
    flowSteps.map((s) => (typeof s.inputs?.url === 'string' ? s.inputs.url : '')).find(Boolean) ||
    '';

  const nodes: CollectionFlowNode[] = [];
  const edges: CollectionFlowEdge[] = [];
  let x = 0;
  const startId = 'n-start';
  nodes.push({
    id: startId,
    kind: 'start',
    label: 'Start',
    url: url || undefined,
    position: { x, y: 120 },
  });
  x += 220;
  let prevId = startId;
  let lastScanNodeId: string | null = null;

  for (let i = 0; i < flowSteps.length; i++) {
    const step = flowSteps[i];
    const kind = capabilityNodeKind(step.capabilityId);
    if (!kind) {
      return {
        ok: false,
        code: 'unknown_capability',
        message: `No flow node for ${step.capabilityId}`,
      };
    }
    const id = `n-cap-${i}`;
    const stepUrl = typeof step.inputs?.url === 'string' ? step.inputs.url : url;
    const node: CollectionFlowNode = {
      id,
      kind: kind as CollectionFlowNode['kind'],
      label: getCapability(step.capabilityId)?.title ?? kind,
      position: { x, y: 120 },
    };
    if (kind === 'scan') {
      node.url = stepUrl || '';
      node.scanMode = step.inputs?.scanMode === 'deep' ? 'deep' : 'single';
      lastScanNodeId = id;
    } else if (kind === 'domain_scan') {
      node.url = stepUrl || '';
      node.maxPages = typeof step.inputs?.maxPages === 'number' ? step.inputs.maxPages : 50;
    } else if (kind === 'geo_job') {
      node.url = stepUrl || '';
      if (typeof step.inputs?.companyName === 'string') node.companyName = step.inputs.companyName;
      if (typeof step.inputs?.text === 'string') node.text = step.inputs.text;
    } else if (kind === 'brand_measure') {
      node.adapter = 'fixture';
      node.fixtureId = 'demo-landing-pass';
      if (typeof step.inputs?.guidelineId === 'string') node.guidelineId = step.inputs.guidelineId;
    } else if (kind === 'persona_bootstrap') {
      node.label = 'Persona erstellen';
    }
    nodes.push(node);
    edges.push({
      id: `e-${prevId}-${id}`,
      source: prevId,
      target: id,
      edgeKind: 'then',
    });
    prevId = id;
    x += 220;
  }

  if (lastScanNodeId) {
    const compareId = 'n-score';
    const okId = 'n-ok';
    const abandonId = 'n-abandon';
    nodes.push({
      id: compareId,
      kind: 'compare',
      label: `Score ≥ ${DEFAULT_SCORE_GATE_THRESHOLD}`,
      path: 'scan.overallScore',
      op: 'gte',
      value: DEFAULT_SCORE_GATE_THRESHOLD,
      position: { x, y: 120 },
    });
    nodes.push({
      id: okId,
      kind: 'quality_ok',
      label: 'Quality OK',
      position: { x: x + 240, y: 40 },
    });
    nodes.push({
      id: abandonId,
      kind: 'abandon',
      label: 'Abandon',
      position: { x: x + 240, y: 200 },
    });
    edges.push({
      id: `e-${prevId}-${compareId}`,
      source: prevId,
      target: compareId,
      edgeKind: 'then',
    });
    edges.push({
      id: `e-${compareId}-ok`,
      source: compareId,
      target: okId,
      when: 'pass',
      edgeKind: 'when',
      label: 'pass',
    });
    edges.push({
      id: `e-${compareId}-abandon`,
      source: compareId,
      target: abandonId,
      when: 'fail',
      edgeKind: 'otherwise',
      label: 'fail',
    });
  }

  const doc: CollectionTestFlowDocument = {
    schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
    templateId: COLLECTION_FLOW_TEMPLATE_ASSISTANT_PROMOTE,
    nodes,
    edges,
    journeyFlow: null,
    lastVerdict: null,
    lastRun: null,
  };

  const validation = validateCollectionFlowForRun(doc);
  if (!validation.ok) {
    const first = validation.issues.find((i) => i.level === 'error');
    return {
      ok: false,
      code: 'unbound_required_input',
      message: first?.message ?? 'Promoted flow failed validation',
    };
  }

  const name =
    options.name?.trim() ||
    `Assistent: ${classified.flowCapabilityIds.map((id) => getCapability(id)?.title ?? id).join(' → ')}`;

  return {
    ok: true,
    preview: {
      target: 'flow',
      name,
      nodeLabels: nodes.map((n) => n.label),
      capabilityIds: classified.flowCapabilityIds,
      exploreCapabilityIds: classified.exploreCapabilityIds,
      doc,
    },
  };
}

export function buildPlaybookRecipe(
  steps: PromoteTraceStep[],
  options: { title?: string } = {}
):
  | { ok: true; recipe: PromotePlaybookRecipe }
  | { ok: false; code: PromoteRejectCode; message: string } {
  const classified = classifyPromoteTrace(steps);
  if (!classified.ok) return classified;
  if (classified.target !== 'playbook') {
    return {
      ok: false,
      code: 'explore_only',
      message: 'Trace has flow capabilities — use buildPromotedFlowDocument',
    };
  }

  const labels = classified.exploreCapabilityIds;
  const promptParts: string[] = [];
  if (labels.some((id) => id.startsWith('audion.persona'))) {
    promptParts.push('Wie bewertet Persona XY das Folgende?');
  }
  if (labels.some((id) => id.startsWith('brandion'))) {
    promptParts.push('Welche Farben / Tokens gelten im Brandion-Designsystem für dieses Projekt?');
  }
  const prompt =
    promptParts.join(' ') ||
    'Wiederhole die letzte Marken-/Persona-Recherche für diese Collection.';

  return {
    ok: true,
    recipe: {
      target: 'playbook',
      title: options.title?.trim() || 'Gespeichertes Assistenten-Rezept',
      prompt,
      exploreCapabilityIds: classified.exploreCapabilityIds,
      notes:
        'Explore-only: kein Collection Flow. Als wiederholbaren Chat-Prompt speichern (kein Canvas-Graph).',
    },
  };
}

export async function persistPromotedFlow(input: {
  platformProjectId: string;
  name: string;
  doc: CollectionTestFlowDocument;
  ownerId?: string | null;
}): Promise<{ ok: true; flow: CollectionTestFlowResponse; boardPath: string } | { ok: false; error: string }> {
  try {
    const row = await createCollectionTestFlow({
      platformProjectId: input.platformProjectId,
      name: input.name,
      flow: input.doc,
      templateId: COLLECTION_FLOW_TEMPLATE_ASSISTANT_PROMOTE,
      ownerId: input.ownerId ?? null,
    });
    const flow = toCollectionTestFlowResponse(row);
    return {
      ok: true,
      flow,
      boardPath: pathPlatformProjectFlow(input.platformProjectId, flow.id),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
