import { getCheckionServiceToken, getAudionServiceToken } from '@/lib/constants';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  ASSISTANT_MAX_PROJECT_CONTEXT_CHARS,
  truncateAssistantText,
} from '@/lib/assistant/context-budget';
import { checkionApiProjectPath } from '@/lib/paths/checkion-api';
import {
  audionApiTargetGroupKnowledge,
  audionApiTargetGroups,
} from '@/lib/paths/audion-api';
import { formatAudionHttpFailure } from '@/lib/integrations/audion-connectivity';
import {
  ensureFacetsShape,
  normalizeMarketIntelligenceData,
  normalizeResearchBriefData,
} from '@/lib/collection-knowledge-pack';
import { getOrCreateKnowledgePack } from '@/lib/db/collection-knowledge-packs';

type BindingIds = {
  checkionProjectId?: string | null;
  audionProjectId?: string | null;
};

function serviceHeaders(plexonUserId: string, token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Plexon-User-Id': plexonUserId,
  };
}

function compactStringList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .slice(0, max);
}

function compactResearchSnapshot(snapshot: unknown): string[] {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const s = snapshot as Record<string, unknown>;
  const lines: string[] = [];
  const targetGroups = compactStringList(s.targetGroups, 15);
  if (targetGroups.length) lines.push(`Research-Zielgruppen: ${targetGroups.join('; ')}`);
  const competitors = compactStringList(s.competitors, 10);
  if (competitors.length) lines.push(`Research-Wettbewerber: ${competitors.join('; ')}`);
  const seo = compactStringList(s.seoKeywords, 15);
  if (seo.length) lines.push(`SEO-Keywords: ${seo.join('; ')}`);
  const geo = compactStringList(s.geoQueries, 15);
  if (geo.length) lines.push(`GEO-Queries: ${geo.join('; ')}`);
  if (typeof s.valueProposition === 'string' && s.valueProposition.trim()) {
    lines.push(`Value Proposition: ${s.valueProposition.trim().slice(0, 400)}`);
  }
  return lines;
}

async function fetchCheckionProjectContext(
  checkionProjectId: string,
  plexonUserId: string
): Promise<string[]> {
  const token = getCheckionServiceToken();
  if (!token) return ['CHECKION: API-Token nicht konfiguriert'];
  const res = await fetch(checkionApiProjectPath(checkionProjectId), {
    headers: serviceHeaders(plexonUserId, token),
    cache: 'no-store',
  });
  if (!res.ok) return [`CHECKION: Projekt nicht ladbar (${res.status})`];
  const json = (await res.json()) as { data?: Record<string, unknown> };
  const data = json.data;
  if (!data) return ['CHECKION: Keine Projektdaten'];

  const lines = [
    `CHECKION-Projekt: ${typeof data.name === 'string' ? data.name : checkionProjectId}`,
    typeof data.domain === 'string' && data.domain ? `Domain: ${data.domain}` : null,
    typeof data.industry === 'string' && data.industry ? `Branche: ${data.industry}` : null,
    typeof data.valueProposition === 'string' && data.valueProposition
      ? `Value Proposition: ${data.valueProposition.slice(0, 400)}`
      : null,
    ...compactResearchSnapshot(data.researchSnapshot),
  ].filter((l): l is string => Boolean(l));

  const competitors = compactStringList(data.competitors, 10);
  if (competitors.length) lines.push(`Wettbewerber: ${competitors.join('; ')}`);

  return lines;
}

type AudionTargetGroup = {
  id?: string;
  name?: string;
  segment?: string;
  description?: string;
};

type AudionKnowledgeEntry = {
  title?: string;
  content?: string;
};

async function fetchAudionProjectContext(
  audionProjectId: string,
  plexonUserId: string
): Promise<string[]> {
  const token = getAudionServiceToken();
  if (!token) return ['AUDION: API-Token nicht konfiguriert'];

  const listRes = await fetch(audionApiTargetGroups(audionProjectId), {
    headers: serviceHeaders(plexonUserId, token),
    cache: 'no-store',
    redirect: 'manual',
  });
  if (!listRes.ok) {
    const body = await listRes.text();
    if (listRes.status >= 300 && listRes.status < 400) {
      const location = listRes.headers.get('location') ?? '';
      return [
        `AUDION: Login-Redirect (${listRes.status} → ${location || '?'}) – AUDION_API_URL in Coolify auf FastAPI setzen (z.B. http://audion-api:8000), nicht Web-URL`,
      ];
    }
    return [formatAudionHttpFailure(listRes.status, listRes.headers.get('content-type'), body, 'AUDION Zielgruppen')];
  }

  let listJson: { items?: AudionTargetGroup[] };
  try {
    listJson = (await listRes.json()) as { items?: AudionTargetGroup[] };
  } catch {
    return ['AUDION: Ungültige JSON-Antwort – vermutlich Web-App statt FastAPI (AUDION_API_URL prüfen)'];
  }
  const groups = (listJson.items ?? []).slice(0, 8);
  if (groups.length === 0) return ['AUDION: Keine Zielgruppen'];

  const lines: string[] = [`AUDION: ${groups.length} Zielgruppe(n)`];

  for (const group of groups) {
    const gid = group.id;
    const label = group.name || group.segment || gid || 'Zielgruppe';
    lines.push(`\n### ${label}${group.segment ? ` (${group.segment})` : ''}`);
    if (group.description?.trim()) {
      lines.push(group.description.trim().slice(0, 300));
    }
    if (!gid) continue;

    const knowledgeRes = await fetch(audionApiTargetGroupKnowledge(gid), {
      headers: serviceHeaders(plexonUserId, token),
      cache: 'no-store',
    });
    if (!knowledgeRes.ok) continue;
    const knowledgeJson = (await knowledgeRes.json()) as AudionKnowledgeEntry[] | { items?: AudionKnowledgeEntry[] };
    const entries = Array.isArray(knowledgeJson)
      ? knowledgeJson
      : Array.isArray(knowledgeJson.items)
        ? knowledgeJson.items
        : [];

    for (const entry of entries.slice(0, 6)) {
      const title = entry.title?.trim() || 'Eintrag';
      const snippet = entry.content?.trim().slice(0, 350) ?? '';
      lines.push(`- **${title}**: ${snippet || '(ohne Text)'}`);
    }
  }

  return lines;
}

async function fetchKnowledgePackContext(platformProjectId: string): Promise<string[]> {
  try {
    const row = await getOrCreateKnowledgePack(platformProjectId);
    const facets = ensureFacetsShape(row.facets);
    const lines: string[] = ['### Collection Knowledge Pack'];

    const brief = normalizeResearchBriefData(facets.research_brief.data);
    if (brief.summary) lines.push(`Research brief: ${brief.summary.slice(0, 400)}`);
    for (const section of brief.sections.slice(0, 4)) {
      lines.push(`- ${section.title}: ${section.plainText.slice(0, 220)}`);
    }

    const market = normalizeMarketIntelligenceData(facets.market_intelligence.data);
    if (market.summary || market.waveHighlights.length) {
      lines.push('\n### ECHON Market Intelligence');
      if (market.summary) lines.push(market.summary.slice(0, 500));
      for (const h of market.waveHighlights.slice(0, 5)) {
        lines.push(`- ${h.slice(0, 200)}`);
      }
      if (market.sourceThreadId) lines.push(`sourceThreadId: ${market.sourceThreadId}`);
    }

    return lines.length > 1 ? lines : [];
  } catch {
    return [];
  }
}

export async function buildCompactProjectContextBlock(
  platformProjectId: string,
  plexonUserId: string,
  bindings: BindingIds
): Promise<string | null> {
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return null;

  const sections: string[] = [
    '## Projektkontext (Kurzfassung)',
    `Name: ${project.name}`,
    project.domain ? `Domain: ${project.domain}` : null,
    `platformProjectId: ${platformProjectId}`,
    bindings.checkionProjectId ? `checkionProjectId: ${bindings.checkionProjectId}` : null,
    bindings.audionProjectId ? `audionProjectId: ${bindings.audionProjectId}` : null,
  ].filter((l): l is string => Boolean(l));

  sections.push(...(await fetchKnowledgePackContext(platformProjectId)));

  if (bindings.checkionProjectId) {
    sections.push('\n### CHECKION');
    sections.push(...(await fetchCheckionProjectContext(bindings.checkionProjectId, plexonUserId)));
  }

  if (bindings.audionProjectId) {
    sections.push('\n### AUDION Knowledge');
    sections.push(...(await fetchAudionProjectContext(bindings.audionProjectId, plexonUserId)));
  }

  return truncateAssistantText(
    sections.join('\n'),
    ASSISTANT_MAX_PROJECT_CONTEXT_CHARS,
    'Projektkontext'
  );
}
