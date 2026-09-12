/**
 * Background outbox drain scheduler (Wave A follow-up).
 * Spec: specs/domain/platform-outbox-delivery.md
 *
 * Enabled when DATABASE_URL is set. Disable with PLEXON_OUTBOX_DRAIN_ENABLED=0.
 * Interval: PLEXON_OUTBOX_DRAIN_INTERVAL_MS (default 30000, min 5000).
 */

import { drainPlatformOutbox } from '@/lib/platform-outbox';

const GLOBAL_KEY = '__plexonOutboxDrainTimer' as const;

type GlobalDrain = typeof globalThis & {
  [GLOBAL_KEY]?: ReturnType<typeof setInterval>;
};

function drainEnabled(): boolean {
  const raw = process.env.PLEXON_OUTBOX_DRAIN_ENABLED?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  return Boolean(process.env.DATABASE_URL);
}

function intervalMs(): number {
  const raw = Number(process.env.PLEXON_OUTBOX_DRAIN_INTERVAL_MS);
  if (Number.isFinite(raw) && raw >= 5000) return Math.floor(raw);
  return 30_000;
}

async function tick(): Promise<void> {
  try {
    const result = await drainPlatformOutbox(20);
    if (result.processed > 0) {
      console.info(
        '[PLEXON] outbox drain',
        `processed=${result.processed}`,
        `done=${result.done}`,
        `dead=${result.dead}`,
        `pending=${result.remainingPending}`
      );
    }
  } catch (e) {
    console.warn(
      '[PLEXON] outbox drain failed',
      e instanceof Error ? e.message : e
    );
  }
}

/** Idempotent — safe across Next.js HMR / multi-import. */
export function startPlatformOutboxDrainScheduler(): void {
  if (!drainEnabled()) return;
  const g = globalThis as GlobalDrain;
  if (g[GLOBAL_KEY]) return;
  const ms = intervalMs();
  console.info(`[PLEXON] outbox drain scheduler started (every ${ms}ms)`);
  void tick();
  g[GLOBAL_KEY] = setInterval(() => {
    void tick();
  }, ms);
  // Do not keep the process alive solely for the timer in some runtimes.
  if (typeof g[GLOBAL_KEY].unref === 'function') {
    g[GLOBAL_KEY].unref();
  }
}

export function __testDrainEnabled(): boolean {
  return drainEnabled();
}

export function __testIntervalMs(): number {
  return intervalMs();
}
