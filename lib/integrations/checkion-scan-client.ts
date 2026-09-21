/**
 * CHECKION accessibility quick scan for Assistant / agent surfaces.
 * Uses contracts `POST /api/scans` (mode=single) — legacy `/api/scan` does not exist on checkion-v3.
 * @see knowledge/checkion-quick-scan-v3.md
 */

import type { ScanResultPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import { createCheckionProject } from '@/lib/integrations/checkion-project-client';
import {
  fetchCheckionScanIssues,
  runCheckionSingleScan,
  type CheckionIssueItem,
} from '@/lib/integrations/checkion-scans-client';

export type QuickScanResult =
  | { ok: true; scan: ScanResultPreview }
  | { ok: false; error: string; missing?: Array<'url' | 'projectId'> };

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname || 'scan';
  } catch {
    return 'scan';
  }
}

function severityToPreviewType(severity: string): string {
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'serious' || s === 'error') return 'error';
  if (s === 'moderate' || s === 'warning') return 'warning';
  return 'notice';
}

function buildStats(items: CheckionIssueItem[]): ScanResultPreview['stats'] {
  let errors = 0;
  let warnings = 0;
  let notices = 0;
  for (const it of items) {
    const t = severityToPreviewType(it.severity);
    if (t === 'error') errors += 1;
    else if (t === 'warning') warnings += 1;
    else notices += 1;
  }
  return { errors, warnings, notices, total: items.length };
}

function mapIssues(items: CheckionIssueItem[]): ScanResultPreview['issues'] {
  return items.slice(0, 50).map((it) => ({
    code: it.ruleId || it.id,
    type: severityToPreviewType(it.severity),
    message: it.title ?? it.ruleId ?? it.id,
    selector: '',
  }));
}

async function resolveCheckionProjectId(input: {
  url: string;
  checkionProjectId?: string | null;
  actorUserId?: string | null;
}): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const existing = input.checkionProjectId?.trim();
  if (existing) return { ok: true, projectId: existing };

  const created = await createCheckionProject(
    `Quick Scan · ${hostnameFromUrl(input.url)}`,
    hostnameFromUrl(input.url),
    input.actorUserId
  );
  if (!created.ok) {
    return {
      ok: false,
      error: `CHECKION Projekt für Quick Scan fehlt und konnte nicht angelegt werden: ${created.error}`,
    };
  }
  return { ok: true, projectId: created.id };
}

export async function runCheckionQuickScan(input: {
  url: string;
  checkionProjectId?: string | null;
  actorUserId?: string | null;
}): Promise<QuickScanResult> {
  const url = input.url.trim();
  if (!url) {
    return { ok: false, error: 'URL fehlt', missing: ['url'] };
  }

  const project = await resolveCheckionProjectId(input);
  if (!project.ok) {
    return { ok: false, error: project.error, missing: ['projectId'] };
  }

  const started = await runCheckionSingleScan({
    projectId: project.projectId,
    url,
    mode: 'single',
  });
  if (!started.ok) {
    return { ok: false, error: started.error };
  }

  const summary = started.scan;
  const status = summary.status.toLowerCase();
  if (status === 'failed' || status === 'cancelled') {
    return {
      ok: false,
      error: summary.error?.trim() || `CHECKION Scan ${status}`,
    };
  }

  const issuesRes = await fetchCheckionScanIssues(summary.id);
  const items = issuesRes.ok ? issuesRes.items : [];
  const stats = buildStats(items);
  const score =
    typeof summary.overallScore === 'number' && Number.isFinite(summary.overallScore)
      ? summary.overallScore
      : Math.max(0, 100 - stats.errors * 8 - stats.warnings * 3);

  return {
    ok: true,
    scan: {
      id: summary.id,
      url: summary.url || url,
      score,
      stats,
      issues: mapIssues(items),
    },
  };
}
