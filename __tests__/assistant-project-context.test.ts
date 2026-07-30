import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/platform-projects', () => ({
  getPlatformProjectById: vi.fn(),
}));

vi.mock('@/lib/constants', () => ({
  getCheckionServiceToken: vi.fn(() => 'checkion-token'),
  getAudionServiceToken: vi.fn(() => 'audion-token'),
  getCheckionServiceApiUrl: vi.fn(() => 'https://checkion.test'),
  getAudionServiceApiUrl: vi.fn(() => 'https://audion.test'),
}));

import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { buildCompactProjectContextBlock } from '@/lib/assistant/project-context';

describe('buildCompactProjectContextBlock', () => {
  beforeEach(() => {
    vi.mocked(getPlatformProjectById).mockResolvedValue({
      id: 'pp-1',
      name: 'Haftpflichtkasse',
      domain: 'haftpflichtkasse.de',
      companyId: 'c-1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof getPlatformProjectById>>);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/api/projects/')) {
          return new Response(
            JSON.stringify({
              data: {
                name: 'Haftpflichtkasse',
                domain: 'haftpflichtkasse.de',
                industry: 'Versicherung',
                researchSnapshot: {
                  targetGroups: ['Privatkunden', 'Gewerbekunden'],
                  competitors: ['Allianz', 'HUK'],
                },
              },
            }),
            { status: 200 }
          );
        }
        if (url.includes('/target-groups?')) {
          return new Response(
            JSON.stringify({
              items: [{ id: 'tg-1', name: 'Versicherte', segment: 'B2C' }],
            }),
            { status: 200 }
          );
        }
        if (url.includes('/knowledge')) {
          return new Response(
            JSON.stringify([
              { title: 'Haftpflicht Basics', content: 'Kurzinfo zur Haftpflichtversicherung.' },
            ]),
            { status: 200 }
          );
        }
        return new Response('not found', { status: 404 });
      })
    );
  });

  it('includes checkion research and audion knowledge snippets', async () => {
    const block = await buildCompactProjectContextBlock('pp-1', 'user-1', {
      checkionProjectId: 'chk-1',
      audionProjectId: 'aud-1',
    });
    expect(block).toContain('Haftpflichtkasse');
    expect(block).toContain('Research-Zielgruppen');
    expect(block).toContain('Haftpflicht Basics');
    expect(block).toContain('Versicherte');
  });
});
