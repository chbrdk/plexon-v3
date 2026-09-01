import { describe, expect, it } from 'vitest';
import {
  classifyToolFamily,
  isDestructiveOrWriteTool,
  toolMatchesFamilies,
} from '@/lib/assistant/tool-catalog';
import {
  planAssistantTurnHeuristic,
  shouldRefinePlanWithLlm,
  toolAllowedByPlan,
} from '@/lib/assistant/assistant-planner';
import { buildPlanningPromptFromConversation } from '@/lib/assistant/audience-write-intent';

describe('tool-catalog', () => {
  it('classifies checkion and audion tools', () => {
    expect(classifyToolFamily('checkion_scan_summarize')).toBe('checkion_scan_read');
    expect(classifyToolFamily('checkion_scan_single')).toBe('checkion_scan_write');
    expect(classifyToolFamily('audion_target_group_knowledge_chunks')).toBe('audion_knowledge');
    expect(classifyToolFamily('audion_target_group_create')).toBe('audion_audience_write');
    expect(classifyToolFamily('audion_persona_get')).toBe('audion_persona');
  });

  it('classifies echon tools', () => {
    expect(classifyToolFamily('echon_signals_list')).toBe('echon_signals');
    expect(classifyToolFamily('echon_research_run_start')).toBe('echon_research');
    expect(classifyToolFamily('echon_waves_list')).toBe('echon_waves');
  });

  it('classifies brandion tools', () => {
    expect(classifyToolFamily('brandion_health')).toBe('brandion_guidelines');
    expect(classifyToolFamily('brandion_guidelines_list')).toBe('brandion_guidelines');
    expect(classifyToolFamily('brandion_guideline_get')).toBe('brandion_guidelines');
    expect(classifyToolFamily('brandion_tokens_list')).toBe('brandion_tokens');
  });

  it('classifies ux journey and chat tools', () => {
    expect(classifyToolFamily('audion_ux_journey_run_start')).toBe('audion_ux_journey');
    expect(classifyToolFamily('audion_persona_admin_ux_journey_runs_list')).toBe(
      'audion_ux_journey'
    );
    expect(classifyToolFamily('audion_chat_message')).toBe('audion_chat');
  });

  it('flags destructive and write tools', () => {
    expect(isDestructiveOrWriteTool('checkion_project_delete')).toBe(true);
    expect(isDestructiveOrWriteTool('checkion_scan_summarize')).toBe(false);
    expect(isDestructiveOrWriteTool('audion_persona_create')).toBe(true);
  });

  it('matches tool families', () => {
    expect(toolMatchesFamilies('checkion_geo_eeat_get', ['checkion_geo'])).toBe(true);
    expect(toolMatchesFamilies('checkion_scan_get', ['checkion_scan_read'])).toBe(false);
  });
});

describe('assistant-planner heuristic', () => {
  it('uses embedded context for project knowledge questions', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'was hast du zur Haftpflichtkasse',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: true,
    });
    expect(plan.intent).toBe('project_knowledge');
    expect(plan.mode).toBe('embedded_context');
    expect(plan.maxToolRounds).toBeLessThanOrEqual(2);
    expect(plan.allowWriteTools).toBe(false);
  });

  it('limits to scan families for scan requests', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Scanne example.com auf WCAG Probleme',
      hasProjectContext: false,
      hasCheckionMcp: true,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: false,
    });
    expect(plan.intent).toBe('checkion_scan');
    expect(plan.toolFamilies).toContain('checkion_scan_read');
  });

  it('filters tools by plan families', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'was hast du zur Haftpflichtkasse',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: true,
    });
    expect(toolAllowedByPlan('audion_target_group_knowledge_list', plan)).toBe(true);
    expect(toolAllowedByPlan('checkion_scan_get', plan)).toBe(false);
    expect(toolAllowedByPlan('checkion_project_delete', plan)).toBe(false);
    expect(toolAllowedByPlan('plexon_ui_append_block', plan)).toBe(true);
  });

  it('allows audion_target_group_create when creating target groups', () => {
    const prompt =
      'das rheinland versicherungen projekt aus checkion angucken und zielgruppen für audion ableiten und anlegen';
    const plan = planAssistantTurnHeuristic({
      prompt,
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: true,
    });
    expect(plan.allowWriteTools).toBe(true);
    expect(plan.toolFamilies).toContain('audion_audience_write');
    expect(toolAllowedByPlan('audion_target_group_create', plan)).toBe(true);
    expect(toolAllowedByPlan('checkion_projects_list', plan)).toBe(true);
  });

  it('routes persona chat to audion_chat family', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Starte einen Persona Chat mit der Persona Maria',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: false,
    });
    expect(plan.intent).toBe('audion_chat');
    expect(plan.toolFamilies).toContain('audion_chat');
    expect(toolAllowedByPlan('audion_chat_message', plan)).toBe(true);
  });

  it('routes market research to echon_market family', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Was passiert am Markt für Versicherungen? Zeig Signale und Trends.',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: true,
      hasBrandionMcp: false,
      compactContextLoaded: false,
    });
    expect(plan.intent).toBe('echon_market');
    expect(plan.toolFamilies).toContain('echon_research');
    expect(toolAllowedByPlan('echon_signals_list', plan)).toBe(true);
    expect(toolAllowedByPlan('echon_research_run_start', plan)).toBe(false);
  });

  it('routes market-to-audience to echon_audience with write tools', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Recherchiere Markttrends für Versicherungen und leite Zielgruppen für AUDION ab und anlegen',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: true,
      hasBrandionMcp: false,
      compactContextLoaded: true,
    });
    expect(plan.intent).toBe('echon_audience');
    expect(plan.allowWriteTools).toBe(true);
    expect(plan.toolFamilies).toContain('echon_research');
    expect(plan.toolFamilies).toContain('audion_audience_write');
    expect(toolAllowedByPlan('audion_target_group_create', plan)).toBe(true);
  });

  it('routes ux journey agent to audion_ux_journey family', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Starte den UX-Journey-Agent für example.com',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: false,
    });
    expect(plan.intent).toBe('audion_ux_journey');
    expect(plan.toolFamilies).toContain('audion_ux_journey');
    expect(toolAllowedByPlan('audion_ux_journey_run_start', plan)).toBe(true);
  });

  it('keeps target group create blocked for read-only persona queries', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Welche Zielgruppen gibt es in AUDION?',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: true,
    });
    expect(plan.allowWriteTools).toBe(false);
    expect(toolAllowedByPlan('audion_target_group_create', plan)).toBe(false);
    expect(toolAllowedByPlan('audion_target_groups_list', plan)).toBe(true);
  });

  it('allows target group create on short follow-up when history had write intent', () => {
    const planningPrompt = buildPlanningPromptFromConversation(
      [
        {
          role: 'user',
          content:
            'checkion rheinland versicherungen projekt ansehen und zielgruppen für audion anlegen',
        },
      ],
      'ja leg sie an'
    );
    const plan = planAssistantTurnHeuristic({
      prompt: 'ja leg sie an',
      planningPrompt,
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: true,
    });
    expect(plan.allowWriteTools).toBe(true);
    expect(toolAllowedByPlan('audion_target_group_create', plan)).toBe(true);
  });

  it('refines ambiguous general chat with project context via LLM', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Kannst du mir helfen?',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: true,
    });
    expect(shouldRefinePlanWithLlm(plan, {
      prompt: 'Kannst du mir helfen?',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      compactContextLoaded: true,
    })).toBe(true);
  });

  it('routes color / guideline questions to brandion MCP families', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'welche Farben hat MSQDX?',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: true,
      compactContextLoaded: false,
    });
    expect(plan.intent).toBe('brandion_brand');
    expect(plan.toolFamilies).toEqual(
      expect.arrayContaining(['brandion_guidelines', 'brandion_tokens', 'plexon_ui']),
    );
    expect(plan.skipTools).toBe(false);
    expect(toolAllowedByPlan('brandion_tokens_list', plan)).toBe(true);
    expect(plan.allowWriteTools).toBe(false);
    expect(toolAllowedByPlan('brandion_guideline_create', plan)).toBe(false);
  });

  it('allows brandion write tools on explicit guideline create (cross-app)', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Guideline anlegen für MSQ DX',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: true,
      compactContextLoaded: false,
    });
    expect(plan.intent).toBe('brandion_brand');
    expect(plan.allowWriteTools).toBe(true);
    expect(toolAllowedByPlan('brandion_guideline_create', plan)).toBe(true);
    expect(toolAllowedByPlan('brandion_token_upsert', plan)).toBe(true);
  });

  it('action_write includes brandion families when MCP is on', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Erstelle Target Group und importiere DTCG tokens',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasBrandionMcp: true,
      hasCreationMcp: true,
      compactContextLoaded: false,
    });
    expect(plan.intent).toBe('action_write');
    expect(plan.allowWriteTools).toBe(true);
    expect(plan.toolFamilies).toEqual(expect.arrayContaining(['brandion_guidelines', 'brandion_tokens']));
    expect(toolAllowedByPlan('brandion_guideline_import_dtcg', plan)).toBe(true);
  });
});
