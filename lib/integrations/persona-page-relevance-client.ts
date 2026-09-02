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
  type AudionProjectSummary,
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
import { listAccessibleCollectionsForUser } from '@/lib/list-accessible-collections';

export type PersonaPageRelevancePreview = {
  persona: PersonaPageRelevancePersona;
  domainScan: CheckionDomainScanSummary;
  corpusMode?: string;
  corpusTruncated: boolean;
  corpusMetrics: ReturnType<typeof corpusAggregateMetrics>;
  rankedPages: RankedCorpusPage[];
  audionHref: string;
  checkionDomainHref: string;
  /** Collection used (may have been inferred from persona). */
  platformProjectId: string;
  collectionName?: string;
};

export type PersonaCollectionMatch = {
  platformProjectId: string;
  collectionName: string;
  persona: AudionCatalogPersona;
  exactName: boolean;
  summary: AudionProjectSummary;
};

export type ResolvePersonaPageContextResult =
  | {
      ok: true;
      platformProjectId: string;
      collectionName?: string;
      personaId?: string;
      summary?: AudionProjectSummary;
      inferred: boolean;
    }
  | { ok: false; error: string };

const COMPLETED = new Set(['completed', 'complete']);
const PERSONA_SCAN_CONCURRENCY = 5;

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function isExactPersonaNameMatch(persona: AudionCatalogPersona, personaName?: string): boolean {
  if (!personaName?.trim()) return Boolean(persona.id);
  return normalizeName(persona.name) === normalizeName(personaName);
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
  return (
    personas.find(
      (p) => normalizeName(p.name).includes(needle) || needle.includes(normalizeName(p.name)),
    ) ?? null
  );
}

export function pickBestPersonaCollectionMatch(
  matches: PersonaCollectionMatch[],
  prompt?: string,
): PersonaCollectionMatch | null {
  if (!matches.length) return null;
  const lower = (prompt ?? '').toLowerCase();
  const exact = matches.filter((m) => m.exactName);
  const pool = exact.length ? exact : matches;
  if (pool.length === 1) return pool[0]!;
  const named = pool.find((m) => {
    const name = m.collectionName.trim().toLowerCase();
    return name.length >= 3 && lower.includes(name);
  });
  return named ?? pool[0]!;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Find a persona in AUDION catalogs of Collections the user can access.
 * Exact name beats partial; among ties, prefer Collection name mentioned in the prompt.
 */
export async function findPersonaAcrossAccessibleCollections(input: {
  plexonUserId: string;
  personaId?: string;
  personaName?: string;
  prompt?: string;
}): Promise<
  | { ok: true; match: PersonaCollectionMatch }
  | { ok: false; error: string; ambiguous?: Array<{ collectionName: string; platformProjectId: string }> }
> {
  const personaId = input.personaId?.trim();
  const personaName = input.personaName?.trim();
  if (!personaId && !personaName) {
    return {
      ok: false,
      error: 'Persona-Name oder -ID fehlt — bitte eine Persona nennen oder eine Collection wählen.',
    };
  }

  const collections = await listAccessibleCollectionsForUser(input.plexonUserId);
  if (!collections.items.length) {
    return { ok: false, error: 'Keine zugängliche Collection gefunden.' };
  }

  const scanned = await mapPool(collections.items, PERSONA_SCAN_CONCURRENCY, async (collection) => {
    const summary = await fetchAudionPlatformProjectSummary(collection.id, input.plexonUserId);
    if (!summary?.personas?.length) return null;
    const persona = resolvePersonaFromCatalog(summary.personas, { personaId, personaName });
    if (!persona) return null;
    return {
      platformProjectId: collection.id,
      collectionName: collection.name,
      persona,
      exactName: Boolean(personaId) || isExactPersonaNameMatch(persona, personaName),
      summary,
    } satisfies PersonaCollectionMatch;
  });

  const matches = scanned.filter((m): m is PersonaCollectionMatch => Boolean(m));
  if (!matches.length) {
    return {
      ok: false,
      error: `Persona „${personaName || personaId}“ in keiner zugänglichen Collection gefunden.`,
    };
  }

  const exact = matches.filter((m) => m.exactName);
  const prompt = input.prompt?.trim() || '';
  if (exact.length > 1) {
    const lower = prompt.toLowerCase();
    const hinted = exact.filter((m) => {
      const name = m.collectionName.trim().toLowerCase();
      return name.length >= 3 && lower.includes(name);
    });
    if (hinted.length === 1) {
      return { ok: true, match: hinted[0]! };
    }
    if (hinted.length === 0) {
      return {
        ok: false,
        error: `Persona „${personaName || personaId}“ kommt in mehreren Collections vor — bitte eine Collection wählen: ${exact
          .slice(0, 5)
          .map((m) => m.collectionName)
          .join(', ')}.`,
        ambiguous: exact.map((m) => ({
          collectionName: m.collectionName,
          platformProjectId: m.platformProjectId,
        })),
      };
    }
  }

  const best = pickBestPersonaCollectionMatch(matches, prompt);
  if (!best) {
    return {
      ok: false,
      error: `Persona „${personaName || personaId}“ in keiner zugänglichen Collection gefunden.`,
    };
  }
  return { ok: true, match: best };
}

function findCollectionNameInPrompt(
  prompt: string,
  collections: Array<{ id: string; name: string }>,
): string | null {
  const lower = prompt.toLowerCase();
  const hit = collections.find((c) => {
    const name = c.name.trim().toLowerCase();
    if (name.length < 3) return false;
    return lower.includes(name);
  });
  return hit?.id ?? null;
}

/**
 * Resolve Collection for persona→pages.
 * Prefer explicit id → persona catalog scan → Collection name in prompt.
 */
export async function resolvePersonaPageContext(input: {
  plexonUserId: string;
  platformProjectId?: string | null;
  prompt?: string;
  personaId?: string;
  personaName?: string;
  userRole?: string | null;
}): Promise<ResolvePersonaPageContextResult> {
  const explicit = input.platformProjectId?.trim();
  if (explicit) {
    return {
      ok: true,
      platformProjectId: explicit,
      personaId: input.personaId?.trim() || undefined,
      inferred: false,
    };
  }

  const hasPersonaCue = Boolean(input.personaId?.trim() || input.personaName?.trim());
  if (hasPersonaCue) {
    const found = await findPersonaAcrossAccessibleCollections({
      plexonUserId: input.plexonUserId,
      personaId: input.personaId,
      personaName: input.personaName,
      prompt: input.prompt,
    });
    if (found.ok) {
      return {
        ok: true,
        platformProjectId: found.match.platformProjectId,
        collectionName: found.match.collectionName,
        personaId: found.match.persona.id,
        summary: found.match.summary,
        inferred: true,
      };
    }
    if (found.ambiguous?.length) {
      return { ok: false, error: found.error };
    }
    // Persona cue present but no catalog hit — still try Collection name in prompt below.
  }

  const prompt = input.prompt?.trim() || '';
  if (prompt) {
    const collections = await listAccessibleCollectionsForUser(input.plexonUserId);
    const byName = findCollectionNameInPrompt(prompt, collections.items);
    if (byName) {
      return { ok: true, platformProjectId: byName, inferred: true };
    }
  }

  if (hasPersonaCue) {
    return {
      ok: false,
      error: `Persona „${input.personaName?.trim() || input.personaId}“ in keiner zugänglichen Collection gefunden.`,
    };
  }

  return {
    ok: false,
    error:
      'Collection-Kontext fehlt — bitte eine Collection wählen oder eine Persona nennen, die in einer zugänglichen Collection liegt.',
  };
}

/** @deprecated Use resolvePersonaPageContext — kept for call sites that only need an id. */
export async function resolvePersonaPagePlatformProjectId(input: {
  plexonUserId: string;
  platformProjectId?: string | null;
  prompt?: string;
  personaId?: string;
  personaName?: string;
  userRole?: string | null;
}): Promise<string | null> {
  const resolved = await resolvePersonaPageContext(input);
  return resolved.ok ? resolved.platformProjectId : null;
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
}): Promise<
  | { ok: true; preview: PersonaPageRelevancePreview; inferredPlatformProjectId?: string }
  | { ok: false; error: string }
> {
  const resolved = await resolvePersonaPageContext({
    plexonUserId: input.plexonUserId,
    userRole: input.userRole,
    platformProjectId: input.platformProjectId,
    prompt: input.prompt,
    personaId: input.personaId,
    personaName: input.personaName,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const platformProjectId = resolved.platformProjectId;
  const personaId = resolved.personaId || input.personaId;

  const audionSummary =
    resolved.summary ??
    (await fetchAudionPlatformProjectSummary(platformProjectId, input.plexonUserId));
  if (!audionSummary?.personas?.length) {
    return { ok: false, error: 'Keine AUDION-Personas in dieser Collection gefunden.' };
  }

  const personaCatalog = resolvePersonaFromCatalog(audionSummary.personas, {
    personaId,
    personaName: input.personaName,
  });
  if (!personaCatalog) {
    const names = audionSummary.personas.slice(0, 5).map((p) => p.name).join(', ');
    return {
      ok: false,
      error: `Persona nicht gefunden. Verfügbar (Auszug): ${names}`,
    };
  }

  const checkionProjectId = resolved.inferred
    ? (await fetchCheckionPlatformProjectSummary(platformProjectId, input.plexonUserId))
        ?.externalProjectId || null
    : input.checkionProjectId?.trim() ||
      (await fetchCheckionPlatformProjectSummary(platformProjectId, input.plexonUserId))
        ?.externalProjectId ||
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

  const audionProjectId = resolved.inferred
    ? audionSummary.externalProjectId
    : input.audionProjectId?.trim() || audionSummary.externalProjectId;

  return {
    ok: true,
    inferredPlatformProjectId: resolved.inferred ? platformProjectId : undefined,
    preview: {
      persona,
      domainScan,
      corpusMode: pagesRes.corpusMode,
      corpusTruncated,
      corpusMetrics: corpusAggregateMetrics(allItems),
      rankedPages,
      audionHref: pathAudionAdminProject(audionProjectId),
      checkionDomainHref: pathCheckionDomainResult(domainScan.id),
      platformProjectId,
      collectionName: resolved.collectionName,
    },
  };
}
