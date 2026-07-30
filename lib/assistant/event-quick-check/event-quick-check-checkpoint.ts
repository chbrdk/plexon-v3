import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import type { EchonQuickCheckResearchHandle } from '@/lib/assistant/event-quick-check/echon-quick-check-research';
import type { CheckionProjectDeepScanStarted } from '@/lib/integrations/checkion-project-deep-scan-client';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import type { EventQuickCheckStepOutcome } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { EventQuickCheckDepth } from '@/lib/paths/assistant-workflows';

/** Serializable state when pausing before deep scan + competitors crawl (complete mode). */
export type EventQuickCheckCompetitorsCheckpoint = {
  projectName: string;
  url: string;
  platformProjectId: string;
  dashboardPath?: string;
  checkionProjectId: string;
  audionProjectId?: string;
  audionSetupRequired: boolean;
  companyBrief: EventQuickCheckCompanyBrief;
  outcomes: EventQuickCheckStepOutcome[];
  depth: EventQuickCheckDepth;
};

export function buildEventQuickCheckCompetitorsCheckpoint(input: {
  projectName: string;
  url: string;
  platformProjectId: string;
  dashboardPath?: string;
  checkionProjectId: string;
  audionProjectId?: string;
  audionSetupRequired: boolean;
  companyBrief: EventQuickCheckCompanyBrief;
  outcomes: EventQuickCheckStepOutcome[];
  depth: EventQuickCheckDepth;
}): EventQuickCheckCompetitorsCheckpoint {
  return { ...input };
}

/** Serializable workflow state when pausing before GEO LLM queries. */
export type EventQuickCheckResumeCheckpoint = {
  projectName: string;
  url: string;
  platformProjectId?: string;
  dashboardPath?: string;
  audionProjectId?: string;
  checkionProjectId?: string;
  audionSetupRequired?: boolean;
  outcomes: EventQuickCheckStepOutcome[];
  companyBrief?: EventQuickCheckCompanyBrief;
  personaPreview?: PersonaBootstrapPreview;
  domainScan?: DomainScanPreview;
  geoCompetitors: string[];
  echonHandle?: EchonQuickCheckResearchHandle | null;
  echonSkippedReason?: string;
  /** Active CHECKION domain-scan-all jobs (Komplettscan — may run for hours). */
  deepScanStarted?: CheckionProjectDeepScanStarted;
};

export function buildEventQuickCheckResumeCheckpoint(input: {
  projectName: string;
  url: string;
  platformProjectId?: string;
  dashboardPath?: string;
  audionProjectId?: string;
  checkionProjectId?: string;
  audionSetupRequired?: boolean;
  outcomes: EventQuickCheckStepOutcome[];
  steps: WorkflowStep[];
  companyBrief?: EventQuickCheckCompanyBrief;
  personaPreview?: PersonaBootstrapPreview;
  domainScan?: DomainScanPreview;
  geoCompetitors: string[];
  echonHandle?: EchonQuickCheckResearchHandle | null;
  echonSkippedReason?: string;
  deepScanStarted?: CheckionProjectDeepScanStarted;
}): EventQuickCheckResumeCheckpoint {
  void input.steps;
  return {
    projectName: input.projectName,
    url: input.url,
    platformProjectId: input.platformProjectId,
    dashboardPath: input.dashboardPath,
    audionProjectId: input.audionProjectId,
    checkionProjectId: input.checkionProjectId,
    audionSetupRequired: input.audionSetupRequired,
    outcomes: input.outcomes,
    companyBrief: input.companyBrief,
    personaPreview: input.personaPreview,
    domainScan: input.domainScan,
    geoCompetitors: input.geoCompetitors,
    echonHandle: input.echonHandle ?? null,
    echonSkippedReason: input.echonSkippedReason,
    deepScanStarted: input.deepScanStarted,
  };
}
