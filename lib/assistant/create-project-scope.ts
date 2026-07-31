/** Collection create target — Phase 1: always PLEXON Collection (both product mirrors). */
export type CreateProjectTarget = 'platform';

const AUDIENCE_ENTITY_PATTERN = /\b(zielgruppe|zielgruppen|target\s*groups?|personas?)\b/i;

const EXPLICIT_PROJECT_CREATE_PATTERNS = [
  /\b(neues?\s+)?projekt\b.*\b(anleg|erstell|create)\w*/i,
  /\b(anleg|erstell|create)\w*\b.*\b(neues?\s+)?projekt\b/i,
  /\bprojekt\s+anlegen\b/i,
  /\bnew\s+project\b/i,
];

const STOPWORDS = new Set([
  'anlegen',
  'erstellen',
  'create',
  'new',
  'neues',
  'neue',
  'neuem',
  'ein',
  'eine',
  'einem',
  'leg',
  'lege',
  'kannst',
  'du',
  'mir',
  'bitte',
]);

function extractQuotedName(text: string): string | undefined {
  const m = text.match(/['"„]([^'"”]+)['"”]/);
  return m?.[1]?.trim();
}

function cleanProjectNameCandidate(raw: string): string | undefined {
  let s = raw.trim().replace(/\s+(anlegen|erstellen|create)$/i, '').trim();
  if (s.length < 2) return undefined;
  const lower = s.toLowerCase();
  if (STOPWORDS.has(lower)) return undefined;
  return s;
}

/**
 * Create target is always a Collection (`platform`).
 * Product mentions ("in audion", "nur checkion") no longer select a product-only project type —
 * see `specs/domain/collection-projects.md` Phase 1.
 */
export function detectCreateProjectTarget(_text: string): CreateProjectTarget {
  return 'platform';
}

export function extractScopedProjectName(text: string): string | undefined {
  const quoted = extractQuotedName(text);
  if (quoted) return quoted;

  const inProduct = text.match(
    /\b(?:neues?\s+)?projekt\s+(.+?)\s+in\s+(?:audion|checkion)\b/i
  );
  if (inProduct?.[1]) {
    const name = cleanProjectNameCandidate(inProduct[1]);
    if (name) return name;
  }

  const named = text.match(/\bprojekt\s+([A-Za-z0-9ÄÖÜäöü][\w\sÄÖÜäöüß-]{2,60})/i);
  if (named?.[1]) {
    const candidate = named[1].trim();
    const withoutProduct = candidate.replace(/\s+in\s+(audion|checkion).*$/i, '').trim();
    const name = cleanProjectNameCandidate(withoutProduct);
    if (name) return name;
  }

  return undefined;
}

function isExplicitProjectCreateIntent(text: string): boolean {
  return EXPLICIT_PROJECT_CREATE_PATTERNS.some((p) => p.test(text));
}

/**
 * Cross-product workflows (e.g. CHECKION project → AUDION target groups) must not
 * hit the deterministic create_platform_project handlers.
 */
export function isAudienceWorkflowIntent(text: string): boolean {
  if (!AUDIENCE_ENTITY_PATTERN.test(text)) return false;

  const hasCheckion = /\bcheckion\b/i.test(text);
  const hasAudion = /\baudion\b/i.test(text);
  const fromCheckion =
    /\b(aus|from|von)\s+checkion\b/i.test(text) ||
    (hasCheckion && /\b(projekt|project|scan|daten|wissen)\b/i.test(text));
  const toAudion = /\b(für|in|nach|to)\s+audion\b/i.test(text) || hasAudion;
  const deriveAction = /\b(ableit|deriv|übertrag|transfer|erstell|anleg|generier|bootstrap|anguck|anschau|analysier)\w*/i.test(
    text
  );

  if (fromCheckion && toAudion) return true;
  if (hasCheckion && hasAudion && deriveAction) return true;
  if (deriveAction && !isExplicitProjectCreateIntent(text)) return true;

  return false;
}

/** True when the prompt should run a deterministic Collection project-create workflow. */
export function matchesCreateProjectIntent(text: string, patterns: RegExp[]): boolean {
  if (isAudienceWorkflowIntent(text)) return false;

  if (AUDIENCE_ENTITY_PATTERN.test(text) && !isExplicitProjectCreateIntent(text)) {
    return false;
  }

  if (/\bnur\s+in\s+(audion|checkion)\b/i.test(text)) {
    return patterns.some((p) => p.test(text));
  }

  const looseProductCreate =
    /\b(in\s+)?audion\b.*\banlegen\b/i.test(text) ||
    /\banlegen\b.*\b(in\s+)?audion\b/i.test(text) ||
    /\b(in\s+)?checkion\b.*\banlegen\b/i.test(text) ||
    /\b(lege|erstelle)\b.*\b(in\s+)?audion\b/i.test(text) ||
    /\b(lege|erstelle)\b.*\b(in\s+)?checkion\b/i.test(text);

  // Phase 1: product-worded creates still match when explicit "projekt … anlegen" — routed to Collection.
  if (looseProductCreate && !isExplicitProjectCreateIntent(text) && !/\bprojekt\b/i.test(text)) {
    return false;
  }

  return patterns.some((p) => p.test(text));
}
