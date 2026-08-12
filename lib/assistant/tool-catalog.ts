/**
 * MCP tool families for the assistant planner.
 * Anthropic tool names use underscores (checkion.scan_get → checkion_scan_get).
 */

export type ToolFamily =
  | 'checkion_project'
  | 'checkion_scan_read'
  | 'checkion_scan_write'
  | 'checkion_geo'
  | 'checkion_tools'
  | 'checkion_journey'
  | 'audion_project'
  | 'audion_audience_write'
  | 'audion_knowledge'
  | 'audion_persona'
  | 'audion_journey'
  | 'audion_ux_journey'
  | 'audion_chat'
  | 'audion_documents'
  | 'echon_research'
  | 'echon_signals'
  | 'echon_waves'
  | 'brandion_guidelines'
  | 'brandion_tokens'
  | 'creation_library'
  | 'creation_compositions'
  | 'creation_projects'
  | 'plexon_ui';

const FAMILY_PATTERNS: Record<ToolFamily, RegExp[]> = {
  checkion_project: [
    /^checkion_project/,
    /^checkion_projects_list$/,
    /^checkion_search$/,
  ],
  checkion_scan_read: [
    /^checkion_scans?_list$/,
    /^checkion_scan_summarize$/,
    /^checkion_scan_screenshot$/,
    /^checkion_scan_domain_(status|summary|summarize)$/,
    /^checkion_scans_domain_list$/,
    /^checkion_saliency_result$/,
  ],
  checkion_scan_write: [
    /^checkion_scan_single$/,
    /^checkion_scan_domain$/,
    /^checkion_scan_delete/,
    /^checkion_scan_domain_delete$/,
    /^checkion_saliency_generate$/,
    /^checkion_scan_assign/,
    /^checkion_scan_domain_assign/,
  ],
  checkion_geo: [/^checkion_geo_eeat/],
  checkion_tools: [/^checkion_tools_/],
  checkion_journey: [/^checkion_(scan_)?journey/, /^checkion_journeys_/],
  audion_project: [
    /^audion_project/,
    /^audion_projects_/,
    /^audion_project_research_/,
    /^audion_project_checkion_/,
  ],
  audion_audience_write: [
    /^audion_target_group_create$/,
    /^audion_target_group_patch$/,
    /^audion_target_group_delete$/,
    /^audion_target_group_knowledge_create$/,
    /^audion_target_group_suggest_personas$/,
    /^audion_target_group_personas_generate$/,
    /^audion_persona_create$/,
    /^audion_personas_generate$/,
    /^audion_persona_generate$/,
    /^audion_persona_patch$/,
    /^audion_project_suggest_target_groups$/,
    /^audion_project_bootstrap$/,
  ],
  audion_knowledge: [
    /^audion_target_group_(get|knowledge|documents|personas)/,
    /^audion_target_groups_list$/,
  ],
  audion_ux_journey: [/^audion_ux_journey/, /^audion_persona_admin_ux_journey/],
  audion_persona: [/^audion_persona/, /^audion_personas_/],
  audion_journey: [/^audion_journey/],
  audion_chat: [/^audion_chat/],
  audion_documents: [/^audion_documents_/],
  echon_research: [/^echon_research/],
  echon_signals: [/^echon_signals?_/, /^echon_signal_/],
  echon_waves: [/^echon_waves?_/, /^echon_wave_/],
  brandion_guidelines: [
    /^brandion_health$/,
    /^brandion_guidelines_/,
    /^brandion_guideline_/,
  ],
  brandion_tokens: [/^brandion_tokens_/],
  creation_library: [/^creation_health$/, /^creation_library_/],
  creation_compositions: [/^creation_compositions_/],
  creation_projects: [/^creation_projects_/, /^creation_project_/],
  plexon_ui: [/^plexon_ui_/],
};

const DESTRUCTIVE = /(?:^|_)(delete|revoke)(?:_|$)/i;
const WRITE_ACTION = /(?:^|_)(create|start|generate|patch|save|rerun)(?:_|$)/i;

export function classifyToolFamily(toolName: string): ToolFamily | null {
  for (const [family, patterns] of Object.entries(FAMILY_PATTERNS) as [ToolFamily, RegExp[]][]) {
    if (patterns.some((p) => p.test(toolName))) return family;
  }
  return null;
}

export function isDestructiveOrWriteTool(toolName: string): boolean {
  return DESTRUCTIVE.test(toolName) || WRITE_ACTION.test(toolName);
}

export function toolMatchesFamilies(toolName: string, families: ToolFamily[]): boolean {
  const family = classifyToolFamily(toolName);
  return family != null && families.includes(family);
}

export function filterToolsByFamilies(
  toolNames: string[],
  families: ToolFamily[],
  options: { allowWrite?: boolean } = {}
): string[] {
  return toolNames.filter((name) => {
    if (!options.allowWrite && isDestructiveOrWriteTool(name)) return false;
    return toolMatchesFamilies(name, families);
  });
}

/** Safe read-only families for generic project Q&A. */
export const READ_ONLY_QA_FAMILIES: ToolFamily[] = [
  'checkion_project',
  'checkion_scan_read',
  'checkion_geo',
  'audion_project',
  'audion_knowledge',
  'audion_persona',
  'brandion_guidelines',
  'brandion_tokens',
  'creation_library',
  'creation_compositions',
  'creation_projects',
];

export const KNOWLEDGE_QA_FAMILIES: ToolFamily[] = [
  'checkion_project',
  'audion_knowledge',
  'audion_project',
  'brandion_guidelines',
  'brandion_tokens',
  'creation_library',
  'creation_compositions',
  'creation_projects',
];

export const BRANDION_BRAND_FAMILIES: ToolFamily[] = [
  'brandion_guidelines',
  'brandion_tokens',
];

export const CREATION_DESIGN_FAMILIES: ToolFamily[] = [
  'creation_library',
  'creation_compositions',
  'creation_projects',
];

export const SCAN_FAMILIES: ToolFamily[] = [
  'checkion_scan_read',
  'checkion_scan_write',
  'checkion_tools',
];

export const GEO_FAMILIES: ToolFamily[] = ['checkion_geo', 'checkion_project'];

export const PERSONA_FAMILIES: ToolFamily[] = [
  'audion_persona',
  'audion_knowledge',
  'audion_project',
  'audion_chat',
];

export const UX_JOURNEY_FAMILIES: ToolFamily[] = [
  'audion_ux_journey',
  'audion_journey',
  'audion_persona',
  'audion_knowledge',
];

export const ECHON_MARKET_FAMILIES: ToolFamily[] = [
  'echon_research',
  'echon_signals',
  'echon_waves',
];

export const ECHON_TO_AUDIENCE_FAMILIES: ToolFamily[] = [
  ...ECHON_MARKET_FAMILIES,
  'audion_audience_write',
  'audion_project',
  'audion_knowledge',
  'checkion_project',
  'checkion_scan_read',
];
