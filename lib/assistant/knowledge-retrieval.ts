import { getAudionServiceToken, getCheckionServiceToken } from '@/lib/constants';
import { truncateAssistantText } from '@/lib/assistant/context-budget';
import { checkionApiProjectPath } from '@/lib/paths/checkion-api';
import {
  audionApiTargetGroupChunkSimilar,
  audionApiTargetGroupChunks,
  audionApiTargetGroupKnowledge,
  audionApiTargetGroups,
} from '@/lib/paths/audion-api';

export const ASSISTANT_MAX_RETRIEVAL_CHARS = 12_000;

const STOPWORDS = new Set([
  'was',
  'wie',
  'wer',
  'wo',
  'wann',
  'warum',
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'ein',
  'eine',
  'einer',
  'eines',
  'und',
  'oder',
  'für',
  'mit',
  'über',
  'zu',
  'zur',
  'zum',
  'von',
  'vom',
  'aus',
  'bei',
  'ist',
  'sind',
  'hat',
  'hast',
  'haben',
  'du',
  'ich',
  'wir',
  'sie',
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'with',
  'about',
  'what',
  'how',
  'you',
  'your',
  'me',
  'my',
  'this',
  'that',
  'project',
  'projekt',
]);

export type KnowledgeHit = {
  source: 'audion' | 'checkion';
  title: string;
  snippet: string;
  score: number;
  targetGroup?: string;
  method?: 'keyword' | 'vector';
  similarity?: number;
};

export function extractQueryTerms(prompt: string): string[] {
  const normalized = prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return [...new Set(normalized)];
}

export function scoreTextAgainstTerms(text: string, terms: string[]): number {
  if (!text.trim() || terms.length === 0) return 0;
  const hay = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (hay.includes(term)) score += term.length >= 6 ? 3 : 2;
  }
  return score;
}

export function rankKnowledgeHits(hits: KnowledgeHit[], terms: string[], limit = 8): KnowledgeHit[] {
  const scored = hits
    .map((hit) => ({
      ...hit,
      score: hit.score + scoreTextAgainstTerms(`${hit.title} ${hit.snippet}`, terms) * 2,
    }))
    .filter((h) => h.score > 0 || terms.length === 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function serviceHeaders(plexonUserId: string, token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Plexon-User-Id': plexonUserId,
  };
}

async function collectAudionHits(
  audionProjectId: string,
  plexonUserId: string,
  terms: string[]
): Promise<KnowledgeHit[]> {
  const token = getAudionServiceToken();
  if (!token) return [];

  const listRes = await fetch(audionApiTargetGroups(audionProjectId), {
    headers: serviceHeaders(plexonUserId, token),
    cache: 'no-store',
  });
  if (!listRes.ok) return [];

  const listJson = (await listRes.json()) as {
    items?: Array<{ id?: string; name?: string; segment?: string; description?: string }>;
  };
  const hits: KnowledgeHit[] = [];

  for (const group of (listJson.items ?? []).slice(0, 12)) {
    const groupLabel = group.name || group.segment || 'Zielgruppe';
    if (group.description?.trim()) {
      hits.push({
        source: 'audion',
        title: `${groupLabel} – Beschreibung`,
        snippet: group.description.trim().slice(0, 500),
        score: scoreTextAgainstTerms(group.description, terms),
        targetGroup: groupLabel,
      });
    }
    if (!group.id) continue;

    const knowledgeRes = await fetch(audionApiTargetGroupKnowledge(group.id), {
      headers: serviceHeaders(plexonUserId, token),
      cache: 'no-store',
    });
    if (!knowledgeRes.ok) continue;

    const knowledgeJson = (await knowledgeRes.json()) as
      | Array<{ title?: string; content?: string }>
      | { items?: Array<{ title?: string; content?: string }> };
    const entries = Array.isArray(knowledgeJson)
      ? knowledgeJson
      : Array.isArray(knowledgeJson.items)
        ? knowledgeJson.items
        : [];

    for (const entry of entries) {
      const title = entry.title?.trim() || 'Knowledge';
      const content = entry.content?.trim() ?? '';
      hits.push({
        source: 'audion',
        title,
        snippet: content.slice(0, 600),
        score: scoreTextAgainstTerms(`${title} ${content}`, terms),
        targetGroup: groupLabel,
      });
    }
  }

  return hits;
}

type AudionChunk = { id?: string; content?: string; document_filename?: string };

async function collectAudionVectorHits(
  audionProjectId: string,
  plexonUserId: string,
  terms: string[]
): Promise<KnowledgeHit[]> {
  if (terms.length === 0) return [];
  const token = getAudionServiceToken();
  if (!token) return [];

  const listRes = await fetch(audionApiTargetGroups(audionProjectId), {
    headers: serviceHeaders(plexonUserId, token),
    cache: 'no-store',
  });
  if (!listRes.ok) return [];

  const listJson = (await listRes.json()) as {
    items?: Array<{ id?: string; name?: string; segment?: string }>;
  };

  const hits: KnowledgeHit[] = [];
  const seen = new Set<string>();

  for (const group of (listJson.items ?? []).slice(0, 8)) {
    if (!group.id) continue;
    const groupLabel = group.name || group.segment || 'Zielgruppe';

    const chunksRes = await fetch(audionApiTargetGroupChunks(group.id, 40), {
      headers: serviceHeaders(plexonUserId, token),
      cache: 'no-store',
    });
    if (!chunksRes.ok) continue;

    const chunks = (await chunksRes.json()) as AudionChunk[];
    let best: { id: string; content: string; score: number } | null = null;
    for (const chunk of chunks) {
      if (!chunk.id || !chunk.content?.trim()) continue;
      const score = scoreTextAgainstTerms(chunk.content, terms);
      if (!best || score > best.score) {
        best = { id: chunk.id, content: chunk.content.trim(), score };
      }
    }
    if (!best || best.score <= 0) continue;

    const similarRes = await fetch(
      audionApiTargetGroupChunkSimilar(group.id, best.id, 6),
      { headers: serviceHeaders(plexonUserId, token), cache: 'no-store' }
    );
    if (!similarRes.ok) continue;

    const similar = (await similarRes.json()) as Array<{
      id?: string;
      content?: string;
      similarity?: number;
    }>;

    for (const item of similar) {
      const content = item.content?.trim() ?? '';
      if (!content) continue;
      const key = content.slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);
      const similarity = typeof item.similarity === 'number' ? item.similarity : 0;
      hits.push({
        source: 'audion',
        title: `Semantisch (${groupLabel})`,
        snippet: content.slice(0, 600),
        score: best.score + Math.round(similarity * 10),
        targetGroup: groupLabel,
        method: 'vector',
        similarity,
      });
    }
  }

  return hits;
}

async function collectCheckionHits(
  checkionProjectId: string,
  plexonUserId: string,
  terms: string[]
): Promise<KnowledgeHit[]> {
  const token = getCheckionServiceToken();
  if (!token) return [];

  const res = await fetch(checkionApiProjectPath(checkionProjectId), {
    headers: serviceHeaders(plexonUserId, token),
    cache: 'no-store',
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { data?: Record<string, unknown> };
  const data = json.data;
  if (!data) return [];

  const hits: KnowledgeHit[] = [];
  const pushField = (title: string, value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return;
    hits.push({
      source: 'checkion',
      title,
      snippet: value.trim().slice(0, 600),
      score: scoreTextAgainstTerms(value, terms),
    });
  };

  pushField('Branche', data.industry);
  pushField('Value Proposition', data.valueProposition);

  const snapshot = data.researchSnapshot;
  if (snapshot && typeof snapshot === 'object') {
    const s = snapshot as Record<string, unknown>;
    for (const [key, val] of Object.entries(s)) {
      if (Array.isArray(val)) {
        const joined = val.filter((v) => typeof v === 'string').join('; ');
        if (joined) {
          hits.push({
            source: 'checkion',
            title: `Research: ${key}`,
            snippet: joined.slice(0, 600),
            score: scoreTextAgainstTerms(joined, terms),
          });
        }
      } else if (typeof val === 'string' && val.trim()) {
        pushField(`Research: ${key}`, val);
      }
    }
  }

  return hits;
}

export type RetrievalResult = {
  terms: string[];
  hits: KnowledgeHit[];
  vectorHits: number;
  block: string | null;
};

export async function retrieveProjectKnowledge(input: {
  prompt: string;
  plexonUserId: string;
  checkionProjectId?: string | null;
  audionProjectId?: string | null;
}): Promise<RetrievalResult> {
  const terms = extractQueryTerms(input.prompt);
  const allHits: KnowledgeHit[] = [];

  if (input.audionProjectId) {
    allHits.push(...(await collectAudionHits(input.audionProjectId, input.plexonUserId, terms)));
    allHits.push(...(await collectAudionVectorHits(input.audionProjectId, input.plexonUserId, terms)));
  }
  if (input.checkionProjectId) {
    allHits.push(...(await collectCheckionHits(input.checkionProjectId, input.plexonUserId, terms)));
  }

  const hits =
    terms.length > 0
      ? rankKnowledgeHits(allHits, terms, 10)
      : allHits.slice(0, 6).map((h) => ({ ...h, score: h.score }));

  const vectorHits = hits.filter((h) => h.method === 'vector').length;

  if (hits.length === 0) {
    return { terms, hits: [], vectorHits: 0, block: null };
  }

  const lines = [
    '## Relevante Projekt-Quellen (Retrieval)',
    terms.length > 0 ? `Suchbegriffe: ${terms.join(', ')}` : 'Top-Quellen:',
    vectorHits > 0 ? `Semantische Treffer (AUDION/Qdrant): ${vectorHits}` : null,
    '',
    ...hits.map((h, i) => {
      const src = h.source === 'audion' ? 'AUDION' : 'CHECKION';
      const tg = h.targetGroup ? ` · ${h.targetGroup}` : '';
      const sim =
        typeof h.similarity === 'number' && h.similarity > 0
          ? ` (Ähnlichkeit ${(h.similarity * 100).toFixed(0)}%)`
          : '';
      return `${i + 1}. **[${src}${tg}] ${h.title}**${sim}\n${h.snippet}`;
    }),
  ].filter((l): l is string => Boolean(l));

  const block = truncateAssistantText(lines.join('\n'), ASSISTANT_MAX_RETRIEVAL_CHARS, 'Retrieval');
  return { terms, hits, vectorHits, block };
}

export function buildRetrievalSystemBlock(result: RetrievalResult): string {
  return result.block ?? '';
}
