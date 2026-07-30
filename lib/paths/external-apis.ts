/** Central URLs for free third-party APIs (Phase 2+). Never hardcode in clients. */

export const MOZILLA_OBSERVATORY_API_BASE =
  process.env.MOZILLA_OBSERVATORY_API_BASE?.replace(/\/+$/, '') ??
  'https://http-observatory.security.mozilla.org/api/v2';

export const CLOUDFLARE_DNS_QUERY_URL =
  process.env.CLOUDFLARE_DNS_QUERY_URL ?? 'https://cloudflare-dns.com/dns-query';

export const W3C_VALIDATOR_URL =
  process.env.W3C_VALIDATOR_URL ?? 'https://validator.w3.org/nu/';

export function mozillaObservatoryAnalyze(host: string): string {
  return `${MOZILLA_OBSERVATORY_API_BASE}/analyze?host=${encodeURIComponent(host)}`;
}
