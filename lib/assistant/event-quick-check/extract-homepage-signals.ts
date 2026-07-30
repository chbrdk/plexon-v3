import type { CompanyBriefHomepageSignals } from '@/lib/assistant/event-quick-check/company-brief-types';
import { normalizeEventQuickCheckUrl, domainFromEventQuickCheckUrl } from '@/lib/assistant/event-quick-check/event-quick-check-url';

const FETCH_TIMEOUT_MS = 18_000;
const MAX_HTML_CHARS = 120_000;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function metaContent(html: string, attr: string, key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["']`,
    'i'
  );
  const match = html.match(re);
  const raw = match?.[1] ?? match?.[2];
  return raw ? decodeHtmlEntities(raw.trim()) : undefined;
}

function titleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim()) : undefined;
}

function h1Tags(html: string): string[] {
  const out: string[] = [];
  const re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && out.length < 5) {
    const text = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (text) out.push(text.slice(0, 240));
  }
  return out;
}

export async function extractHomepageSignals(url: string): Promise<CompanyBriefHomepageSignals> {
  const normalized = normalizeEventQuickCheckUrl(url);
  const domain = domainFromEventQuickCheckUrl(normalized) ?? normalized;

  const base: CompanyBriefHomepageSignals = { url: normalized, domain, h1: [] };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'PLEXON-QuickCheck/1.0 (company-brief)',
      },
      redirect: 'follow',
    });
    const contentType = res.headers.get('content-type') ?? '';
    const body = (await res.text()).slice(0, MAX_HTML_CHARS);
    if (!res.ok) {
      return { ...base, fetchError: `HTTP ${res.status}` };
    }
    if (!contentType.toLowerCase().includes('html') && !body.includes('<html')) {
      return { ...base, fetchError: 'Keine HTML-Antwort' };
    }

    return {
      ...base,
      pageTitle: titleTag(body),
      metaDescription: metaContent(body, 'name', 'description'),
      ogTitle: metaContent(body, 'property', 'og:title'),
      ogDescription: metaContent(body, 'property', 'og:description'),
      h1: h1Tags(body),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ...base, fetchError: message };
  } finally {
    clearTimeout(timer);
  }
}
