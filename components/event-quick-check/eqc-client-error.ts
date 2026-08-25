import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

const NETWORK_RE =
  /failed to fetch|networkerror|load failed|network request failed|err_network|err_name_not_resolved|err_connection|err_invalid_handle|aborted/i;

/** Map browser TypeError "Failed to fetch" (and kin) to a stable German EQC message. */
export function eqcClientErrorMessage(
  error: unknown,
  fallback: string = EQC_PAGE_COPY.errorRunFailed
): string {
  if (error instanceof Error) {
    const message = error.message?.trim() || fallback;
    if (NETWORK_RE.test(message) || error.name === 'TypeError' && /fetch/i.test(message)) {
      return EQC_PAGE_COPY.errorNetwork;
    }
    return message;
  }
  if (typeof error === 'string' && error.trim()) {
    return NETWORK_RE.test(error) ? EQC_PAGE_COPY.errorNetwork : error;
  }
  return fallback;
}
