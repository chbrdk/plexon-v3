export type PlaybookStepKind =
  | 'pagespeed_check'
  | 'quick_scan'
  | 'domain_scan'
  | 'ssl_check'
  | 'wayback_check'
  | 'geo_analysis'
  | 'contrast_check'
  | 'readability_check'
  | 'sync_diagnose'
  | 'parallel_research'
  | 'persona_bootstrap'
  | 'security_headers'
  | 'dns_check';

export type PlaybookStepDefinition = {
  id: string;
  kind: PlaybookStepKind;
  label: string;
  optional?: boolean;
  timeoutMs?: number;
};

export type PlaybookDefinition = {
  id: string;
  label: string;
  description: string;
  requiresUrl?: boolean;
  steps: PlaybookStepDefinition[];
};

export type PlaybookContext = {
  url?: string;
  platformProjectId?: string;
  checkionProjectId?: string | null;
  userId: string;
  contrast?: { foreground: string; background: string };
  includeGeo?: boolean;
};
