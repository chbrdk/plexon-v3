/**
 * Per-kind I/O port schema for Collection Flow nodes (n8n-like).
 * Handle ids stay stable for edges; labels are what users see.
 * @see specs/domain/collection-test-flow.md — Wave 10 Catalog Port UX
 */

import type { CollectionFlowNodeKind } from '@/lib/collection-test-flow';
import {
  CATALOG_BIND_PATH_HANDLE,
  catalogPortsForActionKind,
  type CatalogPortDef,
} from '@/lib/collection-flow-run-context';

export type NodePortSlot = {
  /** Stable React Flow handle id. */
  handleId: string;
  /** Short UI label (shown on the node). */
  label: string;
  /** One-line hint under/beside the label. */
  hint?: string;
  /** Role for styling / connect rules. */
  role: 'flow' | 'data' | 'branch' | 'catalog';
};

export type NodeIoSchema = {
  inputs: NodePortSlot[];
  /** Control / branch outputs (not catalog field dumps). */
  controlOutputs: NodePortSlot[];
  /** When true, also render catalog field outputs from the closed catalog. */
  catalogOutputs: boolean;
};

const FLOW_IN: NodePortSlot = {
  handleId: 'in',
  label: 'Ablauf',
  hint: 'von vorherigem Schritt',
  role: 'flow',
};

const THEN_OUT: NodePortSlot = {
  handleId: 'then',
  label: 'Weiter',
  hint: 'nächster Schritt',
  role: 'flow',
};

const WHEN_OUT = (passLabel: string): NodePortSlot => ({
  handleId: 'when',
  label: passLabel,
  hint: 'wahr',
  role: 'branch',
});

const OTHERWISE_OUT = (failLabel: string): NodePortSlot => ({
  handleId: 'otherwise',
  label: failLabel,
  hint: 'sonst',
  role: 'branch',
});

const COMPARE_VALUE_IN: NodePortSlot = {
  handleId: CATALOG_BIND_PATH_HANDLE,
  label: 'Wert',
  hint: 'Feld vom Scan / GEO verdrahten',
  role: 'data',
};

/** Closed I/O map — how many input points each kind exposes. */
export const NODE_IO_BY_KIND: Partial<Record<CollectionFlowNodeKind, NodeIoSchema>> = {
  start: { inputs: [], controlOutputs: [THEN_OUT], catalogOutputs: false },
  prompt: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: false },
  observe: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: false },
  action: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: false },
  message: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: false },
  measure: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: false },
  success: { inputs: [FLOW_IN], controlOutputs: [], catalogOutputs: false },
  abandon: { inputs: [FLOW_IN], controlOutputs: [], catalogOutputs: false },
  quality_ok: { inputs: [FLOW_IN], controlOutputs: [], catalogOutputs: false },
  journey: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: false },
  gate: {
    inputs: [FLOW_IN],
    controlOutputs: [WHEN_OUT('Wenn'), OTHERWISE_OUT('Sonst')],
    catalogOutputs: false,
  },
  compare: {
    inputs: [FLOW_IN, COMPARE_VALUE_IN],
    controlOutputs: [WHEN_OUT('Pass'), OTHERWISE_OUT('Fail')],
    catalogOutputs: false,
  },
  score_gate: {
    inputs: [FLOW_IN],
    controlOutputs: [WHEN_OUT('Pass'), OTHERWISE_OUT('Fail')],
    catalogOutputs: false,
  },
  issue_gate: {
    inputs: [FLOW_IN],
    controlOutputs: [WHEN_OUT('Pass'), OTHERWISE_OUT('Fail')],
    catalogOutputs: false,
  },
  geo_gate: {
    inputs: [FLOW_IN],
    controlOutputs: [WHEN_OUT('Pass'), OTHERWISE_OUT('Fail')],
    catalogOutputs: false,
  },
  scan: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: true },
  domain_scan: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: true },
  geo_job: { inputs: [FLOW_IN], controlOutputs: [THEN_OUT], catalogOutputs: true },
};

const DEFAULT_IO: NodeIoSchema = {
  inputs: [FLOW_IN],
  controlOutputs: [THEN_OUT],
  catalogOutputs: false,
};

export function nodeIoSchemaForKind(kind: CollectionFlowNodeKind): NodeIoSchema {
  return NODE_IO_BY_KIND[kind] ?? DEFAULT_IO;
}

export function catalogOutputSlotsForKind(kind: CollectionFlowNodeKind): CatalogPortDef[] {
  const schema = nodeIoSchemaForKind(kind);
  if (!schema.catalogOutputs) return [];
  return catalogPortsForActionKind(kind);
}
