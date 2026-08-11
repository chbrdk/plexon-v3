import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  mapValidateToOutlineBlocks,
  runJourneyOutline,
} from '@/lib/integrations/audion-journey-outline-client';

vi.mock('@/lib/platform-project-dashboard-fetch', () => ({
  fetchAudionPlatformProjectSummary: vi.fn(),
}));

vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants')>();
  return {
    ...actual,
    getAudionServiceToken: () => 'test-token',
    getAudionWebOrigin: () => 'https://audion-v3.test',
  };
});

vi.mock('@/lib/paths/audion-api', () => ({
  audionPlatformJourneyById: (id: string) => `https://audion-v3.test/api/journeys/${id}`,
  audionPlatformJourneyValidate: (id: string) =>
    `https://audion-v3.test/api/ai/journeys/${id}/validate`,
}));

import { fetchAudionPlatformProjectSummary } from '@/lib/platform-project-dashboard-fetch';

describe('mapValidateToOutlineBlocks', () => {
  it('maps friction quotes, findings, and recommendations', () => {
    const mapped = mapValidateToOutlineBlocks({
      overallFitScore: 72,
      phases: [
        {
          phaseId: 'ph1',
          phaseName: 'Awareness',
          status: 'warning',
          frictionPoints: [
            {
              description: 'Weak CTA',
              severity: 'medium',
              personaQuote: 'Where do I click?',
            },
          ],
          recommendations: ['Clarify primary CTA'],
        },
      ],
    });
    expect(mapped.overallFitScore).toBe(72);
    expect(mapped.quotes).toHaveLength(1);
    expect(mapped.quotes[0].quote).toBe('Where do I click?');
    expect(mapped.findings[0].title).toBe('Awareness');
    expect(mapped.recommendations[0].title).toBe('Clarify primary CTA');
  });
});

describe('runJourneyOutline', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(fetchAudionPlatformProjectSummary).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fails without project when journeyId missing', async () => {
    const result = await runJourneyOutline({ plexonUserId: 'u1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Projekt|Journey-ID/i);
  });

  it('resolves catalog journey and builds outline without validate', async () => {
    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue({
      externalProjectId: 'aud-1',
      personaCount: 1,
      targetGroupCount: 1,
      journeyCount: 1,
      studyCount: 0,
      targetGroups: [],
      personas: [{ id: 'p1', name: 'Alex', role: 'Buyer', status: 'ready', targetGroupId: null }],
      journeys: [
        {
          id: 'journey-checkout',
          name: 'Checkout Journey',
          status: 'active',
          journeyType: 'journey',
          phaseCount: 1,
        },
      ],
      studies: [],
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          id: 'journey-checkout',
          name: 'Checkout Journey',
          phases: [
            {
              id: 'ph1',
              name: 'Cart',
              order: 1,
              summary: 'Review',
              elements: [{ id: 'e1', kind: 'pain', label: 'Fees surprise' }],
            },
          ],
        }),
    });

    const result = await runJourneyOutline({
      plexonUserId: 'u1',
      platformProjectId: 'pp-1',
      journeyName: 'Checkout',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.journeyId).toBe('journey-checkout');
    expect(result.preview.phases[0].elements?.[0].kind).toBe('pain');
    expect(result.preview.journeyHref).toContain('/journeys/journey-checkout');
    expect(result.preview.validateRan).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('runs validate when requested and maps blocks', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: 'journey-x',
            name: 'X',
            phases: [{ id: 'ph1', name: 'Start', order: 1, elements: [] }],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            overallFitScore: 55,
            phases: [
              {
                phaseName: 'Start',
                frictionPoints: [
                  { description: 'Empty', severity: 'high', personaQuote: 'Nothing here' },
                ],
                recommendations: ['Add moments'],
              },
            ],
          }),
      });

    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue({
      externalProjectId: 'aud-1',
      personaCount: 1,
      targetGroupCount: 0,
      journeyCount: 0,
      studyCount: 0,
      targetGroups: [],
      personas: [{ id: 'p1', name: 'Alex', role: 'Buyer', status: 'ready', targetGroupId: null }],
      journeys: [],
      studies: [],
    });

    const result = await runJourneyOutline({
      plexonUserId: 'u1',
      platformProjectId: 'pp-1',
      journeyId: 'journey-x',
      validate: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.validateRan).toBe(true);
    expect(result.preview.quotes?.[0].quote).toBe('Nothing here');
    expect(result.preview.findings?.[0].severity).toBe('error');
    expect(result.preview.recommendations?.[0].title).toBe('Add moments');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
