/**
 * Capability `plexon.collection_flow.run` (Wave C2).
 * @see specs/domain/capability-catalog.md
 */

import {
  listAssistantCollectionFlows,
  runCollectionFlowFromAssistant,
} from '@/lib/assistant/workflows/run-collection-flow';
import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';

export type CollectionFlowRunAgentPayload =
  | {
      variant: 'list';
      flows: Array<{ id: string; name: string; templateId: string | null }>;
    }
  | {
      variant: 'run';
      flowId: string;
      flowName: string;
      historyRunId: string;
      boardPath: string;
      status: string;
      summary?: string | null;
      collectionReady?: boolean;
      awaitingInput?: boolean;
    };

export const executePlexonCollectionFlowRun: CapabilityExecutor = async (input, ctx) => {
  return executePlexonCollectionFlowRunCapability(input, ctx);
};

export async function executePlexonCollectionFlowRunCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult & { agentPayload?: CollectionFlowRunAgentPayload }> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' && input.platformProjectId.trim()) ||
    (ctx.platformProjectId ?? '').trim();

  if (!platformProjectId) {
    return { ok: false, error: 'Collection (platformProjectId) fehlt' };
  }

  const listOnly = input.listOnly === true;
  const flowId = typeof input.flowId === 'string' ? input.flowId : null;
  const flowName = typeof input.flowName === 'string' ? input.flowName : null;

  if (listOnly || (!flowId && !flowName)) {
    const flows = await listAssistantCollectionFlows(platformProjectId);
    if (!flows.length) {
      return {
        ok: false,
        error: 'Keine Collection Flows in diesem Projekt.',
        agentPayload: { variant: 'list', flows: [] },
      };
    }
    // Listing is a successful read when caller asked to list; otherwise soft-fail for picker UX.
    if (listOnly) {
      return {
        ok: true,
        agentPayload: { variant: 'list', flows },
      };
    }
    return {
      ok: false,
      error: 'Welchen Flow soll ich starten?',
      agentPayload: { variant: 'list', flows },
    };
  }

  const result = await runCollectionFlowFromAssistant({
    platformProjectId,
    flowId,
    flowName,
    url: typeof input.url === 'string' ? input.url : null,
    companyName: typeof input.companyName === 'string' ? input.companyName : null,
    updatedByUserId: typeof input.updatedByUserId === 'string' ? input.updatedByUserId : null,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      agentPayload: result.flows
        ? { variant: 'list', flows: result.flows }
        : undefined,
    };
  }

  return {
    ok: true,
    agentPayload: {
      variant: 'run',
      flowId: result.flowId,
      flowName: result.flowName,
      historyRunId: result.historyRunId,
      boardPath: result.boardPath,
      status: result.status,
      summary: result.verdict.summary ?? null,
      collectionReady: result.verdict.collectionReady,
      awaitingInput: result.status === 'awaiting_input',
    },
  };
}
