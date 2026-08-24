import { getAssistantPlannerModel } from '@/lib/constants';
import { isPlexonUiTool } from '@/lib/assistant/ui-tools/definitions';
import {
  GEO_FAMILIES,
  KNOWLEDGE_QA_FAMILIES,
  PERSONA_FAMILIES,
  UX_JOURNEY_FAMILIES,
  READ_ONLY_QA_FAMILIES,
  SCAN_FAMILIES,
  ECHON_MARKET_FAMILIES,
  ECHON_TO_AUDIENCE_FAMILIES,
  BRANDION_BRAND_FAMILIES,
  CREATION_DESIGN_FAMILIES,
  CREATION_SCENE_EDIT_FAMILIES,
  isDestructiveOrWriteTool,
  toolMatchesFamilies,
  type ToolFamily,
} from '@/lib/assistant/tool-catalog';
import { hasAudienceWriteIntent } from '@/lib/assistant/audience-write-intent';
import { hasSceneWriteIntent, hasCreationEditorSceneContext } from '@/lib/assistant/scene-write-intent';
import type { AssistantPageContext } from '@/lib/assistant/page-context';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export type AssistantPlanIntent =
  | 'project_knowledge'
  | 'checkion_scan'
  | 'checkion_seo_geo'
  | 'checkion_journey'
  | 'audion_persona'
  | 'audion_knowledge'
  | 'audion_journey'
  | 'audion_ux_journey'
  | 'audion_chat'
  | 'audion_documents'
  | 'echon_market'
  | 'echon_audience'
  | 'brandion_brand'
  | 'creation_design'
  | 'creation_scene_edit'
  | 'action_write'
  | 'general_chat';

export type AssistantPlanMode = 'embedded_context' | 'hybrid' | 'tools';

export type AssistantPlan = {
  intent: AssistantPlanIntent;
  mode: AssistantPlanMode;
  toolFamilies: ToolFamily[];
  allowWriteTools: boolean;
  maxToolRounds: number;
  skipTools: boolean;
  reasoning: string;
  plannerSource: 'heuristic' | 'llm';
};

export type PlannerInput = {
  prompt: string;
  /** Recent user turns — used to keep write intent in follow-up messages. */
  planningPrompt?: string;
  hasProjectContext: boolean;
  hasCheckionMcp: boolean;
  hasAudionMcp: boolean;
  hasEchonMcp: boolean;
  hasBrandionMcp: boolean;
  hasCreationMcp: boolean;
  compactContextLoaded: boolean;
  pageContext?: AssistantPageContext | null;
};

const KNOWLEDGE_PATTERNS = [
  /\bwas\s+(hast|weißt|kennst)\s+du\b/i,
  /\bwissen\b/i,
  /\bknowledge\b/i,
  /\berzähl\b/i,
  /\binformationen?\s+(zu|über|about)\b/i,
  /\bwas\s+ist\b/i,
  /\bwas\s+sind\b/i,
  /\büber\s+die\b/i,
  /\büber\s+das\b/i,
  /\btell\s+me\s+about\b/i,
  /\bwhat\s+do\s+you\s+know\b/i,
];

const SCAN_PATTERNS = [
  /\bscan(nen|ne)?\b/i,
  /\baccessibility\b/i,
  /\bwcag\b/i,
  /\bbarrierefrei/i,
  /\bpagespeed\b/i,
  /\bkontrast\b/i,
];

const GEO_PATTERNS = [
  /\bgeo\b/i,
  /\be-?e-?a-?t\b/i,
  /\bseo\b/i,
  /\branking/i,
  /\bwettbewerber/i,
  /\bcompetitor/i,
];

const PERSONA_PATTERNS = [
  /\bpersona/i,
  /\bzielgruppe/i,
  /\btarget\s*group/i,
  /\bcustomer\s*journey/i,
  /\bkundenreise/i,
];

const WRITE_PATTERNS = [
  /\b(starte|start|erstelle|create|generiere|generate|lösche|delete|anleg\w*|ableit\w*)\b/i,
  /\bscanne\s+https?:\/\//i,
];

const AUDION_WRITE_FAMILIES: ToolFamily[] = [
  'audion_audience_write',
  'audion_persona',
  'audion_project',
  'audion_knowledge',
];

const MARKET_PATTERNS = [
  /\bmarkt\b/i,
  /\bmarket\b/i,
  /\bsignal(e)?\b/i,
  /\bwaves?\b/i,
  /\btrend(s)?\b/i,
  /\bwettbewerb\b/i,
  /\bcompetitor/i,
  /\bechon\b/i,
  /\bresearch\b/i,
  /\brecherchier/i,
  /\bforesight\b/i,
  /\bbriefing\b/i,
  /\bmomentum\b/i,
];

function hasMcp(input: PlannerInput): boolean {
  return input.hasCheckionMcp || input.hasAudionMcp || input.hasEchonMcp || input.hasBrandionMcp || input.hasCreationMcp;
}

function buildPlan(
  partial: Omit<AssistantPlan, 'plannerSource'> & { plannerSource?: AssistantPlan['plannerSource'] }
): AssistantPlan {
  return { plannerSource: 'heuristic', ...partial };
}

const JOURNEY_PATTERNS = [
  /\bjourney\b/i,
  /\bkundenreise/i,
  /\bcustomer\s*journey/i,
  /\bux-?journey/i,
];

const UX_JOURNEY_AGENT_PATTERNS = [
  /\bux-?journey-?agent\b/i,
  /\bbrowser-?(aufzeichnung|recording)\b/i,
  /\bjourney-?agent\b/i,
];

const CHAT_PATTERNS = [
  /\bpersona\s*chat\b/i,
  /\bmit\s+(der\s+)?persona\s+(reden|sprechen|chatten)\b/i,
  /\bfrage\s+(die\s+)?persona\b/i,
  /\baudion\s+chat\b/i,
];

const DOCUMENT_PATTERNS = [/\bdokument/i, /\bdocument/i, /\bupload\b/i, /\bpdf\b/i];

const BRANDION_PATTERNS = [
  /\bfarben?\b/i,
  /\bcolours?\b/i,
  /\bcolors?\b/i,
  /\bhex\b/i,
  /\bpantone\b/i,
  /\bguideline/i,
  /\bmarke\b/i,
  /\bbrandion\b/i,
  /\bcorporate\s*design\b/i,
  /\b\bcd\b/i,
  /\bdesign.?tokens?\b/i,
  /\bswatch/i,
  /\bfarb(ton|palette|werte?)\b/i,
];

const CREATION_SCENE_PATTERNS = [
  /\bscene\b/i,
  /\blayout\b/i,
  /\beditor\b/i,
  /\blanding\s*page\b/i,
  /\bhero\b/i,
  /\bsite\s*kit\b/i,
  /\bmaster\b/i,
  /\binstanz/i,
  /\bscene_apply_ops\b/i,
  /\bscene_tree_index\b/i,
];

const CREATION_PATTERNS = [
  /\bcreation\b/i,
  /\bzaoly\b/i,
  /\bcomposition/i,
  /\blibrary\b/i,
  /\bweb\s*component/i,
  /\bcustom\s*element/i,
  /\bds-[a-z0-9-]+/i,
  /\bcontract\s*catalog\b/i,
  /\bwc\b/i,
];

export function planAssistantTurnHeuristic(input: PlannerInput): AssistantPlan {
  const text = (input.planningPrompt ?? input.prompt).trim();
  const writeIntent = WRITE_PATTERNS.some((p) => p.test(text));
  const sceneWriteIntent = hasSceneWriteIntent(text, input.pageContext);
  const audienceWrite = hasAudienceWriteIntent(text);

  if (hasCreationEditorSceneContext(input.pageContext) && input.hasCreationMcp) {
    return buildPlan({
      intent: 'creation_scene_edit',
      mode: 'hybrid',
      toolFamilies: [...CREATION_SCENE_EDIT_FAMILIES, 'plexon_ui'],
      allowWriteTools: writeIntent || sceneWriteIntent,
      maxToolRounds: 6,
      skipTools: false,
      reasoning:
        'CREATION Editor — Scene-Tree Prefetch; scene_apply_ops bei Schreib-Intent.',
    });
  }

  if (BRANDION_PATTERNS.some((p) => p.test(text)) && input.hasBrandionMcp) {
    return buildPlan({
      intent: 'brandion_brand',
      mode: 'tools',
      toolFamilies: [...BRANDION_BRAND_FAMILIES, 'plexon_ui'],
      allowWriteTools: false,
      maxToolRounds: 5,
      skipTools: false,
      reasoning:
        'Marken-/Farb-/Guideline-Intent – BRANDION guidelines + tokens (live, nicht erfinden).',
    });
  }

  if (CREATION_SCENE_PATTERNS.some((p) => p.test(text)) && input.hasCreationMcp) {
    return buildPlan({
      intent: 'creation_scene_edit',
      mode: 'hybrid',
      toolFamilies: [...CREATION_SCENE_EDIT_FAMILIES, 'plexon_ui'],
      allowWriteTools: writeIntent || sceneWriteIntent,
      maxToolRounds: 6,
      skipTools: false,
      reasoning:
        'CREATION Scene-Layout — Prefetch/Outline; scene_apply_ops bei Schreib-Intent oder Editor-Kontext.',
    });
  }

  if (CREATION_PATTERNS.some((p) => p.test(text)) && input.hasCreationMcp) {
    return buildPlan({
      intent: 'creation_design',
      mode: 'tools',
      toolFamilies: [...CREATION_DESIGN_FAMILIES, 'plexon_ui'],
      allowWriteTools: false,
      maxToolRounds: 5,
      skipTools: false,
      reasoning:
        'CREATION Library/Composition-Intent – Catalog + stubs (nicht Tags erfinden).',
    });
  }

  if (
    UX_JOURNEY_AGENT_PATTERNS.some((p) => p.test(text)) &&
    input.hasAudionMcp
  ) {
    return buildPlan({
      intent: 'audion_ux_journey',
      mode: 'hybrid',
      toolFamilies: [...UX_JOURNEY_FAMILIES, 'plexon_ui'],
      allowWriteTools: writeIntent,
      maxToolRounds: 6,
      skipTools: false,
      reasoning: 'UX-Journey-Agent – Run starten/status/screenshots + Persona-Runs.',
    });
  }

  if (CHAT_PATTERNS.some((p) => p.test(text)) && input.hasAudionMcp) {
    return buildPlan({
      intent: 'audion_chat',
      mode: 'hybrid',
      toolFamilies: ['audion_chat', 'audion_persona', 'audion_knowledge', 'plexon_ui'],
      allowWriteTools: false,
      maxToolRounds: 5,
      skipTools: false,
      reasoning: 'Persona-Chat – chat-api über AUDION MCP (audion.chat_message).',
    });
  }

  if (
    MARKET_PATTERNS.some((p) => p.test(text)) &&
    audienceWrite &&
    input.hasEchonMcp &&
    input.hasAudionMcp
  ) {
    return buildPlan({
      intent: 'echon_audience',
      mode: 'tools',
      toolFamilies: [...ECHON_TO_AUDIENCE_FAMILIES, 'plexon_ui'],
      allowWriteTools: true,
      maxToolRounds: 6,
      skipTools: false,
      reasoning:
        'Markt → Zielgruppen: ECHON Research/Signale, dann AUDION target_group_create (Bestätigung).',
    });
  }

  if (MARKET_PATTERNS.some((p) => p.test(text)) && input.hasEchonMcp) {
    return buildPlan({
      intent: 'echon_market',
      mode: 'hybrid',
      toolFamilies: [...ECHON_MARKET_FAMILIES, 'plexon_ui'],
      allowWriteTools: /\bresearch_run\b/i.test(text) || writeIntent,
      maxToolRounds: 5,
      skipTools: false,
      reasoning: 'Markt/Signal/Trend-Intent – ECHON Research + Signals/Waves (read-only bevorzugt).',
    });
  }

  if ((writeIntent || audienceWrite) && hasMcp(input)) {
    const families: ToolFamily[] = [];
    if (input.hasCheckionMcp) {
      families.push('checkion_scan_write', 'checkion_scan_read', 'checkion_project', 'checkion_geo');
    }
    if (input.hasEchonMcp && MARKET_PATTERNS.some((p) => p.test(text))) {
      families.push(...ECHON_MARKET_FAMILIES);
    }
    if (input.hasAudionMcp) {
      families.push(...AUDION_WRITE_FAMILIES);
    }
    return buildPlan({
      intent: 'action_write',
      mode: 'tools',
      toolFamilies: [...new Set(families)],
      allowWriteTools: true,
      maxToolRounds: 6,
      skipTools: false,
      reasoning:
        'Schreib-/Ableit-Intent erkannt – CHECKION lesen + AUDION anlegen (audion_audience_write inkl. target_group_create).',
    });
  }

  if (SCAN_PATTERNS.some((p) => p.test(text)) && input.hasCheckionMcp) {
    return buildPlan({
      intent: 'checkion_scan',
      mode: 'tools',
      toolFamilies: SCAN_FAMILIES,
      allowWriteTools: /\bscan(nen|ne)?\b/i.test(text),
      maxToolRounds: 5,
      skipTools: false,
      reasoning: 'Scan/Performance-Intent – nur CHECKION-Scan-Tools.',
    });
  }

  if (GEO_PATTERNS.some((p) => p.test(text)) && input.hasCheckionMcp) {
    return buildPlan({
      intent: 'checkion_seo_geo',
      mode: 'hybrid',
      toolFamilies: GEO_FAMILIES,
      allowWriteTools: false,
      maxToolRounds: 4,
      skipTools: false,
      reasoning: 'SEO/GEO-Intent – CHECKION GEO + Projekt-Tools.',
    });
  }

  if (PERSONA_PATTERNS.some((p) => p.test(text)) && input.hasAudionMcp) {
    const families: ToolFamily[] = [...PERSONA_FAMILIES];
    if (audienceWrite) {
      families.push('audion_audience_write');
    }
    return buildPlan({
      intent: 'audion_persona',
      mode: 'hybrid',
      toolFamilies: [...new Set(families)],
      allowWriteTools: audienceWrite,
      maxToolRounds: 5,
      skipTools: false,
      reasoning: audienceWrite
        ? 'Persona/Zielgruppen anlegen – audion_audience_write aktiv (target_group_create).'
        : 'Persona/Zielgruppen-Intent – AUDION Persona & Knowledge (read-only).',
    });
  }

  if (JOURNEY_PATTERNS.some((p) => p.test(text)) && input.hasAudionMcp) {
    return buildPlan({
      intent: 'audion_journey',
      mode: 'hybrid',
      toolFamilies: ['audion_journey', 'audion_ux_journey', 'audion_knowledge', 'plexon_ui'],
      allowWriteTools: writeIntent,
      maxToolRounds: 5,
      skipTools: false,
      reasoning: 'Journey-Intent – AUDION Journey + UX-Journey-Agent + UI-Blöcke.',
    });
  }

  if (JOURNEY_PATTERNS.some((p) => p.test(text)) && input.hasCheckionMcp) {
    return buildPlan({
      intent: 'checkion_journey',
      mode: 'hybrid',
      toolFamilies: ['checkion_journey', 'checkion_scan_read', 'plexon_ui'],
      allowWriteTools: false,
      maxToolRounds: 4,
      skipTools: false,
      reasoning: 'CHECKION Journey-Agent – Scan/Journey Tools.',
    });
  }

  if (DOCUMENT_PATTERNS.some((p) => p.test(text)) && input.hasAudionMcp) {
    return buildPlan({
      intent: 'audion_documents',
      mode: 'hybrid',
      toolFamilies: ['audion_documents', 'audion_knowledge', 'plexon_ui'],
      allowWriteTools: writeIntent,
      maxToolRounds: 4,
      skipTools: false,
      reasoning: 'Dokument-Intent – AUDION Documents + Knowledge.',
    });
  }

  if (
    input.hasProjectContext &&
    KNOWLEDGE_PATTERNS.some((p) => p.test(text))
  ) {
    if (input.compactContextLoaded && !hasMcp(input)) {
      return buildPlan({
        intent: 'project_knowledge',
        mode: 'embedded_context',
        toolFamilies: [],
        allowWriteTools: false,
        maxToolRounds: 0,
        skipTools: true,
        reasoning: 'Wissensfrage mit eingebettetem Projektkontext – keine MCP-Tools nötig.',
      });
    }
    return buildPlan({
      intent: 'project_knowledge',
      mode: input.compactContextLoaded ? 'embedded_context' : 'hybrid',
      toolFamilies: KNOWLEDGE_QA_FAMILIES,
      allowWriteTools: false,
      maxToolRounds: input.compactContextLoaded ? 2 : 4,
      skipTools: input.compactContextLoaded && !hasMcp(input),
      reasoning: input.compactContextLoaded
        ? 'Wissensfrage – zuerst eingebetteter Kontext, max. 2 gezielte Tool-Runden.'
        : 'Wissensfrage – Knowledge-Tools ohne Massen-Rohdaten.',
    });
  }

  if (input.hasProjectContext && input.compactContextLoaded) {
    return buildPlan({
      intent: 'general_chat',
      mode: 'hybrid',
      toolFamilies: READ_ONLY_QA_FAMILIES,
      allowWriteTools: false,
      maxToolRounds: 3,
      skipTools: !hasMcp(input),
      reasoning: 'Projektkontext aktiv – eingebettete Kurzinfo + read-only Tools.',
    });
  }

  if (hasMcp(input)) {
    return buildPlan({
      intent: 'general_chat',
      mode: 'tools',
      toolFamilies: READ_ONLY_QA_FAMILIES,
      allowWriteTools: false,
      maxToolRounds: 5,
      skipTools: false,
      reasoning: 'Allgemeiner Chat – read-only Tool-Subset.',
    });
  }

  return buildPlan({
    intent: 'general_chat',
    mode: 'embedded_context',
    toolFamilies: [],
    allowWriteTools: false,
    maxToolRounds: 0,
    skipTools: true,
    reasoning: 'Kein MCP – reiner Chat mit System-Prompt.',
  });
}

type LlmPlanJson = {
  intent?: string;
  mode?: string;
  toolFamilies?: string[];
  allowWriteTools?: boolean;
  maxToolRounds?: number;
  skipTools?: boolean;
  reasoning?: string;
};

const VALID_INTENTS = new Set<AssistantPlanIntent>([
  'project_knowledge',
  'checkion_scan',
  'checkion_seo_geo',
  'checkion_journey',
  'audion_persona',
  'audion_knowledge',
  'audion_journey',
  'audion_ux_journey',
  'audion_chat',
  'audion_documents',
  'echon_market',
  'echon_audience',
  'brandion_brand',
  'creation_design',
  'creation_scene_edit',
  'action_write',
  'general_chat',
]);

const VALID_MODES = new Set<AssistantPlanMode>(['embedded_context', 'hybrid', 'tools']);
const VALID_FAMILIES = new Set<ToolFamily>([
  'checkion_project',
  'checkion_scan_read',
  'checkion_scan_write',
  'checkion_geo',
  'checkion_tools',
  'checkion_journey',
  'audion_project',
  'audion_audience_write',
  'audion_knowledge',
  'audion_persona',
  'audion_journey',
  'audion_ux_journey',
  'audion_chat',
  'audion_documents',
  'echon_ops',
  'echon_research',
  'echon_signals',
  'echon_waves',
  'echon_foresight',
  'echon_corpus',
  'brandion_guidelines',
  'brandion_tokens',
  'creation_library',
  'creation_compositions',
  'creation_projects',
  'creation_scene',
  'creation_scene_write',
  'plexon_ui',
]);

function parseLlmPlan(raw: LlmPlanJson, fallback: AssistantPlan): AssistantPlan | null {
  const intent = raw.intent && VALID_INTENTS.has(raw.intent as AssistantPlanIntent)
    ? (raw.intent as AssistantPlanIntent)
    : fallback.intent;
  const mode = raw.mode && VALID_MODES.has(raw.mode as AssistantPlanMode)
    ? (raw.mode as AssistantPlanMode)
    : fallback.mode;
  const toolFamilies = Array.isArray(raw.toolFamilies)
    ? raw.toolFamilies.filter((f): f is ToolFamily => VALID_FAMILIES.has(f as ToolFamily))
    : fallback.toolFamilies;
  const maxToolRounds =
    typeof raw.maxToolRounds === 'number'
      ? Math.min(8, Math.max(0, Math.floor(raw.maxToolRounds)))
      : fallback.maxToolRounds;

  return {
    intent,
    mode,
    toolFamilies,
    allowWriteTools: fallback.allowWriteTools || Boolean(raw.allowWriteTools),
    maxToolRounds,
    skipTools: Boolean(raw.skipTools),
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : fallback.reasoning,
    plannerSource: 'llm',
  };
}

export async function planAssistantTurnWithLlm(
  apiKey: string,
  input: PlannerInput,
  heuristic: AssistantPlan
): Promise<AssistantPlan> {
  const system = `Du bist der Planer für den PLEXON-Assistenten. Analysiere die Nutzeranfrage und wähle Strategie + Tool-Familien.
Antworte NUR mit einem JSON-Objekt (kein Markdown):
{
  "intent": "project_knowledge|checkion_scan|checkion_seo_geo|audion_persona|audion_knowledge|action_write|general_chat",
  "mode": "embedded_context|hybrid|tools",
  "toolFamilies": ["checkion_project","audion_knowledge", ...],
  "allowWriteTools": false,
  "maxToolRounds": 0-8,
  "skipTools": false,
  "reasoning": "kurz auf Deutsch"
}
Regeln:
- Bei Wissensfragen zum Projekt: mode embedded_context oder hybrid, max 2-3 Tool-Runden, nur Knowledge/Projekt-Familien.
- Keine Write/Delete-Tools ohne expliziten Nutzer-Auftrag.
- toolFamilies nur aus: checkion_project, checkion_scan_read, checkion_scan_write, checkion_geo, checkion_tools, checkion_journey, audion_project, audion_knowledge, audion_persona, audion_journey, audion_ux_journey, audion_chat, audion_documents, echon_ops, echon_research, echon_signals, echon_waves, echon_foresight, echon_corpus, brandion_guidelines, brandion_tokens, creation_library, creation_compositions, creation_projects, creation_scene, creation_scene_write, plexon_ui.`;

  const userContent = JSON.stringify({
    prompt: input.prompt,
    hasProjectContext: input.hasProjectContext,
    hasCheckionMcp: input.hasCheckionMcp,
    hasAudionMcp: input.hasAudionMcp,
    hasEchonMcp: input.hasEchonMcp,
    hasBrandionMcp: input.hasBrandionMcp,
    hasCreationMcp: input.hasCreationMcp,
    compactContextLoaded: input.compactContextLoaded,
    heuristicSuggestion: {
      intent: heuristic.intent,
      mode: heuristic.mode,
      toolFamilies: heuristic.toolFamilies,
      reasoning: heuristic.reasoning,
    },
  });

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: getAssistantPlannerModel(),
        max_tokens: 512,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) return heuristic;
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return heuristic;
    const parsed = JSON.parse(jsonMatch[0]) as LlmPlanJson;
    return parseLlmPlan(parsed, heuristic) ?? heuristic;
  } catch (e) {
    console.warn('[assistant-planner] LLM plan failed', e);
    return heuristic;
  }
}

/** Use LLM planner when heuristic is ambiguous (general_chat with MCP). */
export function shouldRefinePlanWithLlm(heuristic: AssistantPlan, input: PlannerInput): boolean {
  if (!input.hasCheckionMcp && !input.hasAudionMcp && !input.hasEchonMcp && !input.hasBrandionMcp && !input.hasCreationMcp) return false;
  if (heuristic.intent !== 'general_chat') return false;
  if (input.hasProjectContext) return true;
  return input.prompt.trim().length > 120;
}

export async function planAssistantTurn(
  apiKey: string | undefined,
  input: PlannerInput
): Promise<AssistantPlan> {
  const heuristic = planAssistantTurnHeuristic(input);
  if (!apiKey || !shouldRefinePlanWithLlm(heuristic, input)) {
    return heuristic;
  }
  return planAssistantTurnWithLlm(apiKey, input, heuristic);
}

export function buildPlanSystemPromptBlock(plan: AssistantPlan): string {
  const writeToolsNote = plan.allowWriteTools
    ? plan.intent === 'creation_scene_edit'
      ? '\n- Schreib-Tools aktiv: creation_scene_apply_ops (baseUpdatedAt aus Seitenkontext!), creation_site_kit_composition_save (Publish; Bestätigung kann nötig sein).'
      : '\n- Schreib-Tools aktiv: audion_target_group_create, audion_persona_create, echon_research_run_start, echon_signal_ingest, echon_waves_detect (Bestätigung kann nötig sein).'
    : plan.intent === 'creation_scene_edit'
      ? '\n- Schreib-Tools derzeit aus: Nutzer muss explizit bitten (z. B. „füge … ein“, „ändere …“, „baue …“). Kein Hinweis auf nicht existierende Einstellungen.'
      : '';
  return `
## Ausführungsplan (Planner)
- Intent: ${plan.intent}
- Modus: ${plan.mode}
- Tool-Familien: ${plan.toolFamilies.length ? plan.toolFamilies.join(', ') : '(keine)'}
- Schreib-Tools: ${plan.allowWriteTools ? 'ja' : 'nein'}
- Max. Tool-Runden: ${plan.maxToolRounds}
- Strategie: ${plan.reasoning}${writeToolsNote}

Halte dich an diesen Plan. Lade keine unnötigen Rohdaten. Bei embedded_context/hybrid: antworte zuerst aus der Projektkurzinfo oben.`;
}

export function toolAllowedByPlan(toolName: string, plan: AssistantPlan): boolean {
  if (isPlexonUiTool(toolName)) return true;
  if (plan.skipTools || plan.toolFamilies.length === 0) return false;
  if (
    plan.allowWriteTools &&
    (toolMatchesFamilies(toolName, ['audion_audience_write']) ||
      toolMatchesFamilies(toolName, ['echon_research']))
  ) {
    return true;
  }
  if (!plan.allowWriteTools && isDestructiveOrWriteTool(toolName)) return false;
  if (!plan.allowWriteTools && toolMatchesFamilies(toolName, ['creation_scene_write'])) return false;
  return toolMatchesFamilies(toolName, plan.toolFamilies);
}

export function createToolFilter(
  _allToolNames: string[],
  plan: AssistantPlan
): (toolName: string) => boolean {
  return (toolName) => toolAllowedByPlan(toolName, plan);
}
