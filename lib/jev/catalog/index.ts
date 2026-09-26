import type { JevQuestions } from '@/lib/jev/types'

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
    intent: {
      type: 'choice',
      options: [...ASSISTANT_INTENT_OPTIONS],
      description: 'Primary assistant intent for this user prompt',
    },
  }
}

export function questionsCreationModelTier(): JevQuestions {
  return {
    tier: {
      type: 'choice',
      options: ['low', 'mid', 'high'],
      description: 'Creation assistant cost / thinking tier',
    },
  }
}

export function questionsShouldRefinePlan(): JevQuestions {
  return {
    refine: {
      type: 'noul',
      description: 'Should the heuristic plan be refined with a planner LLM?',
    },
  }
}

export function questionsWriteIntent(kind: 'scene' | 'audience'): JevQuestions {
  return {
    write: {
      type: 'noul',
      description: `Does the prompt request a ${kind} write/mutation?`,
    },
  }
}

export function questionsToolConfirm(): JevQuestions {
  return {
    confirm_required: {
      type: 'noul',
      description: 'Is human confirmation required before running this tool?',
    },
  }
}

export function questionsPromoteClassify(): JevQuestions {
  return {
    kind: {
      type: 'choice',
      options: ['flow', 'playbook', 'reject'],
      description: 'Capability promote classification',
    },
  }
}

export function questionsSceneQuality(): JevQuestions {
  return {
    pass: {
      type: 'noul',
      description: 'Does the creation scene pass the quality gate?',
    },
    severity: {
      type: 'score',
      levels: 5,
      description: 'Quality issue severity 0–4',
    },
  }
}

export function questionsPlanner(): JevQuestions {
  return {
    intent: {
      type: 'choice',
      options: [
        'general_chat',
        'creation_scene_edit',
        'geo_analysis',
        'event_quick_check',
        'other',
      ],
    },
    allow_write: {
      type: 'noul',
      description: 'Allow write tools for this turn?',
    },
  }
}

export function questionsMcpFlags(): JevQuestions {
  return {
    use_creation: { type: 'noul', description: 'Attach Creation MCP?' },
    use_checkion: { type: 'noul', description: 'Attach Checkion MCP?' },
    use_audion: { type: 'noul', description: 'Attach Audion MCP?' },
    use_echon: { type: 'noul', description: 'Attach Echon MCP?' },
    use_brandion: { type: 'noul', description: 'Attach Brandion MCP?' },
    use_videon: { type: 'noul', description: 'Attach Videon MCP?' },
    use_metron: { type: 'noul', description: 'Attach Metron MCP?' },
  }
}

export function questionsScoreTone(): JevQuestions {
  return {
    tone: {
      type: 'choice',
      options: ['pos', 'low', 'neg'],
      description: 'UI tone for a 0–100 score',
    },
  }
}

export function questionsFrictionSeverity(): JevQuestions {
  return {
    severity: {
      type: 'choice',
      options: ['high', 'medium', 'low'],
    },
  }
}

export function questionsFollowUpMode(): JevQuestions {
  return {
    mode: {
      type: 'choice',
      options: ['none', 'suggest', 'auto'],
    },
  }
}
