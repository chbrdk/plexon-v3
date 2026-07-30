import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';
import {
  checkionApiToolsExtract,
  checkionApiToolsReadability,
} from '@/lib/paths/checkion-api';

export type ReadabilityCheckPreview = {
  url: string;
  score: number;
  grade: string;
  stats: { sentences: number; words: number; syllables: number };
};

export type ReadabilityCheckResult =
  | { ok: true; data: ReadabilityCheckPreview }
  | { ok: false; error: string; missing?: Array<'url'> };

const MAX_TEXT_CHARS = 12_000;

export async function fetchCheckionReadabilityForUrl(url: string): Promise<ReadabilityCheckResult> {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: 'URL fehlt', missing: ['url'] };

  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  try {
    const extractRes = await fetch(checkionApiToolsExtract(trimmed, 'body'), {
      headers: { Authorization: auth.headers.Authorization },
      cache: 'no-store',
    });
    const extractBody = await extractRes.text();
    if (!extractRes.ok) {
      return { ok: false, error: `Text-Extraktion: HTTP ${extractRes.status} – ${extractBody.slice(0, 120)}` };
    }
    const extractJson = JSON.parse(extractBody) as {
      data?: { content?: string };
    };
    const text = extractJson.data?.content?.trim() ?? '';
    if (!text) return { ok: false, error: 'Kein Text auf der Seite gefunden' };

    const readabilityRes = await fetch(checkionApiToolsReadability(), {
      method: 'POST',
      headers: auth.headers,
      body: JSON.stringify({ text: text.slice(0, MAX_TEXT_CHARS) }),
      cache: 'no-store',
    });
    const readabilityBody = await readabilityRes.text();
    if (!readabilityRes.ok) {
      return { ok: false, error: `Lesbarkeit: HTTP ${readabilityRes.status} – ${readabilityBody.slice(0, 120)}` };
    }
    const readabilityJson = JSON.parse(readabilityBody) as {
      data?: {
        score?: number;
        grade?: string;
        stats?: { sentences?: number; words?: number; syllables?: number };
      };
    };
    const d = readabilityJson.data;
    if (!d) return { ok: false, error: 'Lesbarkeit ohne Daten' };

    return {
      ok: true,
      data: {
        url: trimmed,
        score: Number(d.score ?? 0),
        grade: String(d.grade ?? '—'),
        stats: {
          sentences: Number(d.stats?.sentences ?? 0),
          words: Number(d.stats?.words ?? 0),
          syllables: Number(d.stats?.syllables ?? 0),
        },
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
