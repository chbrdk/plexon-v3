import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';

/** Kurze Live-Labels für die EQC-Zwischenphase (nicht Report-Appendix). */
const EQC_LIVE_STEP_LABELS: Record<string, string> = {
  prepare: 'Start',
  company_research: 'Recherche',
  company_brief_confirm: 'Profil',
  competitors_suggest: 'Wettbewerb',
  competitors_confirm: 'Wettbewerb',
  create_project: 'Projekt',
  ensure_audion: 'AUDION',
  persona_bootstrap: 'Personas',
  geo_questions: 'Fragen',
  geo_questions_confirm: 'Fragen',
  domain_scan: 'Domain',
  geo_check: 'GEO',
  aggregate: 'Report',
  echon_market_research: 'Markt',
};

const DETAIL_MAX = 56;

export function eqcLiveStepLabel(step: Pick<WorkflowStep, 'id' | 'label'>): string {
  return EQC_LIVE_STEP_LABELS[step.id] ?? shortenLabel(step.label);
}

function shortenLabel(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length <= 18) return trimmed;
  return `${trimmed.slice(0, 16).trim()}…`;
}

export function eqcLiveStepDetail(detail: string | undefined): string | null {
  if (!detail?.trim()) return null;
  const oneLine = detail.trim().replace(/\s+/g, ' ');
  if (oneLine.length <= DETAIL_MAX) return oneLine;
  return `${oneLine.slice(0, DETAIL_MAX - 1).trim()}…`;
}

export function eqcActiveStepIndex(steps: Array<{ status: WorkflowStep['status'] }>): number {
  const runningIdx = steps.findIndex((s) => s.status === 'running');
  if (runningIdx >= 0) return runningIdx;
  const errorIdx = steps.findIndex((s) => s.status === 'error');
  if (errorIdx >= 0) return errorIdx;
  const pendingIdx = steps.findIndex((s) => s.status === 'pending');
  if (pendingIdx >= 0) return pendingIdx;
  return Math.max(0, steps.length - 1);
}

export type EqcLiveProgressRow = {
  id: string;
  label: string;
  status: WorkflowStep['status'];
  detail: string | null;
  progress?: number;
};

/** Collapse consecutive same short-labels; keep latest status for display rail. */
export function buildEqcLiveProgressRows(steps: WorkflowStep[]): EqcLiveProgressRow[] {
  const rows: EqcLiveProgressRow[] = [];
  for (const step of steps) {
    const label = eqcLiveStepLabel(step);
    const prev = rows[rows.length - 1];
    if (prev && prev.label === label) {
      prev.status = mergeStatus(prev.status, step.status);
      prev.detail = eqcLiveStepDetail(step.detail) ?? prev.detail;
      if (typeof step.progress === 'number') prev.progress = step.progress;
      prev.id = step.id;
      continue;
    }
    rows.push({
      id: step.id,
      label,
      status: step.status,
      detail: eqcLiveStepDetail(step.detail),
      ...(typeof step.progress === 'number' ? { progress: step.progress } : {}),
    });
  }
  return rows;
}

function mergeStatus(
  a: WorkflowStep['status'],
  b: WorkflowStep['status']
): WorkflowStep['status'] {
  if (a === 'error' || b === 'error') return 'error';
  if (a === 'running' || b === 'running') return 'running';
  if (a === 'pending' || b === 'pending') {
    if (a === 'done' || b === 'done') return 'running';
    return 'pending';
  }
  return 'done';
}

export function eqcLiveProgressSummary(steps: WorkflowStep[]): {
  rows: EqcLiveProgressRow[];
  activeIndex: number;
  active: EqcLiveProgressRow | null;
  doneCount: number;
  total: number;
} {
  const rows = buildEqcLiveProgressRows(steps);
  const activeIndex = eqcActiveStepIndex(rows);
  const doneCount = rows.filter((r) => r.status === 'done').length;
  return {
    rows,
    activeIndex,
    active: rows[activeIndex] ?? null,
    doneCount,
    total: rows.length,
  };
}
