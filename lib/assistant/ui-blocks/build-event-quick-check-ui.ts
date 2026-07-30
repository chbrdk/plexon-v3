import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { EventQuickCheckResult, EventQuickCheckStepOutcome } from '@/lib/assistant/playbooks/run-event-quick-check';
import { buildEventQuickCheckDetailBlocks } from '@/lib/assistant/ui-blocks/build-event-quick-check-detail-blocks';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import { pathPlatformProjectDashboard } from '@/lib/constants';

type UiTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

function scoreTone(value: number): UiTone {
  if (value >= 80) return 'success';
  if (value >= 60) return 'warning';
  return 'error';
}

function buildQuickCheckMetrics(result: EventQuickCheckResult): Array<{
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

  if (result.domainScan?.totalPages != null) {
    items.push({
      label: 'Seiten gescannt',
      value: result.domainScan.totalPages,
      tone: 'neutral',
    });
  }
  if (result.domainScan?.score != null) {
    items.push({
      label: 'Domain-Score',
      value: result.domainScan.score,
      unit: '/100',
      tone: scoreTone(result.domainScan.score),
    });
  }

  if (result.personaPreview?.persona) {
    items.push({
      label: 'Persona',
      value: result.personaPreview.persona.name,
      tone: 'success',
      hint: result.personaPreview.persona.segment,
    });
  }

  if (result.geoJob?.overallScore != null) {
    items.push({
      label: 'GEO Score',
      value: result.geoJob.overallScore,
      unit: '/100',
      tone: scoreTone(result.geoJob.overallScore),
    });
  }

  if (result.geoQuestions?.length) {
    items.push({
      label: 'GEO-Fragen',
      value: result.geoQuestions.length,
      tone: 'neutral',
    });
  }

  return items;
}

function stepRow(o: EventQuickCheckStepOutcome): [string, string, string] {
  const status = o.status === 'done' ? '✓' : o.status === 'skipped' ? '—' : '✗';
  let detail = '—';
  if (o.status === 'skipped') detail = o.skipReason ?? 'Übersprungen';
  else if (o.status === 'error') detail = o.error ?? 'Fehler';
  else if (o.stepId === 'geo_questions' && o.data?.questions) {
    detail = (o.data.questions as string[]).join(' · ').slice(0, 80);
  } else if (o.stepId === 'geo_check' && o.data?.job) {
    const job = o.data.job as { overallScore?: number | null };
    detail = job.overallScore != null ? `Score ${job.overallScore}` : 'OK';
  } else if (o.stepId === 'domain_scan' && o.data?.scanId) {
    detail = String(o.data.scanId);
  } else if (o.stepId === 'ensure_audion' && o.data?.audionProjectId) {
    detail = String(o.data.audionProjectId);
  } else if (o.data?.platformProjectId) {
    detail = String(o.data.platformProjectId);
  }
  return [o.label, status, detail];
}

/** @deprecated Use buildEventQuickCheckReportLayoutFromQuick — legacy multi-block layout. */
export function buildEventQuickCheckLayout(result: EventQuickCheckResult): UiLayout {
  const blocks: UiLayout['blocks'] = [];
  const metrics = buildQuickCheckMetrics(result);

  const intro = createUiBlock(
    'text',
    {
      markdown: `## ${result.playbookLabel}\n\n**${result.projectName}** · ${result.url}${
        result.platformProjectId ? `\n\nPlattform-Projekt: \`${result.platformProjectId}\`` : ''
      }\n\nSchnellcheck: Research, 50-Seiten-Scan, AUDION-Persona und GEO Competitive.${
        result.checkionOnly
          ? '\n\n_CHECKION-Teilcheck: Scan & GEO ohne AUDION-Persona (kein Projekt nötig für GEO)._'
          : ''
      }`,
    },
    randomUUID()
  );
  if (intro.ok) blocks.push(intro.block);

  if (metrics.length > 0) {
    const grid = createUiBlock(
      'metric_grid',
      { title: 'Quick-Check Ampel', items: metrics.slice(0, 8) },
      randomUUID()
    );
    if (grid.ok) blocks.push(grid.block);
  }

  blocks.push(...buildEventQuickCheckDetailBlocks(result));

  if (result.geoQuestions?.length) {
    const geoList = createUiBlock(
      'recommendation_list',
      {
        title: 'GEO-Fragen (Persona-bezogen)',
        items: result.geoQuestions.map((q, i) => ({ title: `${i + 1}. ${q}` })),
      },
      randomUUID()
    );
    if (geoList.ok) blocks.push(geoList.block);
  }

  const table = createUiBlock(
    'data_table',
    {
      title: 'Quick-Check Schritte',
      columns: ['Schritt', 'Status', 'Ergebnis'],
      rows: result.outcomes.map(stepRow),
    },
    randomUUID()
  );
  if (table.ok) blocks.push(table.block);

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
  if (result.audionSetupRequired && !result.personaPreview?.persona) {
    const audionAlert = createUiBlock(
      'alert',
      {
        tone: result.checkionOnly ? 'warning' : 'error',
        title: 'AUDION-Persona nicht verfügbar',
        message: result.checkionOnly
          ? 'Scan und GEO sind fertig. Für die Persona prüfe AUDION_API_TOKEN und AUDION_API_URL auf PLEXON, oder synchronisiere AUDION im Plattform-Dashboard.'
          : 'Persona konnte nicht erstellt werden. Prüfe AUDION_API_TOKEN und AUDION_API_URL — oder synchronisiere AUDION im Plattform-Dashboard und starte den Quick Check erneut.',
      },
      randomUUID()
    );
    if (audionAlert.ok) blocks.push(audionAlert.block);
  } else if (errors.length > 0) {
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
