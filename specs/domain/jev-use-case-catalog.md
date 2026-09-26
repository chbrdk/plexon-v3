# Jev use-case catalog — PLEXON

Shadow-first. Env suffix = uppercase id with dots → underscores (`assistant.intent` → `ASSISTANT_INTENT`).

## P0 — routing / agent gates

| ID | Baseline | Questions | Hook |
|----|----------|-----------|------|
| `assistant.intent` | `routeAssistantIntent` | Choice: intent type | `lib/assistant/intent-router.ts` |
| `assistant.planner` | `planAssistantTurnHeuristic` | Choice: intent/mode; Noul: write | `lib/assistant/assistant-planner.ts` |
| `assistant.should_refine_plan` | `shouldRefinePlanWithLlm` | Noul | `lib/assistant/assistant-planner.ts` |
| `assistant.creation_model_tier` | `resolveCreationModelTier` | Choice: low/mid/high | `lib/assistant/creation-model-tier.ts` |
| `assistant.mcp_flags_for_plan` | `resolveMcpFlagsForPlan` | Choice per product flag | `lib/assistant/mcp-flags-for-plan.ts` |
| `assistant.scene_write_intent` | `hasSceneWriteIntent` | Noul | `lib/assistant/scene-write-intent.ts` |
| `assistant.audience_write_intent` | `hasAudienceWriteIntent` | Noul | `lib/assistant/audience-write-intent.ts` |
| `assistant.tool_confirm_required` | `isConfirmationRequiredToolName` | Noul | `lib/assistant/orchestrator-complete.ts` |
| `assistant.creation_scene_quality` | `evaluateCreationSceneQuality` | Noul pass + Scores | `lib/assistant/creation-scene-quality.ts` |
| `capability.promote_classify` | `classifyPromoteTrace` | Choice: flow/playbook/reject | `lib/capabilities/promote.ts` |
| `eqc.geo_model_sanitize` | `sanitizeEqcGeoModels` | Choice allow-set | `lib/integrations/eqc-geo-default-models.ts` |

## P1 — ranking / resolve

| ID | Baseline | Questions |
|----|----------|-----------|
| `assistant.creation_craft_playbook` | `resolveCreationCraftPlaybook` | Choice playbook |
| `assistant.creation_craft_modules` | `resolveCreationCraftModules` | Choice modules / Noul refs |
| `assistant.specialist` | `resolveSpecialist` | Choice specialist |
| `assistant.specialist_flow_handoff` | `resolvePreferredFlowForSpecialist` | Choice flow + Score |
| `assistant.persona_page_relevance` | `rankCorpusPagesForPersona` | Score + tier Choice |
| `assistant.knowledge_rank` | `rankKnowledgeHits` | Score |
| `assistant.cross_signal_severity` | `buildWorkflowCrossSignals` | Choice tone |
| `assistant.follow_up_actions` | `buildWorkflowFollowUps` | Choice next actions |
| `eqc.insight_meta_filter` | `isEqcMetaSignal` | Noul keep/drop |
| `eqc.geo_question_source` | cascade in geo question builders | Choice source |
| `eqc.buyer_segment_count` | `derive-buyer-segments` | Choice count |
| `assistant.knowledge_pack_use_llm` | research-knowledge-pack | Noul |
| `assistant.workflow_insights_enable` | `isWorkflowInsightsEnabled` | Noul + tone Choice |
| `assistant.tool_family` | `classifyToolFamily` | Choice |
| `assistant.model_profile` | board vs assistant | Choice |
| `eqc.dashboard_bands` | layout resolvers | Choice band set |
| `audion.friction_severity` | `frictionSeverity` | Choice |

## P2 — small maps

| ID | Baseline | Questions |
|----|----------|-----------|
| `ui.score_tone` | threshold helpers | Choice pos/low/neg |
| `eqc.eeat_reading_variant` | fallback templates | Choice |
| `assistant.company_brief_use_llm` | research-company-brief | Noul |
| `assistant.craft_memory_enable` | craft memory env | Noul |
| `assistant.craft_eval_score` | craft eval | Score |
| `metron.follow_up_mode` | `resolveMetronFollowUpMode` | Choice |
| `checkion.severity_preview` | `severityToPreviewType` | Choice |

## Excluded (deterministic)

`product_mcp_gate`, `collection_flow_score_gate`, `attachment_quota`, `pin_eligibility`.
