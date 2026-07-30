import { fetchCheckionPageSpeed } from '@/lib/integrations/checkion-pagespeed-client';
import type { CrossBenchmarks } from '@/lib/assistant/insights/types';

const CROSS_BENCHMARK_TIMEOUT_MS = 18_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

/** Lightweight supplementary benchmark (PageSpeed) for cross-comparison — not a full workflow. */
export async function fetchCrossBenchmarks(input: {
  workflowType: string;
  url: string;
}): Promise<CrossBenchmarks> {
  const url = input.url.trim();
  if (!url) return {};

  const needsPageSpeed = ['geo_analysis', 'quick_scan', 'domain_scan', 'readability_check'].includes(
    input.workflowType
  );
  if (!needsPageSpeed) return {};

  const result = await withTimeout(fetchCheckionPageSpeed(url), CROSS_BENCHMARK_TIMEOUT_MS);
  if (!result) {
    return { fetchNote: 'PageSpeed-Quervergleich: Zeitüberschreitung (>18s).' };
  }
  if (!result.ok) {
    return { fetchNote: `PageSpeed-Quervergleich nicht verfügbar: ${result.error}` };
  }
  return { pageSpeed: result.data };
}
