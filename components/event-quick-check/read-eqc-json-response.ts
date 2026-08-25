import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

/** Parse JSON body; empty / non-JSON responses become a clear Error (no “Unexpected end of JSON”). */
export async function readEqcJsonResponse<T extends { error?: string }>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(
      res.ok
        ? EQC_PAGE_COPY.errorRunFailed
        : `Serverfehler (${res.status}). Bitte erneut versuchen.`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? EQC_PAGE_COPY.errorRunFailed
        : `Serverfehler (${res.status}). Bitte erneut versuchen.`
    );
  }
}
