import { describe, expect, it } from 'vitest';
import { parseUiBlockProps } from '@/lib/assistant/ui-blocks/validate';
import { buildProjectSummaryLinks } from '@/lib/assistant/ui-blocks/product-links';
import { buildUiPanelHintForPlan } from '@/lib/assistant/ui-tools/catalog-for-prompt';

describe('assistant ui phase 4', () => {
  it('validates chart block with matching dataset lengths', () => {
    const ok = parseUiBlockProps('chart', {
      chartType: 'bar',
      labels: ['A', 'B'],
      datasets: [{ label: 'Score', values: [90, 85] }],
    });
    expect(ok.ok).toBe(true);

    const bad = parseUiBlockProps('chart', {
      labels: ['A', 'B'],
      datasets: [{ label: 'Score', values: [90] }],
    });
    expect(bad.ok).toBe(false);
  });

  it('builds central product links', () => {
    const links = buildProjectSummaryLinks({
      platformProjectId: 'pp-1',
      platformCompanyId: 'co-1',
      hasCheckion: true,
      hasAudion: true,
    });
    expect(links.length).toBe(3);
    expect(links[2].href).toBe('/projects/pp-1');
  });

  it('suggests panel hint for persona intent', () => {
    expect(buildUiPanelHintForPlan('audion_persona')).toContain('plexon_ui_set_panel');
    expect(buildUiPanelHintForPlan('general_chat')).toBe('');
  });
});
