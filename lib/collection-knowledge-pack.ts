/**
 * Collection Knowledge Pack — types, empty factory, merge/validate helpers.
 * Spec: specs/domain/collection-knowledge-pack.md · specs/api/collection-knowledge-pack.md
 */

export const KNOWLEDGE_PACK_SCHEMA_VERSION = '2026-08-knowledge-pack-v1' as const;

export const KNOWLEDGE_FACET_IDS = [
  'profile',
  'competitive',
  'research_brief',
  'geo_context',
  'brand',
  'sources',
] as const;

export type KnowledgeFacetId = (typeof KNOWLEDGE_FACET_IDS)[number];

export type KnowledgeProductId = 'plexon' | 'audion' | 'checkion' | 'brandion';

export type FacetProvenance = {
  actorType: 'user' | 'service' | 'system';
  actorUserId?: string | null;
  productId?: KnowledgeProductId | null;
  runId?: string | null;
  sourceUri?: string | null;
  note?: string | null;
};

export type FacetDocument<T> = {
  facetId: KnowledgeFacetId;
  schemaVersion: typeof KNOWLEDGE_PACK_SCHEMA_VERSION;
  updatedAt: string;
  provenance: FacetProvenance;
  data: T;
};

export type ProfileData = {
  displayName: string;
  legalName: string | null;
  primaryDomain: string | null;
  aliases: string[];
  markets: string[];
  industry: string | null;
  tagline: string | null;
  languages: string[];
};

export type CompetitorRef = {
  host: string;
  label?: string | null;
  source: 'human' | 'checkion' | 'audion';
  confidence?: number | null;
};

export type CompetitiveData = {
  category: string | null;
  competitors: CompetitorRef[];
  notes: string | null;
};

export type ResearchSection = {
  id: string;
  title: string;
  plainText: string;
  bullets?: string[];
};

export type ResearchBriefData = {
  summary: string | null;
  sections: ResearchSection[];
  topics: string[];
  sourceRunId: string | null;
  sourceProjectId: string | null;
};

export type GeoContextData = {
  queryThemes: string[];
  seedQueries: string[];
  knownCompetitors: string[];
  targetHosts: string[];
  lastGeoJobId: string | null;
  notes: string | null;
};

export type BrandReservedData = {
  status: 'reserved' | 'active';
  guidelineRef: {
    product: 'brandion';
    guidelineId: string;
    version: string;
    url?: string;
  } | null;
  voiceSummary: string | null;
  tokenRefs: Array<{ kind: 'color' | 'font' | 'logo'; name: string; externalId?: string }>;
  activeGuidelineVersion: string | null;
};

export type SourceItem = {
  id: string;
  title: string;
  url: string;
  kind: 'link' | 'doc' | 'asset-ref';
  mime?: string | null;
  addedByProduct?: KnowledgeProductId | null;
  addedAt: string;
};

export type SourcesData = {
  items: SourceItem[];
};

export type KnowledgePackFacets = {
  profile: FacetDocument<ProfileData>;
  competitive: FacetDocument<CompetitiveData>;
  research_brief: FacetDocument<ResearchBriefData>;
  geo_context: FacetDocument<GeoContextData>;
  brand: FacetDocument<BrandReservedData>;
  sources: FacetDocument<SourcesData>;
};

export type KnowledgePackResponse = {
  platformProjectId: string;
  schemaVersion: typeof KNOWLEDGE_PACK_SCHEMA_VERSION;
  revision: number;
  updatedAt: string;
  updatedByUserId: string | null;
  facets: KnowledgePackFacets;
};

/** Soft size budgets (serialized JSON bytes). */
export const FACET_SIZE_BUDGETS: Record<KnowledgeFacetId, number> = {
  profile: 8 * 1024,
  competitive: 16 * 1024,
  research_brief: 64 * 1024,
  geo_context: 32 * 1024,
  brand: 16 * 1024,
  sources: 32 * 1024,
};

export const COMPETITIVE_HOST_CAP = 25;
export const GEO_SEED_QUERY_CAP = 24;
export const SOURCES_ITEM_CAP = 100;
export const RESEARCH_SECTION_CAP = 8;

const SYSTEM_PROVENANCE: FacetProvenance = {
  actorType: 'system',
  productId: 'plexon',
  note: 'lazy pack create',
};

function emptyEnvelope<T>(facetId: KnowledgeFacetId, data: T, at: string): FacetDocument<T> {
  return {
    facetId,
    schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
    updatedAt: at,
    provenance: { ...SYSTEM_PROVENANCE },
    data,
  };
}

export function createEmptyFacets(at = new Date().toISOString()): KnowledgePackFacets {
  return {
    profile: emptyEnvelope('profile', {
      displayName: '',
      legalName: null,
      primaryDomain: null,
      aliases: [],
      markets: [],
      industry: null,
      tagline: null,
      languages: [],
    }, at),
    competitive: emptyEnvelope('competitive', {
      category: null,
      competitors: [],
      notes: null,
    }, at),
    research_brief: emptyEnvelope('research_brief', {
      summary: null,
      sections: [],
      topics: [],
      sourceRunId: null,
      sourceProjectId: null,
    }, at),
    geo_context: emptyEnvelope('geo_context', {
      queryThemes: [],
      seedQueries: [],
      knownCompetitors: [],
      targetHosts: [],
      lastGeoJobId: null,
      notes: null,
    }, at),
    brand: emptyEnvelope('brand', {
      status: 'reserved',
      guidelineRef: null,
      voiceSummary: null,
      tokenRefs: [],
      activeGuidelineVersion: null,
    }, at),
    sources: emptyEnvelope('sources', { items: [] }, at),
  };
}

export function isKnowledgeFacetId(value: string): value is KnowledgeFacetId {
  return (KNOWLEDGE_FACET_IDS as readonly string[]).includes(value);
}

/** Products allowed to publish each facet via service publish endpoint. */
export const FACET_PUBLISH_OWNERS: Record<KnowledgeFacetId, KnowledgeProductId[]> = {
  profile: ['plexon', 'audion', 'checkion'],
  competitive: ['plexon', 'checkion', 'audion'],
  research_brief: ['audion', 'plexon'],
  geo_context: ['checkion'],
  brand: ['brandion'],
  sources: ['plexon', 'audion', 'checkion', 'brandion'],
};

export function productMayPublishFacet(
  facetId: KnowledgeFacetId,
  productId: KnowledgeProductId | null | undefined
): boolean {
  if (!productId) return false;
  if (facetId === 'brand') return false; // reserved until Brandion activates
  return FACET_PUBLISH_OWNERS[facetId].includes(productId);
}

export function assertFacetSize(facetId: KnowledgeFacetId, data: unknown): void {
  const bytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
  const budget = FACET_SIZE_BUDGETS[facetId];
  if (bytes > budget) {
    throw new FacetValidationError(
      `Facet ${facetId} exceeds size budget (${bytes} > ${budget} bytes)`,
      413
    );
  }
}

export class FacetValidationError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.name = 'FacetValidationError';
    this.status = status;
  }
}

function asStringArray(value: unknown, cap = 64): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, cap);
}

function normalizeHost(host: string): string {
  return host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
}

export function normalizeProfileData(input: unknown): ProfileData {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim() : '',
    legalName: typeof raw.legalName === 'string' ? raw.legalName.trim() || null : null,
    primaryDomain:
      typeof raw.primaryDomain === 'string'
        ? normalizeHost(raw.primaryDomain) || null
        : null,
    aliases: asStringArray(raw.aliases, 32),
    markets: asStringArray(raw.markets, 32),
    industry: typeof raw.industry === 'string' ? raw.industry.trim() || null : null,
    tagline: typeof raw.tagline === 'string' ? raw.tagline.trim().slice(0, 280) || null : null,
    languages: asStringArray(raw.languages, 16),
  };
}

export function normalizeCompetitiveData(input: unknown): CompetitiveData {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const competitorsRaw = Array.isArray(raw.competitors) ? raw.competitors : [];
  const competitors: CompetitorRef[] = [];
  const seen = new Set<string>();
  for (const item of competitorsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.host !== 'string') continue;
    const host = normalizeHost(row.host);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    const source =
      row.source === 'checkion' || row.source === 'audion' || row.source === 'human'
        ? row.source
        : 'human';
    competitors.push({
      host,
      label: typeof row.label === 'string' ? row.label.trim() || null : null,
      source,
      confidence:
        typeof row.confidence === 'number' && Number.isFinite(row.confidence)
          ? row.confidence
          : null,
    });
    if (competitors.length >= COMPETITIVE_HOST_CAP) break;
  }
  return {
    category: typeof raw.category === 'string' ? raw.category.trim() || null : null,
    competitors,
    notes: typeof raw.notes === 'string' ? raw.notes.trim().slice(0, 2000) || null : null,
  };
}

export function normalizeResearchBriefData(input: unknown): ResearchBriefData {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
  const sections: ResearchSection[] = [];
  for (const item of sectionsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.title !== 'string') continue;
    const plainText = typeof row.plainText === 'string' ? row.plainText : '';
    sections.push({
      id: row.id.trim(),
      title: row.title.trim().slice(0, 200),
      plainText: plainText.slice(0, 12_000),
      bullets: asStringArray(row.bullets, 24),
    });
    if (sections.length >= RESEARCH_SECTION_CAP) break;
  }
  return {
    summary:
      typeof raw.summary === 'string' ? raw.summary.trim().slice(0, 2000) || null : null,
    sections,
    topics: asStringArray(raw.topics, 48),
    sourceRunId: typeof raw.sourceRunId === 'string' ? raw.sourceRunId.trim() || null : null,
    sourceProjectId:
      typeof raw.sourceProjectId === 'string' ? raw.sourceProjectId.trim() || null : null,
  };
}

export function normalizeGeoContextData(input: unknown): GeoContextData {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    queryThemes: asStringArray(raw.queryThemes, 48),
    seedQueries: asStringArray(raw.seedQueries, GEO_SEED_QUERY_CAP),
    knownCompetitors: asStringArray(raw.knownCompetitors, COMPETITIVE_HOST_CAP).map(normalizeHost),
    targetHosts: asStringArray(raw.targetHosts, 32).map(normalizeHost),
    lastGeoJobId:
      typeof raw.lastGeoJobId === 'string' ? raw.lastGeoJobId.trim() || null : null,
    notes: typeof raw.notes === 'string' ? raw.notes.trim().slice(0, 2000) || null : null,
  };
}

export function normalizeBrandData(input: unknown): BrandReservedData {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  // Phase 1: always reserved — ignore attempts to activate
  return {
    status: 'reserved',
    guidelineRef: null,
    voiceSummary: typeof raw.voiceSummary === 'string' ? null : null,
    tokenRefs: [],
    activeGuidelineVersion: null,
  };
}

export function normalizeSourcesData(input: unknown): SourcesData {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: SourceItem[] = [];
  for (const item of itemsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.title !== 'string' || typeof row.url !== 'string') {
      continue;
    }
    const url = row.url.trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const kind =
      row.kind === 'doc' || row.kind === 'asset-ref' || row.kind === 'link' ? row.kind : 'link';
    items.push({
      id: row.id.trim(),
      title: row.title.trim().slice(0, 200),
      url,
      kind,
      mime: typeof row.mime === 'string' ? row.mime : null,
      addedByProduct:
        row.addedByProduct === 'plexon' ||
        row.addedByProduct === 'audion' ||
        row.addedByProduct === 'checkion' ||
        row.addedByProduct === 'brandion'
          ? row.addedByProduct
          : null,
      addedAt:
        typeof row.addedAt === 'string' ? row.addedAt : new Date().toISOString(),
    });
    if (items.length >= SOURCES_ITEM_CAP) break;
  }
  return { items };
}

export function normalizeFacetData(facetId: KnowledgeFacetId, data: unknown): unknown {
  switch (facetId) {
    case 'profile':
      return normalizeProfileData(data);
    case 'competitive':
      return normalizeCompetitiveData(data);
    case 'research_brief':
      return normalizeResearchBriefData(data);
    case 'geo_context':
      return normalizeGeoContextData(data);
    case 'brand':
      return normalizeBrandData(data);
    case 'sources':
      return normalizeSourcesData(data);
    default: {
      const _exhaustive: never = facetId;
      return _exhaustive;
    }
  }
}

function uniqueStrings(values: string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/** Deep-merge per facet (union lists, prefer non-empty scalar from incoming when set). */
export function mergeFacetData(
  facetId: KnowledgeFacetId,
  existing: unknown,
  incoming: unknown
): unknown {
  switch (facetId) {
    case 'profile': {
      const a = normalizeProfileData(existing);
      const b = normalizeProfileData(incoming);
      return {
        displayName: b.displayName || a.displayName,
        legalName: b.legalName ?? a.legalName,
        primaryDomain: b.primaryDomain ?? a.primaryDomain,
        aliases: uniqueStrings([...a.aliases, ...b.aliases], 32),
        markets: uniqueStrings([...a.markets, ...b.markets], 32),
        industry: b.industry ?? a.industry,
        tagline: b.tagline ?? a.tagline,
        languages: uniqueStrings([...a.languages, ...b.languages], 16),
      } satisfies ProfileData;
    }
    case 'competitive': {
      const a = normalizeCompetitiveData(existing);
      const b = normalizeCompetitiveData(incoming);
      const byHost = new Map<string, CompetitorRef>();
      for (const c of a.competitors) byHost.set(c.host, c);
      for (const c of b.competitors) byHost.set(c.host, { ...byHost.get(c.host), ...c });
      return {
        category: b.category ?? a.category,
        competitors: [...byHost.values()].slice(0, COMPETITIVE_HOST_CAP),
        notes: b.notes ?? a.notes,
      } satisfies CompetitiveData;
    }
    case 'research_brief': {
      const a = normalizeResearchBriefData(existing);
      const b = normalizeResearchBriefData(incoming);
      const byId = new Map<string, ResearchSection>();
      for (const s of a.sections) byId.set(s.id, s);
      for (const s of b.sections) byId.set(s.id, s);
      return {
        summary: b.summary ?? a.summary,
        sections: [...byId.values()].slice(0, RESEARCH_SECTION_CAP),
        topics: uniqueStrings([...a.topics, ...b.topics], 48),
        sourceRunId: b.sourceRunId ?? a.sourceRunId,
        sourceProjectId: b.sourceProjectId ?? a.sourceProjectId,
      } satisfies ResearchBriefData;
    }
    case 'geo_context': {
      const a = normalizeGeoContextData(existing);
      const b = normalizeGeoContextData(incoming);
      return {
        queryThemes: uniqueStrings([...a.queryThemes, ...b.queryThemes], 48),
        seedQueries: uniqueStrings([...a.seedQueries, ...b.seedQueries], GEO_SEED_QUERY_CAP),
        knownCompetitors: uniqueStrings(
          [...a.knownCompetitors, ...b.knownCompetitors],
          COMPETITIVE_HOST_CAP
        ),
        targetHosts: uniqueStrings([...a.targetHosts, ...b.targetHosts], 32),
        lastGeoJobId: b.lastGeoJobId ?? a.lastGeoJobId,
        notes: b.notes ?? a.notes,
      } satisfies GeoContextData;
    }
    case 'brand':
      return normalizeBrandData(incoming);
    case 'sources': {
      const a = normalizeSourcesData(existing);
      const b = normalizeSourcesData(incoming);
      const byId = new Map<string, SourceItem>();
      for (const s of a.items) byId.set(s.id, s);
      for (const s of b.items) byId.set(s.id, s);
      return { items: [...byId.values()].slice(0, SOURCES_ITEM_CAP) } satisfies SourcesData;
    }
    default: {
      const _exhaustive: never = facetId;
      return _exhaustive;
    }
  }
}

export function normalizeProvenance(
  input: unknown,
  fallback: FacetProvenance
): FacetProvenance {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const actorType =
    raw.actorType === 'user' || raw.actorType === 'service' || raw.actorType === 'system'
      ? raw.actorType
      : fallback.actorType;
  const productId =
    raw.productId === 'plexon' ||
    raw.productId === 'audion' ||
    raw.productId === 'checkion' ||
    raw.productId === 'brandion'
      ? raw.productId
      : fallback.productId ?? null;
  return {
    actorType,
    actorUserId:
      typeof raw.actorUserId === 'string'
        ? raw.actorUserId
        : fallback.actorUserId ?? null,
    productId,
    runId: typeof raw.runId === 'string' ? raw.runId : fallback.runId ?? null,
    sourceUri: typeof raw.sourceUri === 'string' ? raw.sourceUri : fallback.sourceUri ?? null,
    note: typeof raw.note === 'string' ? raw.note : fallback.note ?? null,
  };
}

export function ensureFacetsShape(facets: unknown, at = new Date().toISOString()): KnowledgePackFacets {
  const empty = createEmptyFacets(at);
  if (!facets || typeof facets !== 'object') return empty;
  const raw = facets as Record<string, unknown>;
  const out = { ...empty };
  for (const id of KNOWLEDGE_FACET_IDS) {
    const facet = raw[id];
    if (!facet || typeof facet !== 'object') continue;
    const doc = facet as Partial<FacetDocument<unknown>>;
    const data = normalizeFacetData(id, doc.data);
    out[id] = {
      facetId: id,
      schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
      updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : at,
      provenance: normalizeProvenance(doc.provenance, empty[id].provenance),
      data: data as never,
    } as KnowledgePackFacets[typeof id];
  }
  // Brand always reserved in Phase 1
  out.brand = {
    ...out.brand,
    data: { ...normalizeBrandData(out.brand.data), status: 'reserved' },
  };
  return out;
}

export function toKnowledgePackResponse(row: {
  platformProjectId: string;
  revision: number;
  schemaVersion: string;
  facets: unknown;
  updatedAt: Date | string;
  updatedByUserId: string | null;
}): KnowledgePackResponse {
  const at =
    row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt);
  return {
    platformProjectId: row.platformProjectId,
    schemaVersion: KNOWLEDGE_PACK_SCHEMA_VERSION,
    revision: row.revision,
    updatedAt: at,
    updatedByUserId: row.updatedByUserId,
    facets: ensureFacetsShape(row.facets, at),
  };
}

export function facetPreview(facetId: KnowledgeFacetId, data: unknown): string {
  switch (facetId) {
    case 'profile': {
      const d = normalizeProfileData(data);
      return d.displayName || d.primaryDomain || d.tagline || 'Empty profile';
    }
    case 'competitive': {
      const d = normalizeCompetitiveData(data);
      if (d.competitors.length === 0) return 'No competitors yet';
      return `${d.competitors.length} rival${d.competitors.length === 1 ? '' : 's'}${d.category ? ` · ${d.category}` : ''}`;
    }
    case 'research_brief': {
      const d = normalizeResearchBriefData(data);
      if (d.summary) return d.summary.slice(0, 120);
      if (d.sections.length) return `${d.sections.length} section${d.sections.length === 1 ? '' : 's'}`;
      return 'No research distillate';
    }
    case 'geo_context': {
      const d = normalizeGeoContextData(data);
      if (d.queryThemes.length) return d.queryThemes.slice(0, 3).join(' · ');
      if (d.seedQueries.length) return `${d.seedQueries.length} seed queries`;
      return 'No GEO context';
    }
    case 'brand':
      return 'Coming with Brandion';
    case 'sources': {
      const d = normalizeSourcesData(data);
      if (d.items.length === 0) return 'No sources';
      return `${d.items.length} source${d.items.length === 1 ? '' : 's'}`;
    }
    default:
      return '';
  }
}

export function isFacetContentEmpty(facetId: KnowledgeFacetId, data: unknown): boolean {
  switch (facetId) {
    case 'profile': {
      const d = normalizeProfileData(data);
      return !(
        d.displayName ||
        d.legalName ||
        d.primaryDomain ||
        d.aliases.length ||
        d.markets.length ||
        d.industry ||
        d.tagline ||
        d.languages.length
      );
    }
    case 'competitive': {
      const d = normalizeCompetitiveData(data);
      return !(d.category || d.competitors.length || d.notes);
    }
    case 'research_brief': {
      const d = normalizeResearchBriefData(data);
      return !(d.summary || d.sections.length || d.topics.length);
    }
    case 'geo_context': {
      const d = normalizeGeoContextData(data);
      return !(
        d.queryThemes.length ||
        d.seedQueries.length ||
        d.knownCompetitors.length ||
        d.targetHosts.length ||
        d.notes
      );
    }
    case 'brand':
      return true; // reserved always "empty" for content purposes
    case 'sources':
      return normalizeSourcesData(data).items.length === 0;
    default:
      return true;
  }
}

/** Overview teaser readiness — no facet bodies. */
export type KnowledgeFacetReadinessStatus = 'filled' | 'empty' | 'reserved';

export type KnowledgeFacetReadiness = {
  facetId: KnowledgeFacetId;
  status: KnowledgeFacetReadinessStatus;
};

export function buildKnowledgeFacetReadiness(
  facets: KnowledgePackFacets
): KnowledgeFacetReadiness[] {
  return KNOWLEDGE_FACET_IDS.map((facetId) => {
    if (facetId === 'brand') {
      return { facetId, status: 'reserved' as const };
    }
    const empty = isFacetContentEmpty(facetId, facets[facetId].data);
    return { facetId, status: empty ? ('empty' as const) : ('filled' as const) };
  });
}
