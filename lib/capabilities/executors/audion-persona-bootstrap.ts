/**
 * Shared `audion.persona_bootstrap` capability (Wave C4).
 * Agent + simple Flow use `runPersonaBootstrap`. EQC keeps richer persona+GEO step
 * but shares `buildPersonaCatalogBundle` for catalog writes.
 * @see specs/domain/capability-catalog.md
 */

import { listPersonasFromPreview } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import { buildPersonaCatalogBundle } from '@/lib/collection-flow-run-context';
import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { runPersonaBootstrap } from '@/lib/integrations/audion-persona-bootstrap-client';

export type AudionPersonaBootstrapPayload = {
  variant: 'agent' | 'flow';
  preview: PersonaBootstrapPreview;
};

export const executeAudionPersonaBootstrap: CapabilityExecutor = async (input, ctx) =>
  executeAudionPersonaBootstrapCapability(input, ctx);

export async function executeAudionPersonaBootstrapCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult & { agentPayload?: AudionPersonaBootstrapPayload }> {
  const projectName =
    (typeof input.projectName === 'string' && input.projectName.trim()) ||
    (typeof input.companyName === 'string' && input.companyName.trim()) ||
    (typeof input.name === 'string' && input.name.trim()) ||
    '';
  const targetGroupName =
    (typeof input.targetGroupName === 'string' && input.targetGroupName.trim()) ||
    projectName;

  const result = await runPersonaBootstrap({
    projectName: projectName || undefined,
    targetGroupName: targetGroupName || undefined,
    existingAudionProjectId: ctx.audionProjectId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, catalogRoot: 'persona' };
  }

  const preview = result.preview;
  const personas = listPersonasFromPreview(preview);
  const primary = personas[0];
  const catalogBundle = buildPersonaCatalogBundle({
    id: primary?.id ?? null,
    name: primary?.name ?? preview.projectName ?? null,
    segment: primary?.segment ?? null,
    count: personas.length || 1,
    personas: personas.map((p) => ({
      id: p.id,
      name: p.name,
      segment: p.segment,
      confidence: p.confidence,
      headline: p.headline,
      ...(p.profile ? { profile: p.profile } : {}),
      ...(p.targetGroupId ? { targetGroupId: p.targetGroupId } : {}),
      ...(p.targetGroupName ? { targetGroupName: p.targetGroupName } : {}),
    })),
    targetGroups: preview.targetGroups?.map((g) => ({
      id: g.id,
      name: g.name,
      segment: g.segment,
    })),
  });

  return {
    ok: true,
    catalogRoot: 'persona',
    catalogBundle,
    agentPayload: { variant: ctx.source, preview },
  };
}
