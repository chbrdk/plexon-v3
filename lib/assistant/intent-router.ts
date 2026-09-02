import {
  extractScopedProjectName,
  matchesCreateProjectIntent,
} from '@/lib/assistant/create-project-scope';
import {
  extractContrastHexPair,
  extractScanIdFromText,
  extractUrlFromText,
} from '@/lib/assistant/conversation-context';
import { inferPersonaPageSpineUrlHint } from '@/lib/integrations/persona-page-relevance-client';
import { EVENT_QUICK_CHECK_PLAYBOOK_ID } from '@/lib/paths/assistant-workflows';

export type AssistantIntent =
  | { type: 'free_chat' }
  | { type: 'create_project'; name?: string; domain?: string; startResearch?: boolean }
  | { type: 'create_audion_project'; name?: string; startResearch?: boolean }
  | { type: 'create_checkion_project'; name?: string; domain?: string; startResearch?: boolean }
  | { type: 'quick_scan'; url: string; summarize?: boolean }
  | { type: 'pagespeed_check'; url: string }
  | { type: 'domain_scan'; url: string }
  | { type: 'contrast_check'; foreground: string; background: string }
  | { type: 'readability_check'; url: string }
  | { type: 'scan_summarize'; scanId?: string }
  | { type: 'sync_diagnose' }
  | { type: 'persona_bootstrap'; name?: string; targetGroupName?: string }
  | {
      type: 'persona_page_relevance';
      personaId?: string;
      personaName?: string;
      domainScanId?: string;
      urlHint?: string;
      topK?: number;
    }
  | {
      type: 'journey_outline';
      journeyId?: string;
      journeyName?: string;
      validate?: boolean;
    }
  | {
      type: 'journey_generate';
      journeyType?: string;
      targetGroupName?: string;
      validate?: boolean;
    }
  | { type: 'geo_analysis'; url: string; deep?: boolean }
  | { type: 'ssl_check'; host: string }
  | { type: 'wayback_check'; url: string }
  | {
      type: 'run_playbook';
      playbookId: string;
      url: string;
      projectName?: string;
      contrast?: { foreground: string; background: string };
      skipGeo?: boolean;
    }
  | { type: 'project_status' }
  | { type: 'start_research'; platformProjectId?: string }
  | { type: 'capabilities' }
  | { type: 'ui_showcase' }
  | {
      type: 'run_collection_flow';
      flowId?: string;
      flowName?: string;
      url?: string;
      listOnly?: boolean;
    }
  | {
      type: 'promote_capability_sequence';
      confirm?: boolean;
      name?: string;
    };

const CREATE_PATTERNS = [
  /\b(lege|erstelle|create|neues?)\b.*\b(projekt|project)\b/i,
  /\bprojekt\s+anlegen\b/i,
  /\bnew\s+project\b/i,
  /\b(in\s+)?audion\b.*\banlegen\b/i,
  /\banlegen\b.*\b(in\s+)?audion\b/i,
  /\b(in\s+)?checkion\b.*\banlegen\b/i,
  /\b(lege|erstelle)\b.*\b(in\s+)?audion\b/i,
  /\b(lege|erstelle)\b.*\b(in\s+)?checkion\b/i,
  /\bnur\s+in\s+audion\b/i,
  /\bnur\s+in\s+checkion\b/i,
];

const RESEARCH_PATTERNS = [
  /\b(starte?|start)\b.*\bresearch\b/i,
  /\bresearch\s+starten\b/i,
  /\b(recherche|recherchieren)\b/i,
  /\b(starte?|start)\b.*\brecherche\b/i,
  /\bwebsite-?research\b/i,
  /\b(website-?analyse|marktanalyse)\b/i,
  /\banalysier\w*\b.*\b(website|projekt|domain)\b/i,
];

const STATUS_PATTERNS = [
  /\b(status|zusammenfassung|summary|übersicht)\b.*\b(projekt|project)\b/i,
  /\bprojekt\s*status\b/i,
  /\b(wie steht|fortschritt|überblick)\b.*\b(projekt|project)\b/i,
];

const SYNC_DIAGNOSE_PATTERNS = [
  /\bsync(hronis)?\b/i,
  /\baudion\s*✗/i,
  /\bcheckion\s*✗/i,
  /\bwarum\s+.*\b(sync|fehl)\b/i,
  /\bsync-?diagnose\b/i,
];

const QUICK_SCAN_PATTERNS = [
  /\bscan(nen|ne)?\b/i,
  /\baccessibility\b/i,
  /\bwcag\b/i,
  /\bbarrierefrei/i,
];

const DOMAIN_SCAN_PATTERNS = [
  /\b(domain|deep)\s*scan\b/i,
  /\bganze\s+domain\b/i,
  /\bdomain\b.*\b(crawl|scannen)\b/i,
  /\bcrawl\b.*\bdomain\b/i,
];

const READABILITY_PATTERNS = [/\blesbarkeit\b/i, /\breadability\b/i, /\bflesch\b/i];

const CONTRAST_PATTERNS = [/\bkontrast\b/i, /\bcontrast\b/i, /\bwcag\b.*\bkontrast\b/i];

const SCAN_SUMMARIZE_PATTERNS = [
  /\b(fasse|fasst)\b.*\bscan\b.*\bzusammen\b/i,
  /\bscan\b.*\bzusammenfass/i,
  /\bsummarize\b.*\bscan\b/i,
  /\bscan-?summary\b/i,
];

const QUICK_SCAN_SUMMARIZE_INLINE = /\b(und\s+)?(fasse|fasst)\b.*\bzusammen\b/i;

const PAGESPEED_PATTERNS = [/\bpagespeed\b/i, /\bperformance\s*score\b/i];

const PERSONA_PAGE_RELEVANCE_PATTERNS = [
  /\brelevante\s+seiten?\b/i,
  /\bwelche\s+seiten?\b/i,
  /\bpage\s+relevance\b/i,
  /\btouchpoints?\b.*\bpersona\b/i,
  /\bpersona\b.*\b(seiten|urls|seite|website|webseite)\b/i,
  /\b(seiten|urls|webseiten)\b.*\bpersona\b/i,
  /\b(seite|seiten|urls|webseiten)\b.*\brelevant\b/i,
  /\brelevant\b.*\b(seite|seiten|urls|webseiten)\b/i,
  /\bwo\s+landet\b.*\bpersona\b/i,
];

const PERSONA_BOOTSTRAP_PATTERNS = [
  /\bpersona\b.*\b(generier\w*|erstell\w*|bootstrap|anlegen)\b/i,
  /\b(generier\w*|erstell\w*|bootstrap)\b.*\bpersona\b/i,
  /\bzielgruppe\b.*\bpersona\b/i,
  /\bpersona-?bootstrap\b/i,
  /\beasy\s*setup\b/i,
];

const JOURNEY_GENERATE_PATTERNS = [
  /\bjourney\s*-?\s*generate\b/i,
  /\b(generier\w*|erstell\w*|anlegen)\b.*\b(customer\s*)?(journey|nutzerreise)\b/i,
  /\b(customer\s*)?(journey|nutzerreise)\b.*\b(generier\w*|erstell\w*|anlegen)\b/i,
];

const JOURNEY_OUTLINE_PATTERNS = [
  /\bjourney\s*-?\s*outline\b/i,
  /\b(customer\s*)?journey\b.*\b(zeig|zeige|show|outline|übersicht|detail|öffnen)\b/i,
  /\b(zeig|zeige|show)\b.*\b(customer\s*)?journey\b/i,
  /\bnutzerreise\b.*\b(zeig|zeige|show|outline|übersicht|detail|validier)\w*\b/i,
  /\b(zeig|zeige|show)\b.*\bnutzerreise\b/i,
  /\b(journey|nutzerreise)\b.*\bvalidier\w*\b/i,
  /\bvalidier\w*\b.*\b(journey|nutzerreise)\b/i,
];

function extractPersonaName(text: string): string | undefined {
  const quoted = text.match(/["„“]([^"„“]{2,80})["„“]/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  // "für Jana Schmitt aus …" / "für persona Sandra" — case-insensitive (chat often lowercase).
  // Cap at first+last; never swallow stop words like "besonders"/"relevant" as surname.
  const named = text.match(
    /\bfür\s+(?:persona\s+)?([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]{1,40}(?:\s+(?!(?:aus|auf|mit|besonders|relevant|und|checkion|metriken)\b)[A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]{1,40})?)(?=\s|$|[,.(—–-])/i,
  );
  const candidate = named?.[1]?.trim();
  if (candidate && !/^persona$/i.test(candidate)) return candidate;
  const paren = text.match(/\(([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß\s-]{2,80})\)/);
  if (paren?.[1]?.trim()) return paren[1].trim();
  return undefined;
}

function extractTopK(text: string): number | undefined {
  const m = text.match(/\btop\s+(\d{1,2})\b/i);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : undefined;
}

function extractPersonaId(text: string): string | undefined {
  const slug = text.match(/\b(persona-[a-z0-9][a-z0-9-]*)\b/i);
  if (slug?.[1]) return slug[1];
  const uuid = text.match(
    /\b([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\b/i,
  );
  return uuid?.[1];
}

function extractDomainScanId(text: string): string | undefined {
  const explicit = text.match(/\bdomain[-\s]?scan\s+([a-z0-9-]{4,})\b/i);
  if (explicit?.[1]) return explicit[1];
  return extractScanIdFromText(text);
}

function extractJourneyId(text: string): string | undefined {
  const slug = text.match(/\b(journey-[a-z0-9][a-z0-9-]*)\b/i);
  if (slug?.[1]) return slug[1];
  const uuid = text.match(
    /\b([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\b/i
  );
  return uuid?.[1];
}

function extractJourneyName(text: string): string | undefined {
  const quoted = text.match(/["„“]([^"„“]{2,80})["„“]/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  const named = text.match(
    /\b(?:journey|nutzerreise)\s+(?:outline\s+)?(?:für|for|von|namens)?\s*["„“]?([A-Za-zÄÖÜäöüß0-9][\wÄÖÜäöüß &\-]{1,60})/i
  );
  const candidate = named?.[1]?.trim();
  if (!candidate) return undefined;
  if (/^(outline|übersicht|detail|validieren|zeigen)$/i.test(candidate)) return undefined;
  return candidate;
}

const GEO_PATTERNS = [
  /\bgeo\b/i,
  /\be-?e-?a-?t\b/i,
  /\bseo\b.*\b(analys|geo)\b/i,
  /\bwettbewerber/i,
  /\bcompetitor/i,
];

const SSL_PATTERNS = [/\bssl\b/i, /\bzertifikat/i, /\btls\b/i, /\bssl-?labs\b/i];

const WAYBACK_PATTERNS = [/\bwayback\b/i, /\bwebarchive\b/i, /\barchive\.org\b/i, /\barchiv-?historie\b/i];

const LAUNCH_READINESS_PATTERNS = [
  /\blaunch\s*readiness\b/i,
  /\bgo\s*live\s*check\b/i,
  /\bprojekt\s*onboarding\b/i,
  /\bonboarding\b.*\bprojekt\b/i,
  /\blaunch\b.*\b(check|report|readiness)\b/i,
];

const EVENT_QUICK_CHECK_PATTERNS = [
  /\bevent\s*quick\s*check\b/i,
  /\bquick\s*check\b/i,
  /\bfast\s*check\b/i,
  /\brapid\s*check\b/i,
  /\bcompany\s*quick\s*check\b/i,
  /\btrade\s*show\s*check\b/i,
  /\bevent\s*demo\b/i,
  /\bquick\s*demo\b/i,
  /\bschnell\s*check\b/i,
  /\bschnellcheck\b/i,
  /\bevent\s*check\b/i,
  /\bmesse\s*check\b/i,
  /\bdemo\s*check\b/i,
];

const MARKET_TO_AUDIENCE_PATTERNS = [
  /\bmarkt\s*→\s*zielgruppe/i,
  /\bmarket\s*to\s*audience\b/i,
  /\bmarkt\b.*\b(zielgruppe|target\s*groups?)\b/i,
  /\b(zielgruppe|target\s*groups?).*\b(markt|echon|trend)/i,
  /\bechon\b.*\b(zielgruppe|audion)\b/i,
  /\bmarkttrend/i,
];

const RUN_COLLECTION_FLOW_PATTERNS = [
  /\b(starte?|start|führe|run|teste?|ausführ)\w*\b.*\b(collection[\s_-]?flow|test[\s_-]?flow)\b/i,
  /\b(collection[\s_-]?flow|test[\s_-]?flow)\b.*\b(starten|ausführen|run|testen)\b/i,
  /\b(starte?|start|führe|run|teste?)\w*\b.*\bflows?\b/i,
  /\bflows?\b.*\b(starten|ausführen|run|testen)\b/i,
  /\bflow\s+(starten|ausführen|testen)\b/i,
  /\bliste?\b.*\bflows?\b/i,
  /\bwelche\s+flows?\b/i,
  /\bzeig(e|t)?\s+(mir\s+)?(die\s+)?flows?\b/i,
];

const PROMOTE_CAPABILITY_PATTERNS = [
  /\bals\s+flow\s+speichern\b/i,
  /\bspeicher\w*\s+als\s+flow\b/i,
  /\bflow\s+daraus\b/i,
  /\bpromote\s+(to\s+)?flow\b/i,
  /\bflow\s+speichern\s+bestätig/i,
  /\bbestätig\w*\s+flow\s+speichern\b/i,
  /\bals\s+playbook\b/i,
  /\brezept\s+speichern\b/i,
  /\bals\s+rezept\b/i,
];

const FLOW_UUID_RE =
  /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;

function extractPromoteFlowName(prompt: string): string | undefined {
  const m =
    prompt.match(/\bals\s+["„«]([^"“»]+)["“»]/i) ||
    prompt.match(/\bnamens\s+["„«]?([^"“»\n]+)["“»]?/i);
  const name = m?.[1]?.trim().replace(/[.!?]+$/, '');
  return name || undefined;
}

function extractCollectionFlowRef(prompt: string): {
  flowId?: string;
  flowName?: string;
  listOnly?: boolean;
} {
  if (/\b(liste?|welche|zeig)\b.*\bflows?\b/i.test(prompt)) {
    return { listOnly: true };
  }
  const uuid = prompt.match(FLOW_UUID_RE);
  if (uuid?.[1]) return { flowId: uuid[1] };

  const named =
    prompt.match(/\bflow\s+["„«]([^"“»]+)["“»]/i) ||
    prompt.match(/\bnamens\s+["„«]?([^"“»\n]+)["“»]?/i) ||
    prompt.match(/\bflow\s+([A-Za-z0-9][\w\s-]{1,80}?)\s*$/i);
  if (named?.[1]) {
    const flowName = named[1].trim().replace(/[.!?]+$/, '');
    if (flowName && !/^(starten|ausführen|testen|run)$/i.test(flowName)) {
      return { flowName };
    }
  }
  return {};
}

const WEBSITE_AUDIT_PATTERNS = [
  /\bwebsite\s*-?\s*audit\b/i,
  /\bvollständig\w*\s+website\s*(audit|analyse)\b/i,
  /\bfull\s+website\s*audit\b/i,
  /\bwebsite\s+prüfen\b/i,
  /\baudit\s+(für|for)\b/i,
];

const UI_SHOWCASE_PATTERNS = [
  /\b(ui|plexon_ui)\s*(-)?\s*(block|blocks|komponent|komponenten)\b/i,
  /\balle\b.*\b(ui|block|komponent)/i,
  /\b(show|zeig|demo)\b.*\b(ui|block|komponent)/i,
  /\bui\s*showcase\b/i,
  /\bgenerative\s*ui\b/i,
  /\bdesign\s*system\b.*\b(demo|block|komponent|showcase)/i,
];

const CAPABILITIES_PATTERNS = [
  /\bwas\s+kann(st)?\s+du\b/i,
  /\bwhat\s+can\s+you\s+do\b/i,
  /\bhilfe\b/i,
  /\bhelp\b/i,
];

function extractDomain(text: string): string | undefined {
  const url = extractUrlFromText(text);
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return undefined;
  }
}

function extractProjectName(text: string): string | undefined {
  return extractScopedProjectName(text);
}

export function routeAssistantIntent(prompt: string): AssistantIntent {
  const trimmed = prompt.trim();
  if (!trimmed) return { type: 'free_chat' };

  if (UI_SHOWCASE_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'ui_showcase' };
  }

  if (CAPABILITIES_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'capabilities' };
  }

  if (matchesCreateProjectIntent(trimmed, CREATE_PATTERNS)) {
    const name = extractProjectName(trimmed);
    const startResearch = RESEARCH_PATTERNS.some((p) => p.test(trimmed));
    // Phase 1: always Collection create (CHECKION + AUDION mirrors) — never product-only.
    return {
      type: 'create_project',
      name,
      domain: extractDomain(trimmed),
      startResearch,
    };
  }

  if (SYNC_DIAGNOSE_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'sync_diagnose' };
  }

  if (SCAN_SUMMARIZE_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'scan_summarize', scanId: extractScanIdFromText(trimmed) };
  }

  if (MARKET_TO_AUDIENCE_PATTERNS.some((p) => p.test(trimmed))) {
    const url = extractUrlFromText(trimmed);
    return {
      type: 'run_playbook',
      playbookId: 'market_to_audience',
      url: url ?? '',
      projectName: extractProjectName(trimmed),
    };
  }

  const url = extractUrlFromText(trimmed);

  if (
    (url || extractDomain(trimmed)) &&
    EVENT_QUICK_CHECK_PATTERNS.some((p) => p.test(trimmed))
  ) {
    const quickUrl = url ?? `https://${extractDomain(trimmed)}`;
    return {
      type: 'run_playbook',
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      url: quickUrl,
      projectName: extractProjectName(trimmed),
    };
  }

  if (
    (url || extractDomain(trimmed)) &&
    LAUNCH_READINESS_PATTERNS.some((p) => p.test(trimmed))
  ) {
    const launchUrl = url ?? `https://${extractDomain(trimmed)}`;
    return {
      type: 'run_playbook',
      playbookId: 'launch_readiness',
      url: launchUrl,
      projectName: extractProjectName(trimmed),
    };
  }

  if (url && WEBSITE_AUDIT_PATTERNS.some((p) => p.test(trimmed))) {
    const contrast = extractContrastHexPair(trimmed);
    const skipGeo = /\b(ohne|without)\s+geo\b/i.test(trimmed);
    return {
      type: 'run_playbook',
      playbookId: 'website_audit',
      url,
      ...(contrast
        ? { contrast: { foreground: contrast.foreground, background: contrast.background } }
        : {}),
      ...(skipGeo ? { skipGeo: true } : {}),
    };
  }

  if (url && PAGESPEED_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'pagespeed_check', url };
  }

  if (url && SSL_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'ssl_check', host: url };
  }

  if (url && WAYBACK_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'wayback_check', url };
  }

  if (url && DOMAIN_SCAN_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'domain_scan', url };
  }

  if (url && READABILITY_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'readability_check', url };
  }

  if (CONTRAST_PATTERNS.some((p) => p.test(trimmed))) {
    const colors = extractContrastHexPair(trimmed);
    if (colors) {
      return {
        type: 'contrast_check',
        foreground: colors.foreground,
        background: colors.background,
      };
    }
  }

  if (url && QUICK_SCAN_PATTERNS.some((p) => p.test(trimmed))) {
    const summarize = QUICK_SCAN_SUMMARIZE_INLINE.test(trimmed);
    return { type: 'quick_scan', url, summarize };
  }

  if (url && GEO_PATTERNS.some((p) => p.test(trimmed))) {
    const deep = /\bdeep\b|\bvollständig\b|\bcompetitive\b|\bwettbewerb\s*analyse\b/i.test(trimmed);
    return { type: 'geo_analysis', url, deep };
  }

  if (PERSONA_PAGE_RELEVANCE_PATTERNS.some((p) => p.test(trimmed))) {
    const urlHint = extractUrlFromText(trimmed) ?? inferPersonaPageSpineUrlHint(trimmed);
    return {
      type: 'persona_page_relevance',
      personaId: extractPersonaId(trimmed),
      personaName: extractPersonaName(trimmed),
      domainScanId: extractDomainScanId(trimmed),
      urlHint,
      topK: extractTopK(trimmed),
    };
  }

  if (PERSONA_BOOTSTRAP_PATTERNS.some((p) => p.test(trimmed))) {
    return {
      type: 'persona_bootstrap',
      name: extractProjectName(trimmed),
      targetGroupName: extractProjectName(trimmed),
    };
  }

  if (JOURNEY_GENERATE_PATTERNS.some((p) => p.test(trimmed))) {
    const skipValidate = /\bohne\s+validat/i.test(trimmed) || /\bwithout\s+validat/i.test(trimmed);
    return {
      type: 'journey_generate',
      targetGroupName: extractJourneyName(trimmed) ?? extractProjectName(trimmed),
      ...(skipValidate ? { validate: false } : {}),
    };
  }

  if (JOURNEY_OUTLINE_PATTERNS.some((p) => p.test(trimmed))) {
    const validate = /\bvalidier\w*\b/i.test(trimmed);
    return {
      type: 'journey_outline',
      journeyId: extractJourneyId(trimmed),
      journeyName: extractJourneyName(trimmed) ?? extractProjectName(trimmed),
      ...(validate ? { validate: true } : {}),
    };
  }

  if (PROMOTE_CAPABILITY_PATTERNS.some((p) => p.test(trimmed))) {
    const confirm =
      /\bbestätig/i.test(trimmed) ||
      /\bconfirm\b/i.test(trimmed) ||
      /\bflow\s+speichern\s+bestätig/i.test(trimmed);
    return {
      type: 'promote_capability_sequence',
      ...(confirm ? { confirm: true } : {}),
      ...(extractPromoteFlowName(trimmed) ? { name: extractPromoteFlowName(trimmed) } : {}),
    };
  }

  if (RUN_COLLECTION_FLOW_PATTERNS.some((p) => p.test(trimmed))) {
    const ref = extractCollectionFlowRef(trimmed);
    const flowUrl = extractUrlFromText(trimmed);
    return {
      type: 'run_collection_flow',
      ...ref,
      ...(flowUrl ? { url: flowUrl } : {}),
    };
  }

  if (RESEARCH_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'start_research' };
  }

  if (STATUS_PATTERNS.some((p) => p.test(trimmed))) {
    return { type: 'project_status' };
  }

  return { type: 'free_chat' };
}
