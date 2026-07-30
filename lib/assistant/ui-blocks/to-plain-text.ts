import type { UiBlock, UiLayout } from '@/lib/assistant/ui-blocks/types';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';

export function blockToPlainText(block: UiBlock): string {
  const p = block.props;
  switch (block.type) {
    case 'text':
      return String(p.markdown ?? '');
    case 'metric_grid': {
      const items = (p.items as Array<{ label: string; value: string | number; unit?: string }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return (
        title +
        items.map((i) => `- ${i.label}: ${i.value}${i.unit ? ` ${i.unit}` : ''}`).join('\n')
      );
    }
    case 'data_table': {
      const cols = (p.columns as string[]) ?? [];
      const rows = (p.rows as Array<Array<string | number | null>>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return title + [cols.join(' | '), ...rows.map((r) => r.map((c) => c ?? '').join(' | '))].join('\n');
    }
    case 'key_value_list': {
      const items = (p.items as Array<{ label: string; value: string | number }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return title + items.map((i) => `${i.label}: ${i.value}`).join('\n');
    }
    case 'alert':
      return [p.title, p.message].filter(Boolean).join(': ');
    case 'link_list': {
      const links = (p.links as Array<{ label: string; href: string }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return title + links.map((l) => `- ${l.label}: ${l.href}`).join('\n');
    }
    case 'persona_card': {
      const personas =
        (p.personas as Array<{ name: string; segment: string; headline: string }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return (
        title +
        personas.map((persona) => `- ${persona.name} (${persona.segment}): ${persona.headline}`).join('\n')
      );
    }
    case 'step_list': {
      const steps = (p.steps as Array<{ label: string; status: string }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return title + steps.map((s) => `- [${s.status}] ${s.label}`).join('\n');
    }
    case 'summary_card': {
      const title = String(p.title ?? 'Projekt');
      return `${title}\nCHECKION: ${p.checkionScanCount ?? '—'} Scans\nAUDION: ${p.audionPersonaCount ?? '—'} Personas`;
    }
    case 'corner_tab_section':
      return [p.tabLabel, p.title, p.markdown].filter(Boolean).join('\n');
    case 'target_group_card': {
      const groups = (p.targetGroups as Array<{ name: string; segment: string }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return title + groups.map((g) => `- ${g.name} (${g.segment})`).join('\n');
    }
    case 'chart': {
      const labels = (p.labels as string[]) ?? [];
      const datasets = (p.datasets as Array<{ label: string; values: number[] }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return (
        title +
        datasets
          .map((ds) => `${ds.label}: ${labels.map((l, i) => `${l}=${ds.values[i]}`).join(', ')}`)
          .join('\n')
      );
    }
    case 'collapsible':
      return [p.title, p.markdown].filter(Boolean).join('\n');
    case 'finding_list': {
      const items = (p.items as Array<{ title: string; description: string }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return title + items.map((i) => `- ${i.title}: ${i.description}`).join('\n');
    }
    case 'recommendation_list': {
      const items = (p.items as Array<{ title: string; description?: string; priority?: number }>) ?? [];
      const title = p.title ? `${p.title}\n` : '';
      return (
        title +
        items
          .map((i) => `- [P${i.priority ?? '—'}] ${i.title}${i.description ? `: ${i.description}` : ''}`)
          .join('\n')
      );
    }
    case 'event_quick_check_report': {
      const report = p.report as {
        meta?: { title?: string; url?: string };
        executive?: { summary?: string; fazit?: string; kpiTiles?: Array<{ label: string; value: string | number }> };
        domain?: { score?: number; stats?: { errors?: number } };
        persona?: { name?: string };
      };
      const lines = [
        report.meta?.title ?? QUICK_CHECK_LABEL,
        report.meta?.url ?? '',
        report.executive?.summary ?? '',
        ...(report.executive?.kpiTiles ?? []).map((k) => `${k.label}: ${k.value}`),
        report.domain ? `Domain ${report.domain.score}/100, ${report.domain.stats?.errors ?? 0} Fehler` : '',
        report.persona ? `Persona: ${report.persona.name}` : '',
        report.executive?.fazit ?? '',
      ];
      return lines.filter(Boolean).join('\n');
    }
    default:
      return '';
  }
}

export function uiLayoutToPlainText(layout: UiLayout): string {
  const message = layout.blocks.map(blockToPlainText).filter(Boolean).join('\n\n');
  const panel = layout.panel?.blocks.map(blockToPlainText).filter(Boolean).join('\n\n') ?? '';
  return [message, panel].filter(Boolean).join('\n\n---\n\n');
}
