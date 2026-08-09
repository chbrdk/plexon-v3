import type { UiTone } from '@/lib/assistant/ui-blocks/types';
import type { PageSpeedPreview, ScanResultPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import type { SslCheckPreview } from '@/lib/integrations/checkion-tools-ssl-client';
import type { ReadabilityCheckPreview } from '@/lib/integrations/checkion-tools-readability-client';
import type { PlaybookRunResult } from '@/lib/assistant/playbooks/runner';
import type { LaunchReadinessResult } from '@/lib/assistant/playbooks/run-launch-readiness';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { WorkflowFollowUpPrompt } from '@/lib/assistant/insights/follow-up-suggestions';

export type WorkflowInsightHighlight = {
  label: string;
  value: string | number;
  unit?: string;
  tone?: UiTone;
};

export type WorkflowInsightFinding = {
  title: string;
  description: string;
  severity?: UiTone;
};

export type WorkflowInsightRecommendation = {
  title: string;
  description?: string;
  priority?: number;
  category?: string;
};

/** Analyst narrative appended after raw workflow data blocks. */
export type WorkflowInsightNarrative = {
  assessment: string;
  fazit: string;
  fazitTone?: UiTone;
  highlights?: WorkflowInsightHighlight[];
  findings: WorkflowInsightFinding[];
  recommendations: WorkflowInsightRecommendation[];
  crossComparisons?: string[];
};

export type CrossSignal = {
  id: string
  category: string
  severity: UiTone
  title: string
  fact: string
  /**
   * `context` = LLM input only (never map to findings).
   * Default / omitted = eligible for fallback findings.
   */
  role?: 'context' | 'insight'
}

export type CrossBenchmarks = {
  pageSpeed?: PageSpeedPreview;
  fetchNote?: string;
};

export type { WorkflowFollowUpPrompt };

export type WorkflowInsightSource =
  | { workflowType: 'geo_analysis'; url: string; job: GeoEeatJobPreview }
  | { workflowType: 'quick_scan'; url: string; scan: ScanResultPreview }
  | { workflowType: 'pagespeed_check'; url: string; pageSpeed: PageSpeedPreview }
  | { workflowType: 'domain_scan'; url: string; scan: DomainScanPreview }
  | { workflowType: 'ssl_check'; host: string; ssl: SslCheckPreview }
  | { workflowType: 'readability_check'; url: string; readability: ReadabilityCheckPreview }
  | { workflowType: 'website_audit'; url: string; playbook: PlaybookRunResult }
  | { workflowType: 'launch_readiness'; url: string; launch: LaunchReadinessResult }
  | { workflowType: 'event_quick_check'; url: string; quick: EventQuickCheckResult };

export type EnrichWorkflowInput = {
  source: WorkflowInsightSource;
  dataLayout: import('@/lib/assistant/ui-blocks/types').UiLayout;
  projectContext?: string | null;
  crossBenchmarks?: CrossBenchmarks;
  crossSignals: CrossSignal[];
};
