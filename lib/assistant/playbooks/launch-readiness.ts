import type { PlaybookDefinition } from '@/lib/assistant/playbooks/types';
import { registerPlaybook } from '@/lib/assistant/playbooks/registry';

export const LAUNCH_READINESS_PLAYBOOK: PlaybookDefinition = {
  id: 'launch_readiness',
  label: 'Launch Readiness',
  description:
    'Cross-Product-Onboarding: Projekt anlegen, Sync, Research, Light-Audit, Persona und Status-Report.',
  requiresUrl: true,
  steps: [
    { id: 'create_project', kind: 'sync_diagnose', label: 'Plattform-Projekt' },
    { id: 'sync_diagnose', kind: 'sync_diagnose', label: 'Sync-Diagnose', optional: true },
    { id: 'parallel_research', kind: 'parallel_research', label: 'Research', optional: true },
    { id: 'pagespeed', kind: 'pagespeed_check', label: 'PageSpeed' },
    { id: 'quick_scan', kind: 'quick_scan', label: 'Accessibility-Scan' },
    { id: 'ssl_check', kind: 'ssl_check', label: 'SSL-Check', optional: true },
    { id: 'persona_bootstrap', kind: 'persona_bootstrap', label: 'Persona-Bootstrap', optional: true },
  ],
};

registerPlaybook(LAUNCH_READINESS_PLAYBOOK);
