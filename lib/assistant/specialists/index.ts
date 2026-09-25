/**
 * Internal domain specialists — Wave 1 barrel.
 * Spec: specs/domain/assistant-domain-specialists.md
 */

export {
  WAVE1_SPECIALIST_IDS,
  WAVE2_SPECIALIST_IDS,
  REGISTERED_SPECIALIST_IDS,
  creationSceneSpecialistFamilies,
  resolveSpecialist,
  isAssistantSpecialistId,
} from '@/lib/assistant/specialists/registry';
export type {
  AssistantSpecialist,
  AssistantSpecialistId,
  SpecialistContext,
} from '@/lib/assistant/specialists/types';
