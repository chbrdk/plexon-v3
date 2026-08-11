/**
 * Flow surface adapter — map Collection Flow node kind → capability id.
 * Orchestration kinds return null (Flow-only).
 * @see specs/domain/capability-catalog.md
 */

import { listFlowCapabilities } from '@/lib/capabilities/catalog';
import type { CapabilityId, CapabilityRecord } from '@/lib/capabilities/types';

/** Known orchestration / authoring kinds — never Agent tools via catalog. */
export const FLOW_ORCHESTRATION_KINDS = new Set([
  'compare',
  'set',
  'quality_ok',
  'human_confirm',
  'start',
  'prompt',
  'observe',
  'action',
  'gate',
  'message',
  'success',
  'abandon',
  'measure',
  'persona',
  'zielgruppe',
  'guideline',
  'journey',
  'score_gate',
  'issue_gate',
  'geo_gate',
  'research_brief',
  'competitors_suggest',
  'suggest_queries',
]);

export function capabilityIdFromFlowNodeKind(kind: string): CapabilityId | null {
  const k = kind.trim();
  if (!k || FLOW_ORCHESTRATION_KINDS.has(k)) return null;
  for (const c of listFlowCapabilities()) {
    if (c.flow?.nodeKinds.includes(k)) return c.id;
  }
  return null;
}

export function resolveFlowCapability(kind: string): CapabilityRecord | null {
  const id = capabilityIdFromFlowNodeKind(kind);
  if (!id) return null;
  return listFlowCapabilities().find((c) => c.id === id) ?? null;
}
