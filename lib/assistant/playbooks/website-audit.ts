import type { PlaybookDefinition } from '@/lib/assistant/playbooks/types';
import { registerPlaybook } from '@/lib/assistant/playbooks/registry';

export const WEBSITE_AUDIT_PLAYBOOK: PlaybookDefinition = {
  id: 'website_audit',
  label: 'Website-Audit',
  description:
    'Verkettete Analyse: PageSpeed, Accessibility-Scan, SSL, Lesbarkeit und optional GEO / E-E-A-T.',
  requiresUrl: true,
  steps: [
    { id: 'pagespeed', kind: 'pagespeed_check', label: 'PageSpeed', optional: false },
    { id: 'quick_scan', kind: 'quick_scan', label: 'Accessibility-Scan', optional: false },
    { id: 'ssl_check', kind: 'ssl_check', label: 'SSL-Check', optional: true },
    { id: 'readability_check', kind: 'readability_check', label: 'Lesbarkeit', optional: true },
    { id: 'contrast_check', kind: 'contrast_check', label: 'Kontrast-Check', optional: true },
    { id: 'geo_analysis', kind: 'geo_analysis', label: 'GEO / E-E-A-T', optional: true, timeoutMs: 600_000 },
    { id: 'security_headers', kind: 'security_headers', label: 'Security Headers', optional: true },
    { id: 'dns_check', kind: 'dns_check', label: 'DNS-Check', optional: true },
  ],
};

registerPlaybook(WEBSITE_AUDIT_PLAYBOOK);
