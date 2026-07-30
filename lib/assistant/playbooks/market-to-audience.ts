import type { PlaybookDefinition } from '@/lib/assistant/playbooks/types';
import { registerPlaybook } from '@/lib/assistant/playbooks/registry';

export const MARKET_TO_AUDIENCE_PLAYBOOK: PlaybookDefinition = {
  id: 'market_to_audience',
  label: 'Markt → Zielgruppen',
  description:
    'CHECKION-Projektkontext, ECHON Markt-Research (async), Ableitung und Anlage von AUDION-Zielgruppen.',
  requiresUrl: false,
  steps: [
    { id: 'prepare', kind: 'sync_diagnose', label: 'Vorbereitung' },
    { id: 'checkion_context', kind: 'sync_diagnose', label: 'CHECKION-Kontext', optional: true },
    { id: 'echon_research', kind: 'parallel_research', label: 'ECHON Research' },
    { id: 'audion_target_groups', kind: 'persona_bootstrap', label: 'AUDION Zielgruppen' },
  ],
};

registerPlaybook(MARKET_TO_AUDIENCE_PLAYBOOK);
