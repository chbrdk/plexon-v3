/**
 * Creation assistant budget-tier routing (Wave D).
 * Spec: specs/domain/assistant-creation-agi-lite.md § Budget-tier routing
 */

import {
  getAssistantCompletionModel,
  getAssistantThinkingBudgetTokens,
} from '@/lib/constants';
import { runtimeEnv } from '@/lib/runtime-env';
import type { CreationCraftPlaybookId } from '@/lib/assistant/creation-craft-playbooks';
import { getCreationSceneThinkingBudgetTokens } from '@/lib/assistant/creation-scene-depth';
import { JEV_USE_CASES, questionsCreationModelTier } from '@/lib/jev/catalog';
import { scheduleJevShadow } from '@/lib/jev/schedule';

export type CreationModelTier = 'low' | 'mid' | 'high';

const HIGH_THINKING_FLOOR = 12_288;

const HIGH_PLAYBOOKS: ReadonlySet<CreationCraftPlaybookId> = new Set([
  'creation_landing_v1',
  'creation_newsletter_v1',
  'creation_print_magazine_v1',
  'creation_print_report_v1',
]);

function parseTierOverride(): CreationModelTier | null {
  const raw = runtimeEnv('ASSISTANT_CREATION_MODEL_TIER').toLowerCase();
  if (raw === 'low' || raw === 'mid' || raw === 'high') return raw;
  if (raw === 'auto' || !raw) return null;
  return null;
}

export type ResolveCreationModelTierInput = {
  intent: string;
  allowWriteTools?: boolean;
  playbookId?: CreationCraftPlaybookId | null;
};

/**
 * Heuristic tier (not RL).
 * - low: non-scene intents / read-only Q&A
 * - mid: creation_scene_edit default polish
 * - high: format craft playbooks with writes (landing/newsletter/print)
 */
export function resolveCreationModelTier(
  input: ResolveCreationModelTierInput,
): CreationModelTier {
  const override = parseTierOverride();
  let tier: CreationModelTier
  if (override) {
    tier = override
  } else if (input.intent !== 'creation_scene_edit') {
    tier = 'low'
  } else if (!input.allowWriteTools) {
    tier = 'low'
  } else if (input.playbookId && HIGH_PLAYBOOKS.has(input.playbookId)) {
    tier = 'high'
  } else {
    tier = 'mid'
  }
  scheduleJevShadow({
    useCaseId: JEV_USE_CASES.assistantCreationModelTier,
    state: {
      intent: input.intent,
      allowWriteTools: Boolean(input.allowWriteTools),
      playbookId: input.playbookId ?? null,
    },
    questions: questionsCreationModelTier(),
    baseline: tier,
    extractChoiceKey: 'tier',
  })
  return tier
}

/** Thinking budget for the resolved tier. Global thinking off stays off. */
export function getCreationThinkingBudgetForTier(tier: CreationModelTier): number {
  const base = getAssistantThinkingBudgetTokens();
  if (base <= 0) return 0;

  if (tier === 'low') return base;

  const mid = getCreationSceneThinkingBudgetTokens();
  if (tier === 'mid') return mid;

  const highRaw = runtimeEnv('ANTHROPIC_CREATION_SCENE_THINKING_BUDGET_HIGH').toLowerCase();
  if (highRaw === '0' || highRaw === 'off' || highRaw === 'false' || highRaw === 'disabled') {
    return mid;
  }
  const parsed = highRaw ? Number.parseInt(highRaw, 10) : HIGH_THINKING_FLOOR;
  const highFloor =
    Number.isFinite(parsed) && parsed > 0 ? parsed : HIGH_THINKING_FLOOR;
  return Math.max(mid, highFloor);
}

/**
 * Model id for tier. High only upgrades when ASSISTANT_CREATION_HIGH_MODEL
 * (or ANTHROPIC_ASSISTANT_MODEL_HIGH) is set — default stays Mid cost.
 */
export function getCreationCompletionModelForTier(tier: CreationModelTier): string {
  const defaultModel = getAssistantCompletionModel();
  if (tier !== 'high') return defaultModel;
  const high =
    runtimeEnv('ASSISTANT_CREATION_HIGH_MODEL') ||
    runtimeEnv('ANTHROPIC_ASSISTANT_MODEL_HIGH');
  return high || defaultModel;
}

export function resolveCreationSceneBudget(input: ResolveCreationModelTierInput): {
  tier: CreationModelTier;
  thinkingBudgetTokens: number;
  model: string;
} {
  const tier = resolveCreationModelTier(input);
  return {
    tier,
    thinkingBudgetTokens: getCreationThinkingBudgetForTier(tier),
    model: getCreationCompletionModelForTier(tier),
  };
}
