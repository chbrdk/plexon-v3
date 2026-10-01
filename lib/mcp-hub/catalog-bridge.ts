/**
 * Hub → Capability Catalog Agent bridge (Wave H4).
 * Spec: specs/domain/mcp-hub-collection-scope.md
 */

import type { CapabilityId } from '@/lib/capabilities/types';
import { listHubCapabilityMappings } from '@/lib/mcp-hub/store';

let cache: { expiresAt: number; map: Map<string, string> } | null = null;
const TTL_MS = 60_000;

/** Default mappings when Admin has not set capabilityId yet (Canva pilot). */
export const DEFAULT_HUB_CAPABILITY_BY_EXPOSED: Record<string, CapabilityId> = {
  canva_brand_templates_list: 'hub.canva.templates',
  canva_design_open_url: 'hub.canva.open',
  canva_design_export: 'hub.canva.export',
  canva_design_autofill: 'hub.canva.autofill',
};

export function invalidateHubCapabilityMapCache(): void {
  cache = null;
}

export async function getHubExposedCapabilityMap(): Promise<Map<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;
  const map = new Map<string, string>(Object.entries(DEFAULT_HUB_CAPABILITY_BY_EXPOSED));
  try {
    const rows = await listHubCapabilityMappings();
    for (const row of rows) {
      map.set(row.exposedName, row.capabilityId);
    }
  } catch {
    /* DB unavailable — keep defaults */
  }
  cache = { expiresAt: Date.now() + TTL_MS, map };
  return map;
}

/** Sync lookup against last cache (may be empty); prefer async get for accuracy. */
export function capabilityIdFromHubToolSync(toolName: string): string | null {
  const name = toolName.trim();
  if (!name) return null;
  if (cache?.map.has(name)) return cache.map.get(name) ?? null;
  return DEFAULT_HUB_CAPABILITY_BY_EXPOSED[name] ?? null;
}

export async function capabilityIdFromHubTool(toolName: string): Promise<string | null> {
  const map = await getHubExposedCapabilityMap();
  return map.get(toolName.trim()) ?? null;
}
