import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import type { UiBlock, UiStepStatus } from '@/lib/assistant/ui-blocks/types';
import { reportPdfStyles as s, reportPdfToneColors } from '@/lib/assistant/reports/pdf/report-pdf-styles';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { renderEventQuickCheckReportPdf } from '@/lib/assistant/reports/pdf/event-quick-check-report-pdf';


function blockTitle(props: Record<string, unknown>): string | null {
  return typeof props.title === 'string' && props.title.trim() ? props.title.trim() : null;
}

function colWidthPercent(columnCount: number): string {
  return `${100 / Math.max(columnCount, 1)}%`;
}

function stepStatusSymbol(status: UiStepStatus): string {
  switch (status) {
    case 'done':
      return '✓';
    case 'error':
      return '✗';
    case 'running':
      return '▶';
    default:
      return '○';
  }
}

function alertBorderColor(tone: unknown): string {
  return reportPdfToneColors[String(tone)] ?? reportPdfToneColors.info;
}

function PdfDataTableView({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number | null>>;
}) {
  const width = colWidthPercent(columns.length);
  return (
    <View style={s.table}>
      <View style={s.tableHeaderRow}>
        {columns.map((col, i) => (
          <Text key={`h-${i}`} style={[s.tableHeaderCell, { width }]}>
            {col}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={`r-${ri}`} style={s.tableRow}>
          {columns.map((_, ci) => (
            <Text key={`c-${ri}-${ci}`} style={[s.tableCell, { width }]}>
              {row[ci] ?? '—'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function PdfStatGridView({
  items,
}: {
  items: Array<{ label: string; value: string | number; unit?: string }>;
}) {
  return (
    <View style={s.statGrid}>
      {items.map((item, i) => (
        <View key={i} style={s.statTile}>
          <Text style={s.statTileLabel}>{item.label}</Text>
          <Text style={s.statTileValue}>
            {item.value}
            {item.unit ? ` ${item.unit}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PdfListBlock({
  title,
  items,
  defaultTitle,
}: {
  title: string | null;
  defaultTitle: string;
  items: Array<{ title: string; description?: string; priority?: number; category?: string }>;
}) {
  return (
    <View style={s.blockWrap}>
      <Text style={s.sectionTitle}>{title ?? defaultTitle}</Text>
      {items.map((item, i) => (
        <View key={i}>
          <Text style={s.rowTitle}>
            {item.priority != null ? `[P${item.priority}] ` : ''}
            {item.title}
            {item.category ? ` · ${item.category}` : ''}
          </Text>
          {item.description ? <Text style={s.rowDesc}>{item.description}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Map assistant UiBlock types to structured @react-pdf output for print/PDF export. */
export function renderUiBlockPdf(block: UiBlock): React.ReactNode {
  const p = block.props;

  switch (block.type) {
    case 'text':
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          <Text style={s.body}>{String(p.markdown ?? '')}</Text>
        </View>
      );

    case 'alert':
      return (
        <View
          key={block.id}
          style={{ ...s.card, borderLeftWidth: 3, borderLeftColor: alertBorderColor(p.tone) }}
          wrap={false}
        >
          {blockTitle(p) ? <Text style={s.rowTitle}>{blockTitle(p)}</Text> : null}
          <Text style={s.body}>{String(p.message ?? '')}</Text>
        </View>
      );

    case 'metric_grid': {
      const items = (p.items as Array<{ label: string; value: string | number; unit?: string }>) ?? [];
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          <PdfStatGridView items={items} />
        </View>
      );
    }

    case 'data_table': {
      const columns = (p.columns as string[]) ?? [];
      const rows = (p.rows as Array<Array<string | number | null>>) ?? [];
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          <PdfDataTableView columns={columns} rows={rows.slice(0, 50)} />
        </View>
      );
    }

    case 'key_value_list': {
      const items = (p.items as Array<{ label: string; value: string | number }>) ?? [];
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          {items.map((item, i) => (
            <View key={i} style={s.metricRow}>
              <Text>{item.label}</Text>
              <Text>{String(item.value)}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'finding_list': {
      const items = (p.items as Array<{ title: string; description?: string; severity?: string }>) ?? [];
      return (
        <PdfListBlock
          key={block.id}
          title={blockTitle(p)}
          defaultTitle="Erkenntnisse"
          items={items.map((item) => ({
            title: item.severity ? `[${item.severity}] ${item.title}` : item.title,
            description: item.description,
          }))}
        />
      );
    }

    case 'recommendation_list': {
      const items =
        (p.items as Array<{ title: string; description?: string; priority?: number; category?: string }>) ?? [];
      return (
        <PdfListBlock
          key={block.id}
          title={blockTitle(p)}
          defaultTitle="Handlungsempfehlungen"
          items={items}
        />
      );
    }

    case 'link_list': {
      const links = (p.links as Array<{ label: string; href: string }>) ?? [];
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          {links.map((link, i) => (
            <View key={i} style={s.linkRow}>
              <Text style={s.linkLabel}>{link.label}</Text>
              <Text style={s.linkHref}>{link.href}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'persona_card': {
      const personas =
        (p.personas as Array<{
          name: string;
          segment: string;
          headline: string;
          confidence?: number;
        }>) ?? [];
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          {personas.map((persona, i) => (
            <View key={i} style={s.entityCard}>
              <Text style={s.rowTitle}>{persona.name}</Text>
              <Text style={s.badge}>
                {persona.segment}
                {persona.confidence != null ? ` · ${Math.round(persona.confidence * 100)}%` : ''}
              </Text>
              <Text style={s.body}>{persona.headline}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'target_group_card': {
      const groups =
        (p.targetGroups as Array<{
          name: string;
          segment: string;
          description?: string;
          personaCount?: number;
          knowledgeEntryCount?: number;
        }>) ?? [];
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          {groups.map((group, i) => (
            <View key={i} style={s.entityCard}>
              <Text style={s.rowTitle}>{group.name}</Text>
              <Text style={s.badge}>{group.segment}</Text>
              {group.description ? <Text style={s.body}>{group.description}</Text> : null}
              <Text style={s.meta}>
                Personas: {group.personaCount ?? 0} · Wissenseinträge: {group.knowledgeEntryCount ?? 0}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    case 'summary_card': {
      const links = (p.links as Array<{ label: string; href: string }>) ?? [];
      return (
        <View key={block.id} style={[s.card, s.cardAccent]} wrap={false}>
          <Text style={s.sectionTitle}>{String(p.title ?? 'Zusammenfassung')}</Text>
          <PdfStatGridView
            items={[
              {
                label: 'CHECKION Scans',
                value:
                  typeof p.checkionScanCount === 'number' || typeof p.checkionScanCount === 'string'
                    ? p.checkionScanCount
                    : '—',
              },
              {
                label: 'AUDION Personas',
                value:
                  typeof p.audionPersonaCount === 'number' || typeof p.audionPersonaCount === 'string'
                    ? p.audionPersonaCount
                    : '—',
              },
            ]}
          />
          {links.map((link, i) => (
            <View key={i} style={s.linkRow}>
              <Text style={s.linkLabel}>{link.label}</Text>
              <Text style={s.linkHref}>{link.href}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'step_list': {
      const steps =
        (p.steps as Array<{
          label: string;
          status: UiStepStatus;
          detail?: string;
          progress?: number;
        }>) ?? [];
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          {steps.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <Text style={s.stepIcon}>{stepStatusSymbol(step.status)}</Text>
              <View>
                <Text style={s.rowTitle}>{step.label}</Text>
                <Text style={s.meta}>
                  {[step.detail, step.status === 'running' && step.progress != null ? `${step.progress}%` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    case 'corner_tab_section':
      return (
        <View key={block.id} style={s.card} wrap={false}>
          <Text style={s.badge}>{String(p.tabLabel ?? 'Abschnitt')}</Text>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          <Text style={s.body}>{String(p.markdown ?? '')}</Text>
        </View>
      );

    case 'collapsible':
      return (
        <View key={block.id} style={s.card} wrap={false}>
          <Text style={s.sectionTitle}>{String(p.title ?? 'Abschnitt')}</Text>
          <Text style={s.body}>{String(p.markdown ?? '')}</Text>
        </View>
      );

    case 'chart': {
      const labels = (p.labels as string[]) ?? [];
      const datasets = (p.datasets as Array<{ label: string; values: number[] }>) ?? [];
      const columns = ['Label', ...datasets.map((ds) => ds.label)];
      const rows = labels.map((label, li) => [
        label,
        ...datasets.map((ds) => ds.values[li] ?? '—'),
      ]);
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          {blockTitle(p) ? <Text style={s.sectionTitle}>{blockTitle(p)}</Text> : null}
          <Text style={s.meta}>
            {[p.chartType === 'line' ? 'Liniendiagramm' : 'Balkendiagramm', p.xAxisLabel, p.yAxisLabel]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <PdfDataTableView columns={columns} rows={rows} />
        </View>
      );
    }


    case 'event_quick_check_report': {
      const report = p.report as EventQuickCheckReportModel;
      return renderEventQuickCheckReportPdf(report);
    }

    default:
      return (
        <View key={block.id} style={s.blockWrap} wrap={false}>
          <Text style={s.sectionTitle}>{block.type}</Text>
          <Text style={s.body}>Siehe Web-Report für vollständige Darstellung.</Text>
        </View>
      );
  }
}
