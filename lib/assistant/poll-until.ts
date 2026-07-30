export type PollTickResult<T> = {
  done: boolean;
  value?: T;
  progress?: number;
  status?: string;
  error?: string;
};

export type PollUntilOptions<T> = {
  fetch: () => Promise<PollTickResult<T>>;
  intervalMs?: number;
  maxMs?: number;
  onTick?: (tick: PollTickResult<T>) => void | Promise<void>;
};

const DEFAULT_INTERVAL_MS = 3000;
const DEFAULT_MAX_MS = 10 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollUntil<T>(
  options: PollUntilOptions<T>
): Promise<{ ok: true; value: T } | { ok: false; error: string; lastStatus?: string }> {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxMs = options.maxMs ?? DEFAULT_MAX_MS;
  const started = Date.now();
  let lastStatus: string | undefined;

  while (Date.now() - started < maxMs) {
    const tick = await options.fetch();
    lastStatus = tick.status ?? lastStatus;
    await options.onTick?.(tick);

    if (tick.error && tick.done) {
      return { ok: false, error: tick.error, lastStatus };
    }

    if (tick.done) {
      if (tick.value === undefined) {
        return { ok: false, error: 'Poll beendet ohne Ergebnis', lastStatus };
      }
      return { ok: true, value: tick.value };
    }

    await sleep(intervalMs);
  }

  return {
    ok: false,
    error: `Timeout nach ${Math.round(maxMs / 1000)}s`,
    lastStatus,
  };
}
