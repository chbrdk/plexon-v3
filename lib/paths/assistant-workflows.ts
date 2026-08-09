/** Assistant workflow tuning — central constants (no hardcoding in runners). */
export const EVENT_QUICK_CHECK_PLAYBOOK_ID = 'event_quick_check' as const;
/** Static report template id (UiBlock + PDF/PPTX). */
export const EVENT_QUICK_CHECK_REPORT_TEMPLATE_ID = 'event_quick_check' as const;

/** Scan depth: quick = event demo; complete = CHECKION project parity (deep scan + competitors). */
export type EventQuickCheckDepth = 'quick' | 'complete';

export type EventQuickCheckProfile = {
  depth: EventQuickCheckDepth;
  /** Domain scan page limit (own domain; also applies to competitor scans via domain-scan-all). */
  scanMaxPages: number;
  /** Distinct buyer segments / AUDION target groups. */
  targetGroupCount: number;
  /** Total AUDION personas to generate (distributed across target groups). */
  personaCount: number;
  geoQuestionsPerPersona: number;
  /** When true, competitors are stored on the CHECKION project and scanned via domain-scan-all. */
  scanCompetitors: boolean;
  /** Competitor domains to scan (own domain is always included). */
  maxCompetitors: number;
  /** Complete mode requires a bound CHECKION project before deep scan / competitor persistence. */
  requireCheckionProject: boolean;
  /** Pass classifyPageTopics=true to CHECKION domain-scan-all (optional LLM page topics). */
  classifyPageTopics: boolean;
};

/** Optional per-run overrides (start form / create API). */
export type EventQuickCheckProfileOverrides = {
  scanMaxPages?: number;
  targetGroupCount?: number;
  personaCount?: number;
  maxCompetitors?: number;
};

export const EVENT_QUICK_CHECK_PERSONA_COUNT_MIN = 1;
export const EVENT_QUICK_CHECK_PERSONA_COUNT_MAX = 5;
export const EVENT_QUICK_CHECK_TARGET_GROUP_COUNT_MIN = 1;
export const EVENT_QUICK_CHECK_TARGET_GROUP_COUNT_MAX = 5;
export const EVENT_QUICK_CHECK_COMPETITOR_COUNT_MIN = 0;
export const EVENT_QUICK_CHECK_COMPETITOR_COUNT_MAX = 5;
export const EVENT_QUICK_CHECK_SCAN_MAX_PAGES_MIN = 10;
export const EVENT_QUICK_CHECK_SCAN_MAX_PAGES_MAX = 2000;

export const EVENT_QUICK_CHECK_PROFILES: Record<EventQuickCheckDepth, EventQuickCheckProfile> = {
  quick: {
    depth: 'quick',
    scanMaxPages: 50,
    targetGroupCount: 1,
    personaCount: 1,
    geoQuestionsPerPersona: 3,
    scanCompetitors: false,
    maxCompetitors: 0,
    requireCheckionProject: false,
    classifyPageTopics: false,
  },
  complete: {
    depth: 'complete',
    scanMaxPages: 1000,
    targetGroupCount: 3,
    personaCount: 3,
    geoQuestionsPerPersona: 3,
    scanCompetitors: true,
    maxCompetitors: 3,
    requireCheckionProject: true,
    classifyPageTopics: false,
  },
};

/** @deprecated use resolveEventQuickCheckProfile('quick').scanMaxPages */
export const EVENT_QUICK_CHECK_SCAN_MAX_PAGES = EVENT_QUICK_CHECK_PROFILES.quick.scanMaxPages;

/** @deprecated use resolveEventQuickCheckProfile('quick').geoQuestionsPerPersona */
export const EVENT_QUICK_CHECK_GEO_QUESTION_COUNT =
  EVENT_QUICK_CHECK_PROFILES.quick.geoQuestionsPerPersona;

export function clampEventQuickCheckPersonaCount(value: number): number {
  return Math.max(
    EVENT_QUICK_CHECK_PERSONA_COUNT_MIN,
    Math.min(EVENT_QUICK_CHECK_PERSONA_COUNT_MAX, Math.floor(value))
  );
}

export function clampEventQuickCheckTargetGroupCount(value: number): number {
  return Math.max(
    EVENT_QUICK_CHECK_TARGET_GROUP_COUNT_MIN,
    Math.min(EVENT_QUICK_CHECK_TARGET_GROUP_COUNT_MAX, Math.floor(value))
  );
}

export function clampEventQuickCheckCompetitorCount(value: number): number {
  return Math.max(
    EVENT_QUICK_CHECK_COMPETITOR_COUNT_MIN,
    Math.min(EVENT_QUICK_CHECK_COMPETITOR_COUNT_MAX, Math.floor(value))
  );
}

export function clampEventQuickCheckScanMaxPages(value: number): number {
  return Math.max(
    EVENT_QUICK_CHECK_SCAN_MAX_PAGES_MIN,
    Math.min(EVENT_QUICK_CHECK_SCAN_MAX_PAGES_MAX, Math.floor(value))
  );
}

function parseOptionalInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function parseEventQuickCheckProfileOverrides(
  raw: Record<string, unknown> | null | undefined
): EventQuickCheckProfileOverrides {
  if (!raw) return {};
  const overrides: EventQuickCheckProfileOverrides = {};

  const pages = parseOptionalInt(raw.scanMaxPages ?? raw.scan_max_pages);
  if (pages != null) overrides.scanMaxPages = clampEventQuickCheckScanMaxPages(pages);

  const personas = parseOptionalInt(raw.personaCount ?? raw.persona_count);
  if (personas != null) overrides.personaCount = clampEventQuickCheckPersonaCount(personas);

  const targetGroups = parseOptionalInt(raw.targetGroupCount ?? raw.target_group_count);
  if (targetGroups != null) {
    overrides.targetGroupCount = clampEventQuickCheckTargetGroupCount(targetGroups);
  } else if (personas != null && raw.targetGroupCount == null && raw.target_group_count == null) {
    // Legacy runs stored only personaCount as 1:1 TG↔persona.
    overrides.targetGroupCount = clampEventQuickCheckTargetGroupCount(personas);
  }

  const competitors = parseOptionalInt(
    raw.maxCompetitors ?? raw.max_competitors ?? raw.competitorCount
  );
  if (competitors != null) overrides.maxCompetitors = clampEventQuickCheckCompetitorCount(competitors);

  return overrides;
}

/**
 * Distribute total personas across target groups (round-robin).
 * Example: 3 TGs + 5 personas → [2, 2, 1]
 */
export function allocatePersonasPerTargetGroup(
  targetGroupCount: number,
  personaCount: number
): number[] {
  const tg = clampEventQuickCheckTargetGroupCount(targetGroupCount);
  const personas = clampEventQuickCheckPersonaCount(personaCount);
  const out = Array.from({ length: tg }, () => 0);
  for (let i = 0; i < personas; i += 1) {
    out[i % tg] += 1;
  }
  return out;
}

export function resolveEventQuickCheckProfile(
  depth?: EventQuickCheckDepth | string | null,
  overrides?: EventQuickCheckProfileOverrides | null
): EventQuickCheckProfile {
  const base =
    depth === 'complete' ? EVENT_QUICK_CHECK_PROFILES.complete : EVENT_QUICK_CHECK_PROFILES.quick;
  const scanMaxPages =
    overrides?.scanMaxPages != null
      ? clampEventQuickCheckScanMaxPages(overrides.scanMaxPages)
      : base.scanMaxPages;
  const personaCount =
    overrides?.personaCount != null
      ? clampEventQuickCheckPersonaCount(overrides.personaCount)
      : base.personaCount;
  const targetGroupCount =
    overrides?.targetGroupCount != null
      ? clampEventQuickCheckTargetGroupCount(overrides.targetGroupCount)
      : overrides?.personaCount != null && overrides.targetGroupCount == null
        ? clampEventQuickCheckTargetGroupCount(overrides.personaCount)
        : base.targetGroupCount;
  const maxCompetitors =
    overrides?.maxCompetitors != null
      ? clampEventQuickCheckCompetitorCount(overrides.maxCompetitors)
      : base.maxCompetitors;
  return {
    ...base,
    scanMaxPages,
    targetGroupCount,
    personaCount,
    maxCompetitors,
    scanCompetitors: maxCompetitors > 0,
    requireCheckionProject: base.requireCheckionProject || maxCompetitors > 0,
  };
}

/** Resolve depth + optional count overrides from workflow run `result`. */
export function resolveEventQuickCheckProfileFromStored(
  stored: Record<string, unknown> | null | undefined
): EventQuickCheckProfile {
  const depth = stored?.depth === 'complete' ? 'complete' : 'quick';
  return resolveEventQuickCheckProfile(depth, parseEventQuickCheckProfileOverrides(stored));
}

export const EVENT_QUICK_CHECK_RESEARCH_MAX_MS = 90_000;
/** ECHON market research in Quick Check (disabled — too slow for event demos; re-enable via flag). */
export const EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED = false;
/** Max wall-clock wait for ECHON fast research (started at prepare, finalized before aggregate). */
export const EVENT_QUICK_CHECK_ECHON_RESEARCH_MAX_MS = 240_000;
export const EVENT_QUICK_CHECK_BINDING_SOURCE = 'plexon-event-quick-check-bindings';
/** CHECKION steps (scan, GEO) run with URL only — no Plattform-/CHECKION-Projekt required. */
export const EVENT_QUICK_CHECK_CHECKION_PROJECT_OPTIONAL = true;
