import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';

export const MARKET_TO_AUDIENCE_INITIAL_STEPS: WorkflowStep[] = [
  { id: 'prepare', label: 'Vorbereitung', status: 'pending' },
  { id: 'checkion_context', label: 'CHECKION-Kontext', status: 'pending' },
  { id: 'echon_research', label: 'ECHON Markt-Research', status: 'pending' },
  { id: 'audion_target_groups', label: 'AUDION Zielgruppen', status: 'pending' },
];
