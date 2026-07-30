import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import type { CrossBenchmarks, WorkflowInsightNarrative } from '@/lib/assistant/insights/types';
import type { PageSpeedPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';

function scoreTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 85) return 'success';
  if (score >= 65) return 'warning';
  return 'error';
}

export function appendCrossBenchmarkBlocks(layout: UiLayout, benchmarks: CrossBenchmarks): UiLayout {
  const blocks = [...layout.blocks];
  const psi: PageSpeedPreview | undefined = benchmarks.pageSpeed;
  if (!psi) return layout;

  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'Quervergleich — PageSpeed (ergänzend)',
      items: [
        { label: 'Performance', value: psi.performance, unit: '/100', tone: scoreTone(psi.performance) },
        { label: 'Accessibility', value: psi.accessibility, unit: '/100', tone: scoreTone(psi.accessibility) },
        { label: 'SEO (Lighthouse)', value: psi.seo, unit: '/100', tone: scoreTone(psi.seo) },
        { label: 'Best Practices', value: psi.bestPractices, unit: '/100', tone: scoreTone(psi.bestPractices) },
      ],
    },
    `cross-psi-${randomUUID()}`
  );
  if (metrics.ok) blocks.push(metrics.block);

  const chart = createUiBlock(
    'chart',
    {
      title: 'PageSpeed im Vergleich',
      chartType: 'bar',
      labels: ['Performance', 'A11y', 'SEO', 'Best Practices'],
      datasets: [
        {
          label: 'Score',
          values: [psi.performance, psi.accessibility, psi.seo, psi.bestPractices],
        },
      ],
    },
    `cross-psi-chart-${randomUUID()}`
  );
  if (chart.ok) blocks.push(chart.block);

  return { version: UI_LAYOUT_VERSION, blocks };
}

export function appendInsightBlocksToLayout(
  layout: UiLayout,
  narrative: WorkflowInsightNarrative
): UiLayout {
  const blocks = [...layout.blocks];

  const divider = createUiBlock(
    'text',
    { markdown: '---\n\n## Einschätzung & Quervergleich\n\n_Automatische Analysten-Synthese auf Basis der Messdaten und Projektkontext._' },
    `insight-intro-${randomUUID()}`
  );
  if (divider.ok) blocks.push(divider.block);

  if (narrative.assessment.trim()) {
    const assessment = createUiBlock(
      'alert',
      {
        title: 'Bewertung',
        message: narrative.assessment,
        tone: 'info',
      },
      `insight-assessment-${randomUUID()}`
    );
    if (assessment.ok) blocks.push(assessment.block);
  }

  if (narrative.highlights?.length) {
    const highlights = createUiBlock(
      'metric_grid',
      {
        title: 'Kernaussagen',
        items: narrative.highlights.slice(0, 8).map((h) => ({
          label: h.label,
          value: h.value,
          unit: h.unit,
          tone: h.tone,
        })),
      },
      `insight-highlights-${randomUUID()}`
    );
    if (highlights.ok) blocks.push(highlights.block);
  }

  const comparisons = narrative.crossComparisons ?? [];
  if (comparisons.length > 0) {
    const cross = createUiBlock(
      'finding_list',
      {
        title: 'Quervergleiche',
        items: comparisons.map((text, i) => ({
          title: `Vergleich ${i + 1}`,
          description: text,
          severity: 'info' as const,
        })),
      },
      `insight-cross-${randomUUID()}`
    );
    if (cross.ok) blocks.push(cross.block);
  }

  if (narrative.findings.length > 0) {
    const findings = createUiBlock(
      'finding_list',
      {
        title: 'Erkenntnisse',
        items: narrative.findings.slice(0, 8).map((f) => ({
          title: f.title,
          description: f.description,
          severity: f.severity ?? 'info',
        })),
      },
      `insight-findings-${randomUUID()}`
    );
    if (findings.ok) blocks.push(findings.block);
  }

  if (narrative.recommendations.length > 0) {
    const recs = createUiBlock(
      'recommendation_list',
      {
        title: 'Empfohlene nächste Schritte',
        items: narrative.recommendations.slice(0, 8).map((r) => ({
          title: r.title,
          description: r.description ?? '',
          priority: r.priority,
          category: r.category,
        })),
      },
      `insight-recs-${randomUUID()}`
    );
    if (recs.ok) blocks.push(recs.block);
  }

  if (narrative.fazit.trim()) {
    const fazit = createUiBlock(
      'alert',
      {
        title: 'Fazit',
        message: narrative.fazit,
        tone: narrative.fazitTone ?? 'success',
      },
      `insight-fazit-${randomUUID()}`
    );
    if (fazit.ok) blocks.push(fazit.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
