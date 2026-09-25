/**
 * Collection Flow schedule tick (Enterprise E3).
 * Spec: suite-enterprise-program.md § E3
 *
 * Env: PLEXON_FLOW_SCHEDULE_ENABLED (default on when DATABASE_URL set; 0/false/off to disable)
 *      PLEXON_FLOW_SCHEDULE_INTERVAL_MS (default 60000, min 15000)
 */

import { cronMatchesAt, scheduleMinuteKey } from '@/lib/cron-match';
import { enqueueCollectionFlowRun } from '@/lib/collection-flow-run-worker';
import {
  documentHasSchedule,
  ensureFlowDocument,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow';
import { createCollectionFlowRun } from '@/lib/db/collection-flow-runs';
import { listAllCollectionTestFlows, patchCollectionTestFlow } from '@/lib/db/collection-test-flows';

const GLOBAL_KEY = '__plexonFlowScheduleTimer' as const;

type GlobalSched = typeof globalThis & {
  [GLOBAL_KEY]?: ReturnType<typeof setInterval>;
};

function scheduleEnabled(): boolean {
  const raw = process.env.PLEXON_FLOW_SCHEDULE_ENABLED?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  return Boolean(process.env.DATABASE_URL);
}

function intervalMs(): number {
  const raw = Number(process.env.PLEXON_FLOW_SCHEDULE_INTERVAL_MS);
  if (Number.isFinite(raw) && raw >= 15_000) return Math.floor(raw);
  return 60_000;
}

function primaryScheduleNode(doc: CollectionTestFlowDocument) {
  return doc.nodes.find((n) => n.kind === 'schedule') ?? null;
}

function lastFiredKey(doc: CollectionTestFlowDocument): string | null {
  return typeof doc.scheduleMeta?.lastFiredKey === 'string'
    ? doc.scheduleMeta.lastFiredKey
    : null;
}

function withLastFired(
  doc: CollectionTestFlowDocument,
  key: string
): CollectionTestFlowDocument {
  return {
    ...doc,
    scheduleMeta: { lastFiredKey: key },
  };
}

export async function drainDueScheduledFlows(now = new Date()): Promise<{
  scanned: number;
  enqueued: number;
}> {
  const rows = await listAllCollectionTestFlows();
  let enqueued = 0;
  for (const row of rows) {
    const doc = ensureFlowDocument(row.flow);
    if (!documentHasSchedule(doc)) continue;
    const node = primaryScheduleNode(doc);
    const cron = node?.cronExpression?.trim();
    if (!cron) continue;
    const tz = node?.timezone?.trim() || 'UTC';
    if (!cronMatchesAt(cron, now, tz)) continue;
    const key = scheduleMinuteKey(now, tz);
    if (lastFiredKey(doc) === key) continue;

    const run = await createCollectionFlowRun({
      flowId: row.id,
      platformProjectId: row.platformProjectId,
      trigger: 'schedule',
      status: 'queued',
      request: { scheduledAt: now.toISOString(), cronExpression: cron, timezone: tz },
    });
    await patchCollectionTestFlow({
      platformProjectId: row.platformProjectId,
      flowId: row.id,
      flow: withLastFired(doc, key),
    });
    enqueueCollectionFlowRun({
      platformProjectId: row.platformProjectId,
      flowId: row.id,
      runId: run.id,
    });
    enqueued += 1;
  }
  return { scanned: rows.length, enqueued };
}

async function tick(): Promise<void> {
  try {
    const result = await drainDueScheduledFlows();
    if (result.enqueued > 0) {
      console.info(
        '[PLEXON] flow schedule',
        `enqueued=${result.enqueued}`,
        `scanned=${result.scanned}`
      );
    }
  } catch (e) {
    console.warn(
      '[PLEXON] flow schedule tick failed',
      e instanceof Error ? e.message : e
    );
  }
}

export function startCollectionFlowScheduleScheduler(): void {
  if (!scheduleEnabled()) return;
  const g = globalThis as GlobalSched;
  if (g[GLOBAL_KEY]) return;
  const ms = intervalMs();
  console.info(`[PLEXON] flow schedule scheduler started (every ${ms}ms)`);
  void tick();
  g[GLOBAL_KEY] = setInterval(() => {
    void tick();
  }, ms);
  if (typeof g[GLOBAL_KEY].unref === 'function') {
    g[GLOBAL_KEY].unref();
  }
}

export function __testScheduleEnabled(): boolean {
  return scheduleEnabled();
}

export function __testScheduleIntervalMs(): number {
  return intervalMs();
}
