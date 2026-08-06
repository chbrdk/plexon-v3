/**
 * URL helpers for Collection Flow node labels and card previews.
 * @see specs/domain/collection-test-flow.md
 */

/** Compact hostname + path for card preview. */
export function summarizeFlowUrl(input: string, emptyLabel = 'URL setzen…'): string {
  const raw = input.trim();
  if (!raw) return emptyLabel;
  try {
    const url = new URL(raw);
    const path = url.pathname && url.pathname !== '/' ? url.pathname : '';
    return `${url.hostname}${path}`;
  } catch {
    return raw.length > 56 ? `${raw.slice(0, 56)}…` : raw;
  }
}

/** Derive a short label from a URL (hostname without www.). */
export function deriveFlowLabelFromUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');
    if (!host) return null;
    return host;
  } catch {
    const compact = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return compact || null;
  }
}

/** Replace generic default labels when the user enters a URL. */
export function patchLabelFromUrlIfGeneric(
  currentLabel: string,
  defaultLabel: string,
  url: string
): string | undefined {
  const trimmed = currentLabel.trim();
  if (trimmed && trimmed !== defaultLabel) return undefined;
  return deriveFlowLabelFromUrl(url) ?? undefined;
}
