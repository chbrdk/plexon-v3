/**
 * Async worker for Wave 15 webhook/service triggers.
 * Fire-and-forget after 202 — does not depend on the HTTP request lifetime.
 */

import { executeCollectionFlowRun } from '@/lib/collection-flow-execute';
import { ensureFlowDocument } from '@/lib/collection-test-flow';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import {
  getCollectionFlowRun,
  patchCollectionFlowRun,
} from '@/lib/db/collection-flow-runs';

async function postCallback(
  callbackUrl: string,
  payload: Record<string, unknown>
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return `ok:${res.status}`;
      if (attempt === 1) return `error:${res.status}`;
    } catch (e) {
      if (attempt === 1) {
        return `error:${e instanceof Error ? e.message : 'callback failed'}`;
      }
    }
  }
  return 'error:unknown';
}

export async function processCollectionFlowRun(input: {
  platformProjectId: string;
  flowId: string;
  runId: string;
}): Promise<void> {
  const run = await getCollectionFlowRun(input.platformProjectId, input.flowId, input.runId);
  if (!run) return;

  await patchCollectionFlowRun({ runId: input.runId, status: 'running' });

  const row = await getCollectionTestFlow(input.platformProjectId, input.flowId);
  if (!row) {
    await patchCollectionFlowRun({
      runId: input.runId,
      status: 'error',
      error: 'Flow not found',
    });
    return;
  }

  const doc = ensureFlowDocument(row.flow);
  const requestBody = (run.request as Record<string, unknown> | null) ?? {};
  const result = await executeCollectionFlowRun({
    platformProjectId: input.platformProjectId,
    flowId: input.flowId,
    flowName: row.name,
    doc,
    body: requestBody,
    updatedByUserId: null,
  });

  if (!result.ok) {
    await patchCollectionFlowRun({
      runId: input.runId,
      status: 'error',
      error: result.message,
    });
    return;
  }

  await patchCollectionFlowRun({
    runId: input.runId,
    status: 'complete',
    verdict: result.verdict,
    lastRun: result.lastRun,
    error: null,
  });

  if (run.callbackUrl) {
    const callbackStatus = await postCallback(run.callbackUrl, {
      runId: input.runId,
      flowId: input.flowId,
      platformProjectId: input.platformProjectId,
      verdict: result.verdict,
      lastRun: result.lastRun,
    });
    await patchCollectionFlowRun({ runId: input.runId, callbackStatus });
  }
}

/** Schedule worker without blocking the HTTP response. */
export function enqueueCollectionFlowRun(input: {
  platformProjectId: string;
  flowId: string;
  runId: string;
}): void {
  void processCollectionFlowRun(input).catch((e) => {
    console.error('[PLEXON] collection flow run worker:', e);
    void patchCollectionFlowRun({
      runId: input.runId,
      status: 'error',
      error: e instanceof Error ? e.message : 'Worker failed',
    });
  });
}
