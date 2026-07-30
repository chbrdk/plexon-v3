import { mozillaObservatoryAnalyze } from '@/lib/paths/external-apis';
import { normalizeCheckionHost } from '@/lib/integrations/checkion-tools-client';

export type SecurityHeadersPreview = {
  host: string;
  grade: string | null;
  score: number | null;
  testsPassed: number;
  testsFailed: number;
  state: string;
};

export type SecurityHeadersResult =
  | { ok: true; data: SecurityHeadersPreview }
  | { ok: false; error: string };

const POLL_MS = 4000;
const MAX_MS = 90_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchMozillaObservatorySecurity(hostOrUrl: string): Promise<SecurityHeadersResult> {
  const host = normalizeCheckionHost(hostOrUrl);
  if (!host) return { ok: false, error: 'Host fehlt' };

  const startUrl = `${mozillaObservatoryAnalyze(host)}&hidden=true&rescan=true`;

  try {
    const startRes = await fetch(startUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!startRes.ok) {
      const body = await startRes.text();
      return { ok: false, error: `Observatory start: HTTP ${startRes.status} – ${body.slice(0, 80)}` };
    }

    const deadline = Date.now() + MAX_MS;
    let lastState = 'UNKNOWN';

    while (Date.now() < deadline) {
      const pollRes = await fetch(mozillaObservatoryAnalyze(host), { cache: 'no-store' });
      if (!pollRes.ok) {
        return { ok: false, error: `Observatory poll: HTTP ${pollRes.status}` };
      }
      const json = (await pollRes.json()) as {
        state?: string;
        grade?: string;
        score?: number;
        tests_passed?: number;
        tests_failed?: number;
      };
      lastState = String(json.state ?? lastState);
      if (lastState === 'FINISHED' || lastState === 'ABORTED') {
        return {
          ok: true,
          data: {
            host,
            grade: json.grade ?? null,
            score: json.score != null ? Number(json.score) : null,
            testsPassed: Number(json.tests_passed ?? 0),
            testsFailed: Number(json.tests_failed ?? 0),
            state: lastState,
          },
        };
      }
      await sleep(POLL_MS);
    }

    return { ok: false, error: `Observatory Timeout (Zustand: ${lastState})` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
