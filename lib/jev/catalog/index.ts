import {
  choiceQuestion,
  noulQuestion,
  scoreLevelCriteria,
  scoreQuestion,
  type JevQuestions,
} from '@/lib/jev/types'

/** Canonical P0–P2 use-case ids — specs/domain/jev-use-case-catalog.md */
export const JEV_USE_CASES = {
  assistantIntent: 'assistant.intent',
  assistantPlanner: 'assistant.planner',
  assistantShouldRefinePlan: 'assistant.should_refine_plan',
  assistantCreationModelTier: 'assistant.creation_model_tier',
  assistantMcpFlagsForPlan: 'assistant.mcp_flags_for_plan',
  assistantSceneWriteIntent: 'assistant.scene_write_intent',
  assistantAudienceWriteIntent: 'assistant.audience_write_intent',
  assistantToolConfirmRequired: 'assistant.tool_confirm_required',
  assistantCreationSceneQuality: 'assistant.creation_scene_quality',
  capabilityPromoteClassify: 'capability.promote_classify',
  eqcGeoModelSanitize: 'eqc.geo_model_sanitize',
  assistantCreationCraftPlaybook: 'assistant.creation_craft_playbook',
  assistantCreationCraftModules: 'assistant.creation_craft_modules',
  assistantSpecialist: 'assistant.specialist',
  assistantSpecialistFlowHandoff: 'assistant.specialist_flow_handoff',
  assistantPersonaPageRelevance: 'assistant.persona_page_relevance',
  assistantKnowledgeRank: 'assistant.knowledge_rank',
  assistantCrossSignalSeverity: 'assistant.cross_signal_severity',
  assistantFollowUpActions: 'assistant.follow_up_actions',
  eqcInsightMetaFilter: 'eqc.insight_meta_filter',
  eqcGeoQuestionSource: 'eqc.geo_question_source',
  eqcBuyerSegmentCount: 'eqc.buyer_segment_count',
  assistantKnowledgePackUseLlm: 'assistant.knowledge_pack_use_llm',
  assistantWorkflowInsightsEnable: 'assistant.workflow_insights_enable',
  assistantToolFamily: 'assistant.tool_family',
  assistantModelProfile: 'assistant.model_profile',
  eqcDashboardBands: 'eqc.dashboard_bands',
  audionFrictionSeverity: 'audion.friction_severity',
  uiScoreTone: 'ui.score_tone',
  eqcEeatReadingVariant: 'eqc.eeat_reading_variant',
  assistantCompanyBriefUseLlm: 'assistant.company_brief_use_llm',
  assistantCraftMemoryEnable: 'assistant.craft_memory_enable',
  assistantCraftEvalScore: 'assistant.craft_eval_score',
  metronFollowUpMode: 'metron.follow_up_mode',
  checkionSeverityPreview: 'checkion.severity_preview',
} as const

export type JevUseCaseId = (typeof JEV_USE_CASES)[keyof typeof JEV_USE_CASES]

export const ASSISTANT_INTENT_OPTIONS = [
  'free_chat',
  'create_project',
  'quick_scan',
  'pagespeed_check',
  'domain_scan',
  'contrast_check',
  'readability_check',
  'scan_summarize',
  'sync_diagnose',
  'persona_bootstrap',
  'persona_page_relevance',
  'journey_outline',
  'journey_generate',
  'geo_analysis',
  'ssl_check',
  'wayback_check',
  'run_playbook',
  'project_status',
  'start_research',
  'capabilities',
  'ui_showcase',
  'run_collection_flow',
  'promote_capability_sequence',
  'campaign_brief_list',
  'campaign_brief_create',
  'other',
] as const

export function questionsAssistantIntent(): JevQuestions {
  return {
    intent: choiceQuestion(
      'Primary assistant intent for this user prompt',
      ASSISTANT_INTENT_OPTIONS,
    ),
  }
}

export function questionsCreationModelTier(): JevQuestions {
  return {
    tier: choiceQuestion('Creation assistant cost / thinking tier', [
      'low',
      'mid',
      'high',
    ]),
  }
}

export function questionsShouldRefinePlan(): JevQuestions {
  return {
    refine: noulQuestion(
      'Should the heuristic plan be refined with a planner LLM?',
      'Plan is incomplete, ambiguous, or high-stakes — refine with LLM.',
      'Heuristic plan is sufficient; skip planner LLM.',
    ),
  }
}

export function questionsWriteIntent(kind: 'scene' | 'audience'): JevQuestions {
  return {
    write: noulQuestion(
      `Does the prompt request a ${kind} write/mutation?`,
      `User asks to create, edit, or mutate ${kind} content.`,
      `User is asking a question or reading without write intent.`,
    ),
  }
}

export function questionsToolConfirm(): JevQuestions {
  return {
    confirm_required: noulQuestion(
      'Is human confirmation required before running this tool?',
      'Tool is destructive, expensive, or irreversible — require confirm.',
      'Tool is safe/read-only; can run without confirm.',
    ),
  }
}

export function questionsPromoteClassify(): JevQuestions {
  return {
    kind: choiceQuestion('Capability promote classification', [
      'flow',
      'playbook',
      'reject',
    ]),
  }
}

export function questionsSceneQuality(): JevQuestions {
  return {
    pass: noulQuestion(
      'Does the creation scene pass the quality gate?',
      'Scene meets layout, token, and content quality bars.',
      'Scene has blocking quality issues.',
    ),
    severity: scoreQuestion(
      'Quality issue severity',
      scoreLevelCriteria(5),
    ),
  }
}

export function questionsPlanner(): JevQuestions {
  return {
    intent: choiceQuestion('Planner intent bucket for this turn', [
      'general_chat',
      'creation_scene_edit',
      'geo_analysis',
      'event_quick_check',
      'other',
    ]),
    allow_write: noulQuestion(
      'Allow write tools for this turn?',
      'User intent includes mutating project/scene/data — allow writes.',
      'Read-only or clarifying turn — deny writes.',
    ),
  }
}

export function questionsMcpFlags(): JevQuestions {
  const attach = (product: string) =>
    noulQuestion(
      `Attach ${product} MCP for this plan?`,
      `Plan needs ${product} tools or data.`,
      `Plan does not need ${product}.`,
    )
  return {
    use_creation: attach('Creation'),
    use_checkion: attach('Checkion'),
    use_audion: attach('Audion'),
    use_echon: attach('Echon'),
    use_brandion: attach('Brandion'),
    use_videon: attach('Videon'),
    use_metron: attach('Metron'),
  }
}

export function questionsScoreTone(): JevQuestions {
  return {
    tone: choiceQuestion('UI tone for a 0–100 score', ['pos', 'low', 'neg'], {
      pos: 'Positive / healthy score',
      low: 'Neutral / middling score',
      neg: 'Negative / concerning score',
    }),
  }
}

export function questionsFrictionSeverity(): JevQuestions {
  return {
    severity: choiceQuestion('Friction severity', ['high', 'medium', 'low']),
  }
}

export function questionsFollowUpMode(): JevQuestions {
  return {
    mode: choiceQuestion('Follow-up mode', ['none', 'suggest', 'auto']),
  }
}
