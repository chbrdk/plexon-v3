import {
  fetchCheckionDomainCorpusPages,
  listCheckionDomainScansV3,
  type CheckionCorpusPageRow,
  type CheckionDomainScanSummary,
} from '@/lib/integrations/checkion-domain-scans-v3-client';
import {
  fetchAudionPlatformProjectSummary,
  fetchCheckionPlatformProjectSummary,
  type AudionCatalogPersona,
} from '@/lib/platform-project-dashboard-fetch';
import { extractUrlFromText } from '@/lib/assistant/conversation-context';
import {
  corpusAggregateMetrics,
  rankCorpusPagesForPersona,
  type PersonaPageRelevancePersona,
  type RankedCorpusPage,
} from '@/lib/assistant/persona-page-relevance/rank-corpus-pages';
import { pathAudionAdminProject } from '@/lib/paths/audion-api';
import { pathCheckionDomainResult } from '@/lib/paths/checkion-api';
import { getCheckionUrl } from '@/lib/constants';
import {
  matchesVaillantGroupMafoPersonaName,
  mentionsVaillantGroupCollection,
  VAILLANT_GROUP_PLATFORM_PROJECT_ID,
} from '@/lib/demo/vaillant-group-mafo';
import { listAccessibleCollectionsForUser } from '@/lib/list-accessible-collections';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';

export type PersonaPageRelevancePreview = {
  persona: PersonaPageRelevancePersona;
  domainScan: CheckionDomainScanSummary;
  corpusMode?: string;
  corpusTruncated: boolean;
  corpusMetrics: ReturnType<typeof corpusAggregateMetrics>;
  rankedPages: RankedCorpusPage[];
  audionHref: string;
  checkionDomainHref: string;
};

const COMPLETED = new Set(['completed', 'complete']);

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/** Infer B2C/B2B spine URL when the prompt names a spine but no explicit URL. */
export function inferPersonaPageSpineUrlHint(text: string): string | undefined {
  const t = text.toLowerCase();
  if (
    /\bmyvaillant\s*pro\b/.test(t) ||
    /\bmyvaillantpro\b/.test(t) ||
    /\bfachpartner(?:-spine|-portal)?\b/.test(t) ||
    (/\bb2b\b/.test(t) && /\b(fach(?:handwerker|partner)|installateur)\b/.test(t))
  ) {
    return 'https://www.myvaillantpro.de/';
  }
  if (/\bvaillant\.de\b/.test(t) || /\bb2c\b/.test(t)) {
    return 'https://www.vaillant.de/';
  }
  return undefined;
}

/**
 * Resolve Collection when the chat has no project selected (global Assistant).
 * Prefer explicit id → Vaillant demo cues → name match against accessible Collections.
 */
export async function resolvePersonaPagePlatformProjectId(input: {
  plexonUserId: string;
  platformProjectId?: string | null;
  prompt?: string;
  personaName?: string;
  userRole?: string | null;
}): Promise<string | null> {
  const explicit = input.platformProjectId?.trim();
  if (explicit) return explicit;

  const prompt = input.prompt?.trim() || '';
  const personaName = input.personaName?.trim() || '';

  const wantsVaillant =
    mentionsVaillantGroupCollection(prompt) ||
    matchesVaillantGroupMafoPersonaName(personaName) ||
    matchesVaillantGroupMafoPersonaName(
      prompt.match(
        /\bfür\s+(?:persona\s+)?([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]{1,40}(?:\s+[A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]{1,40})?)/i,
      )?.[1],
    );

  if (wantsVaillant) {
    const allowed = await userCanViewPlatformProject(
      input.plexonUserId,
      input.userRole ?? 'user',
      VAILLANT_GROUP_PLATFORM_PROJECT_ID,
    );
    if (allowed) return VAILLANT_GROUP_PLATFORM_PROJECT_ID;
  }

  if (!prompt) return null;

  const collections = await listAccessibleCollectionsForUser(input.plexonUserId);
  const lower = prompt.toLowerCase();
  const byName = collections.items.find((c) => {
    const name = c.name.trim().toLowerCase();
    if (name.length < 3) return false;
    return lower.includes(name);
  });
  return byName?.id ?? null;
}

export function resolvePersonaFromCatalog(
  personas: AudionCatalogPersona[],
  opts: { personaId?: string; personaName?: string },
): AudionCatalogPersona | null {
  if (opts.personaId?.trim()) {
    const hit = personas.find((p) => p.id === opts.personaId?.trim());
    if (hit) return hit;
  }
  const name = opts.personaName?.trim();
  if (!name) return null;
  const needle = normalizeName(name);
  const exact = personas.find((p) => normalizeName(p.name) === needle);
  if (exact) return exact;
  return personas.find((p) => normalizeName(p.name).includes(needle) || needle.includes(normalizeName(p.name))) ?? null;
}

export function pickCompletedDomainScan(
  scans: CheckionDomainScanSummary[],
  urlHint?: string,
): CheckionDomainScanSummary | null {
  const completed = scans.filter((s) => COMPLETED.has(String(s.status).toLowerCase()));
  if (!completed.length) return null;
  if (urlHint?.trim()) {
    try {
      const host = new URL(urlHint.startsWith('http') ? urlHint : `https://${urlHint}`).hostname.replace(
        /^www\./i,
        '',
      );
      const matched = completed.find((s) => s.url.includes(host));
      if (matched) return matched;
    } catch {
      // ignore invalid url hint
    }
  }
  return [...completed].sort((a, b) => (b.pageCount ?? 0) - (a.pageCount ?? 0))[0] ?? null;
}

function toPersona(
  catalog: AudionCatalogPersona,
  targetGroups: Array<{ id: string; name: string }>,
): PersonaPageRelevancePersona {
  const tg = catalog.targetGroupId
    ? targetGroups.find((g) => g.id === catalog.targetGroupId)
    : undefined;
  return {
    id: catalog.id,
    name: catalog.name,
    role: catalog.role,
    targetGroupName: tg?.name ?? null,
  };
}

function absolutizeCheckionPath(path: string): string {
  const base = getCheckionUrl().replace(/\/+$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function absolutizeRankedPageLinks(pages: RankedCorpusPage[]): RankedCorpusPage[] {
  return pages.map((page) => ({
    ...page,
    resultsHref: absolutizeCheckionPath(page.resultsHref),
  }));
}

export async function runPersonaPageRelevance(input: {
  plexonUserId: string;
  userRole?: string | null;
  platformProjectId?: string;
  checkionProjectId?: string | null;
  audionProjectId?: string | null;
  personaId?: string;
  personaName?: string;
  domainScanId?: string;
  urlHint?: string;
  prompt?: string;
  topK?: number;
}): Promise<{ ok: true; preview: PersonaPageRelevancePreview } | { ok: false; error: string }> {
  const platformProjectId = await resolvePersonaPagePlatformProjectId({
    plexonUserId: input.plexonUserId,
    userRole: input.userRole,
    platformProjectId: input.platformProjectId,
    prompt: input.prompt,
    personaName: input.personaName,
  });
  if (!platformProjectId) {
    return {
      ok: false,
      error:
        'Collection-Kontext fehlt — bitte oben die Collection „Vaillant Group“ wählen (oder die Frage im Projekt-Chat stellen).',
    };
  }

  const audionSummary = await fetchAudionPlatformProjectSummary(platformProjectId, input.plexonUserId);
  if (!audionSummary?.personas?.length) {
    return { ok: false, error: 'Keine AUDION-Personas in dieser Collection gefunden.' };
  }

  const personaCatalog = resolvePersonaFromCatalog(audionSummary.personas, {
    personaId: input.personaId,
    personaName: input.personaName,
  });
  if (!personaCatalog) {
    const names = audionSummary.personas.slice(0, 5).map((p) => p.name).join(', ');
    return {
      ok: false,
      error: `Persona nicht gefunden. Verfügbar (Auszug): ${names}`,
    };
  }

  const checkionProjectId =
    input.checkionProjectId?.trim() ||
    (await fetchCheckionPlatformProjectSummary(platformProjectId, input.plexonUserId))?.externalProjectId ||
    null;
  if (!checkionProjectId) {
    return { ok: false, error: 'CHECKION-Projekt für diese Collection ist nicht gebunden.' };
  }

  let domainScan: CheckionDomainScanSummary | null = null;
  if (input.domainScanId?.trim()) {
    const scans = await listCheckionDomainScansV3(checkionProjectId);
    if (scans.ok) {
      domainScan = scans.scans.find((s) => s.id === input.domainScanId?.trim()) ?? null;
    }
  }
  if (!domainScan) {
    const scans = await listCheckionDomainScansV3(checkionProjectId);
    if (!scans.ok) return { ok: false, error: scans.error };
    const urlHint =
      input.urlHint?.trim() ||
      (input.prompt ? extractUrlFromText(input.prompt) : undefined) ||
      (input.prompt ? inferPersonaPageSpineUrlHint(input.prompt) : undefined) ||
      undefined;
    domainScan = pickCompletedDomainScan(scans.scans, urlHint);
  }
  if (!domainScan) {
    return {
      ok: false,
      error: 'Kein abgeschlossener CHECKION Deep Scan gefunden — starte zuerst einen Domain-Scan.',
    };
  }

  const pageSize = 100;
  const pagesRes = await fetchCheckionDomainCorpusPages(domainScan.id, {
    page: 1,
    pageSize,
    sort: 'url_asc',
  });
  if (!pagesRes.ok) return { ok: false, error: pagesRes.error };

  const allItems: CheckionCorpusPageRow[] = pagesRes.data.items;
  const corpusTruncated = pagesRes.data.pageCount > allItems.length;
  const persona = toPersona(personaCatalog, audionSummary.targetGroups ?? []);
  const rankedPages = absolutizeRankedPageLinks(
    rankCorpusPagesForPersona(allItems, persona, input.topK ?? 8),
  );

  const audionProjectId = input.audionProjectId?.trim() || audionSummary.externalProjectId;

  return {
    ok: true,
    preview: {
      persona,
      domainScan,
      corpusMode: pagesRes.corpusMode,
      corpusTruncated,
      corpusMetrics: corpusAggregateMetrics(allItems),
      rankedPages,
      audionHref: pathAudionAdminProject(audionProjectId),
      checkionDomainHref: pathCheckionDomainResult(domainScan.id),
    },
  };
}
