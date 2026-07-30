const DOMAIN_LIKE = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function normalizeEventQuickCheckUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function domainFromEventQuickCheckUrl(url: string): string | undefined {
  try {
    const normalized = normalizeEventQuickCheckUrl(url);
    const { hostname } = new URL(normalized);
    if (!hostname || hostname === 'localhost') return hostname || undefined;
    if (!DOMAIN_LIKE.test(hostname)) return undefined;
    return hostname;
  } catch {
    return undefined;
  }
}
