/**
 * Agent surface adapter — map MCP tool / intent → capability id.
 * @see specs/domain/capability-catalog.md
 */

import { listAgentCapabilities } from '@/lib/capabilities/catalog';
import type { CapabilityId, CapabilityRecord } from '@/lib/capabilities/types';

export function capabilityIdFromAgentTool(toolName: string): CapabilityId | null {
  const name = toolName.trim();
  if (!name) return null;
  for (const c of listAgentCapabilities()) {
    if (c.agent?.toolNames.includes(name)) return c.id;
  }
  return null;
}

export function capabilityIdFromAgentIntent(intentType: string): CapabilityId | null {
  const t = intentType.trim();
  if (!t) return null;
  for (const c of listAgentCapabilities()) {
    if (c.agent?.intentTypes.includes(t)) return c.id;
  }
  return null;
}

export function resolveAgentCapability(input: {
  toolName?: string | null;
  intentType?: string | null;
}): CapabilityRecord | null {
  const fromTool = input.toolName ? capabilityIdFromAgentTool(input.toolName) : null;
  const fromIntent = input.intentType ? capabilityIdFromAgentIntent(input.intentType) : null;
  const id = fromTool ?? fromIntent;
  if (!id) return null;
  return listAgentCapabilities().find((c) => c.id === id) ?? null;
}
