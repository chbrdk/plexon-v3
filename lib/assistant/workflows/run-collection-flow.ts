/**
 * Run an existing Collection Flow from the Assistant (Wave C2).
 * Sync execute like UI Testen; persists `collection_flow_runs` with trigger `assistant`.
 * @see specs/domain/capability-catalog.md
 */

import { ensureFlowDocument } from '@/lib/collection-test-flow';
import { executeCollectionFlowRun } from '@/lib/collection-flow-execute';
import { pathPlatformProjectFlow } from '@/lib/constants';
import {
  closedUiRunRequest,
  createCollectionFlowRun,
  patchCollectionFlowRun,
} from '@/lib/db/collection-flow-runs';
import {
  getCollectionTestFlow,
  listCollectionTestFlows,
  type CollectionTestFlowRow,
} from '@/lib/db/collection-test-flows';
import type { CollectionVerdict, CollectionFlowLastRun } from '@/lib/collection-test-flow';

export type AssistantFlowListItem = {
  id: string;
  name: string;
  templateId: string | null;
};

export type RunCollectionFlowSuccess = {
  ok: true;
  flowId: string;
  flowName: string;
  historyRunId: string;
  boardPath: string;
  verdict: CollectionVerdict;
  lastRun: CollectionFlowLastRun;
  status: 'complete' | 'awaiting_input' | 'error';
};

export type RunCollectionFlowFailure = {
  ok: false;
  error: string;
  flows?: AssistantFlowListItem[];
};

function toListItem(row: CollectionTestFlowRow): AssistantFlowListItem {
  return { id: row.id, name: row.name, templateId: row.templateId };
}

export async function listAssistantCollectionFlows(
  platformProjectId: string
): Promise<AssistantFlowListItem[]> {
  const rows = await listCollectionTestFlows(platformProjectId);
  return rows.map(toListItem);
}

export function resolveFlowRow(input: {
  rows: CollectionTestFlowRow[];
  flowId?: string | null;
  flowName?: string | null;
}): CollectionTestFlowRow | null {
  const id = input.flowId?.trim();
  if (id) {
    return input.rows.find((r) => r.id === id) ?? null;
  }
  const name = input.flowName?.trim().toLowerCase();
  if (!name) return null;
  const exact = input.rows.find((r) => r.name.trim().toLowerCase() === name);
  if (exact) return exact;
  const partial = input.rows.filter((r) => r.name.trim().toLowerCase().includes(name));
  return partial.length === 1 ? partial[0] : null;
}

export async function runCollectionFlowFromAssistant(input: {
  platformProjectId: string;
  flowId?: string | null;
  flowName?: string | null;
  url?: string | null;
  companyName?: string | null;
  updatedByUserId?: string | null;
}): Promise<RunCollectionFlowSuccess | RunCollectionFlowFailure> {
  const platformProjectId = input.platformProjectId.trim();
  if (!platformProjectId) {
    return { ok: false, error: 'Collection (platformProjectId) fehlt' };
  }

  const rows = await listCollectionTestFlows(platformProjectId);
  if (!rows.length) {
    return {
      ok: false,
      error: 'Keine Collection Flows in diesem Projekt. Lege einen Flow im Board an.',
      flows: [],
    };
  }

  const row = resolveFlowRow({
    rows,
    flowId: input.flowId,
    flowName: input.flowName,
  });

  if (!row) {
    return {
      ok: false,
      error: input.flowId || input.flowName
        ? 'Flow nicht gefunden. Wähle einen Flow aus der Liste.'
        : 'Welchen Flow soll ich starten?',
      flows: rows.map(toListItem),
    };
  }

  const doc = ensureFlowDocument(row.flow);
  const body: Record<string, unknown> = {};
  if (input.url?.trim()) body.url = input.url.trim();
  if (input.companyName?.trim()) body.companyName = input.companyName.trim();

  const created = await createCollectionFlowRun({
    flowId: row.id,
    platformProjectId,
    trigger: 'assistant',
    status: 'running',
    request: closedUiRunRequest(body),
  });

  const result = await executeCollectionFlowRun({
    platformProjectId,
    flowId: row.id,
    flowName: row.name,
    doc,
    body: { ...body, historyRunId: created.id },
    updatedByUserId: input.updatedByUserId ?? null,
  });

  if (!result.ok) {
    await patchCollectionFlowRun({
      runId: created.id,
      status: 'error',
      error: result.message,
    });
    return { ok: false, error: result.message, flows: rows.map(toListItem) };
  }

  const status =
    result.lastRun.status === 'awaiting_input'
      ? 'awaiting_input'
      : result.verdict.status === 'error' || result.lastRun.status === 'error'
        ? 'error'
        : 'complete';

  await patchCollectionFlowRun({
    runId: created.id,
    status,
    verdict: result.verdict,
    lastRun: result.lastRun,
    error: result.lastRun.error ?? null,
  });

  return {
    ok: true,
    flowId: row.id,
    flowName: row.name,
    historyRunId: created.id,
    boardPath: pathPlatformProjectFlow(platformProjectId, row.id),
    verdict: result.verdict,
    lastRun: result.lastRun,
    status,
  };
}
