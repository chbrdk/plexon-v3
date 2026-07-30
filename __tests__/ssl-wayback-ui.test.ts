import { describe, expect, it } from 'vitest';
import { buildSslCheckLayout } from '@/lib/assistant/ui-blocks/build-ssl-ui';
import { buildWaybackCheckLayout } from '@/lib/assistant/ui-blocks/build-wayback-ui';

describe('ssl/wayback ui builders', () => {
  it('builds ssl layout with grade metric', () => {
    const layout = buildSslCheckLayout({
      host: 'example.com',
      grade: 'A+',
      status: 'READY',
    });
    expect(layout.blocks.some((b) => b.type === 'metric_grid')).toBe(true);
  });

  it('builds wayback layout with archive link when available', () => {
    const layout = buildWaybackCheckLayout({
      url: 'https://example.com',
      available: true,
      firstSnapshotUrl: 'https://web.archive.org/web/2020/example.com',
      firstSnapshotTimestamp: '20200615120000',
    });
    expect(layout.blocks.some((b) => b.type === 'link_list')).toBe(true);
  });
});
