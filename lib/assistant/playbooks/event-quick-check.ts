import type { PlaybookDefinition } from '@/lib/assistant/playbooks/types';
import { registerPlaybook } from '@/lib/assistant/playbooks/registry';
import { EVENT_QUICK_CHECK_PLAYBOOK_ID } from '@/lib/paths/assistant-workflows';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';

export const EVENT_QUICK_CHECK_PLAYBOOK: PlaybookDefinition = {
  id: EVENT_QUICK_CHECK_PLAYBOOK_ID,
  label: QUICK_CHECK_LABEL,
  description:
    'Schnellcheck für Events: Research, 50-Seiten-Scan, AUDION-Persona, 3 GEO-Fragen und Competitive-Check.',
  requiresUrl: true,
  steps: [
    { id: 'create_project', kind: 'sync_diagnose', label: 'Projekt' },
    { id: 'ensure_audion', kind: 'sync_diagnose', label: 'AUDION einrichten' },
    { id: 'parallel_research', kind: 'parallel_research', label: 'Research' },
    { id: 'domain_scan', kind: 'domain_scan', label: 'Domain-Scan (50 Seiten)' },
    { id: 'persona_bootstrap', kind: 'persona_bootstrap', label: 'Persona' },
    { id: 'geo_questions', kind: 'geo_analysis', label: 'GEO-Fragen' },
    { id: 'geo_check', kind: 'geo_analysis', label: 'GEO-Check' },
  ],
};

registerPlaybook(EVENT_QUICK_CHECK_PLAYBOOK);
