import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { LaunchReadinessResult, LaunchReadinessStepOutcome } from '@/lib/assistant/playbooks/run-launch-readiness';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import { pathPlatformProjectDashboard } from '@/lib/constants';

type UiTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

function scoreTone(value: number): UiTone {
  if (value >= 80) return 'success';
  if (value >= 60) return 'warning';
  return 'error';
}

function sslTone(grade: string | null | undefined): UiTone {
  if (!grade) return 'neutral';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'success';
  if (g.startsWith('B')) return 'warning';
  return 'error';
}

function probeTone(ok: boolean | undefined): UiTone {
  if (ok === true) return 'success';
  if (ok === false) return 'error';
  return 'neutral';
}

function buildReadinessMetrics(outcomes: LaunchReadinessStepOutcome[]): Array<{
  label: string;
  value: string | number;
  unit?: string;
  tone?: UiTone;
  hint?: string;
}> {
  const items: Array<{
    label: string;
    value: string | number;
    unit?: string;
    tone?: UiTone;
    hint?: string;
  }> = [];

  const pagespeed = outcomes.find((o) => o.stepId === 'audit_pagespeed' && o.payload?.kind === 'pagespeed_check');
  if (pagespeed?.payload?.kind === 'pagespeed_check') {
    const perf = pagespeed.payload.data.performance;
    items.push({ label: 'Performance', value: perf, unit: '/100', tone: scoreTone(perf) });
    items.push({
      label: 'A11y (PSI)',
      value: pagespeed.payload.data.accessibility,
      unit: '/100',
      tone: scoreTone(pagespeed.payload.data.accessibility),
    });
  }

  const scan = outcomes.find((o) => o.stepId === 'audit_quick_scan' && o.payload?.kind === 'quick_scan');
  if (scan?.payload?.kind === 'quick_scan') {
    const score = scan.payload.data.score;
    items.push({ label: 'WCAG Scan', value: score, unit: '/100', tone: scoreTone(score) });
  }

  const ssl = outcomes.find((o) => o.stepId === 'audit_ssl' && o.payload?.kind === 'ssl_check');
  if (ssl?.payload?.kind === 'ssl_check') {
    items.push({
      label: 'SSL',
      value: ssl.payload.data.grade ?? '—',
      tone: sslTone(ssl.payload.data.grade),
    });
  }

  const sync = outcomes.find((o) => o.stepId === 'sync_diagnose');
  if (sync?.data) {
    const checkionOk = Boolean((sync.data.checkionProbe as { ok?: boolean } | undefined)?.ok);
    const audionOk = Boolean((sync.data.audionProbe as { ok?: boolean } | undefined)?.ok);
    items.push({ label: 'CHECKION', value: checkionOk ? 'OK' : 'Fehler', tone: probeTone(checkionOk) });
    items.push({ label: 'AUDION', value: audionOk ? 'OK' : 'Fehler', tone: probeTone(audionOk) });
  }

  const persona = outcomes.find((o) => o.stepId === 'persona_bootstrap');
  if (persona) {
    items.push({
      label: 'Persona',
      value: persona.status === 'done' ? 'Bereit' : persona.status === 'skipped' ? '—' : 'Fehler',
      tone: persona.status === 'done' ? 'success' : persona.status === 'error' ? 'error' : 'neutral',
    });
  }

  return items;
}

function stepRow(o: LaunchReadinessStepOutcome): [string, string, string] {
  const status = o.status === 'done' ? '✓' : o.status === 'skipped' ? '—' : '✗';
  let detail = '—';
  if (o.status === 'skipped') detail = o.skipReason ?? 'Übersprungen';
  else if (o.status === 'error') detail = o.error ?? 'Fehler';
  else if (o.payload?.kind === 'pagespeed_check') {
    detail = `Perf ${o.payload.data.performance}, A11y ${o.payload.data.accessibility}`;
  } else if (o.payload?.kind === 'quick_scan') {
    detail = `Score ${o.payload.data.score}/100`;
  } else if (o.payload?.kind === 'ssl_check') {
    detail = `Grade ${o.payload.data.grade ?? '—'}`;
  } else if (o.data?.platformProjectId) {
    detail = String(o.data.platformProjectId);
  }
  return [o.label, status, detail];
}

export function buildLaunchReadinessLayout(result: LaunchReadinessResult): UiLayout {
  const blocks: UiLayout['blocks'] = [];
  const metrics = buildReadinessMetrics(result.outcomes);

  const intro = createUiBlock(
    'text',
    {
      markdown: `## ${result.playbookLabel}\n\n**${result.projectName}** · ${result.url}${
        result.platformProjectId ? `\n\nPlattform-Projekt: \`${result.platformProjectId}\`` : ''
      }`,
    },
    randomUUID()
  );
  if (intro.ok) blocks.push(intro.block);

  if (metrics.length > 0) {
    const grid = createUiBlock(
      'metric_grid',
      { title: 'Launch-Ampel', items: metrics.slice(0, 8) },
      randomUUID()
    );
    if (grid.ok) blocks.push(grid.block);
  }

  const table = createUiBlock(
    'data_table',
    {
      title: 'Onboarding-Schritte',
      columns: ['Schritt', 'Status', 'Ergebnis'],
      rows: result.outcomes.map(stepRow),
    },
    randomUUID()
  );
  if (table.ok) blocks.push(table.block);

  if (result.summaryText) {
    const summary = createUiBlock(
      'collapsible',
      { title: 'Projekt-Zusammenfassung', markdown: result.summaryText, defaultOpen: false },
      randomUUID()
    );
    if (summary.ok) blocks.push(summary.block);
  }

  const links: Array<{ label: string; href: string; external?: boolean }> = [];
  if (result.platformProjectId) {
    links.push({
      label: 'PLEXON Dashboard',
      href: result.dashboardPath ?? pathPlatformProjectDashboard(result.platformProjectId),
    });
  }
  if (links.length > 0) {
    const linkBlock = createUiBlock('link_list', { title: 'Links', links }, randomUUID());
    if (linkBlock.ok) blocks.push(linkBlock.block);
  }

  const errors = result.outcomes.filter((o) => o.status === 'error');
  if (errors.length > 0) {
    const alert = createUiBlock(
      'alert',
      {
        tone: 'warning',
        title: 'Einige Schritte sind fehlgeschlagen',
        message: errors.map((o) => `${o.label}: ${o.error ?? 'Fehler'}`).join(' · '),
      },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
