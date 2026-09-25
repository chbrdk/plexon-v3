/**
 * Capability Catalog → Assistant planner tool allowlist (Wave C5+).
 * When `CAPABILITY_CATALOG_RUNTIME` is on, catalog agent bindings can force-allow
 * or deny MCP tools relative to the plan intent.
 * @see specs/domain/capability-catalog.md § Relation to existing systems
 */

import { listCapabilities } from '@/lib/capabilities/catalog';
import { isCapabilityCatalogRuntimeEnabled } from '@/lib/capabilities/runtime-flag';
import type { CapabilityId, CapabilityRecord } from '@/lib/capabilities/types';

export type CatalogToolGate = 'allow' | 'deny' | 'pass';

function agentToolIndex(): Map<string, CapabilityRecord[]> {
  const map = new Map<string, CapabilityRecord[]>();
  for (const c of listCapabilities()) {
    for (const name of c.agent?.toolNames ?? []) {
      const key = name.trim();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
  }
  return map;
}

let cachedIndex: Map<string, CapabilityRecord[]> | null = null;

function toolIndex(): Map<string, CapabilityRecord[]> {
  if (!cachedIndex) cachedIndex = agentToolIndex();
  return cachedIndex;
}

/** Test helper — drop memo after catalog mutations in-process (rare). */
export function resetCatalogPlannerAllowlistCache(): void {
  cachedIndex = null;
}

export function listCatalogAgentToolNames(): string[] {
  return [...toolIndex().keys()].sort();
}

export function listCatalogAgentIntentTypes(): string[] {
  const out = new Set<string>();
  for (const c of listCapabilities()) {
    if (!c.surfaces.agent) continue;
    for (const intent of c.agent?.intentTypes ?? []) {
      const t = intent.trim();
      if (t) out.add(t);
    }
  }
  return [...out].sort();
}

export function capabilitiesForAgentTool(toolName: string): CapabilityRecord[] {
  return toolIndex().get(toolName.trim()) ?? [];
}

export function capabilitiesForAgentIntent(intent: string): CapabilityRecord[] {
  const t = intent.trim();
  if (!t) return [];
  return listCapabilities().filter(
    (c) => c.surfaces.agent && (c.agent?.intentTypes ?? []).includes(t)
  );
}

/**
 * Catalog gate for a single MCP tool under a planner intent.
 * - deny: capability registers the tool but surfaces.agent is false
 * - allow: agent capability lists the tool and (intent empty OR matches plan)
 * - pass: catalog has no opinion — keep family filter
 */
export function catalogToolGate(
  toolName: string,
  planIntent: string | null | undefined
): CatalogToolGate {
  const caps = capabilitiesForAgentTool(toolName);
  if (!caps.length) return 'pass';

  if (caps.every((c) => !c.surfaces.agent)) return 'deny';

  const agentCaps = caps.filter((c) => c.surfaces.agent);
  const intent = (planIntent ?? '').trim();
  const intentMatched = agentCaps.some((c) => {
    const types = c.agent?.intentTypes ?? [];
    if (!types.length) return true;
    return Boolean(intent && types.includes(intent));
  });

  return intentMatched ? 'allow' : 'pass';
}

/**
 * When runtime is on: force-allow catalog tools for the plan intent (even if family
 * regex would miss), and deny tools registered only on agent:false capabilities.
 * Returns null when the catalog has no override → caller uses family filter.
 */
export function catalogPlannerToolOverride(
  toolName: string,
  planIntent: string | null | undefined,
  options?: { runtimeEnabled?: boolean }
): boolean | null {
  const enabled =
    options?.runtimeEnabled ?? isCapabilityCatalogRuntimeEnabled();
  if (!enabled) return null;

  const gate = catalogToolGate(toolName, planIntent);
  if (gate === 'deny') return false;
  if (gate === 'allow') return true;
  return null;
}

export function catalogCapabilityIdsForIntent(intent: string): CapabilityId[] {
  return capabilitiesForAgentIntent(intent).map((c) => c.id);
}
