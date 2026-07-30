import { describe, expect, it } from 'vitest';
import { attachRecommendationsToMetadata } from '@/lib/assistant/insights/conversation-recommendations';
import { buildContextualRecommendations } from '@/lib/assistant/insights/conversation-recommendations-core';
import {
  buildWorkflowContinuationRecommendations,
  buildWorkflowFollowUps,
} from '@/lib/assistant/insights/follow-up-suggestions';

describe('conversation recommendations', () => {
  it('always suggests SEO and related checks after GEO', () => {
    const cont = buildWorkflowContinuationRecommendations('geo_analysis', 'https://example.com');
    expect(cont.some((r) => r.id === 'next-pagespeed')).toBe(true);
    expect(cont.some((r) => r.label.includes('SEO'))).toBe(true);
    expect(cont.some((r) => r.id === 'next-quick-scan')).toBe(true);
    expect(cont.some((r) => r.prompt.includes('ohne GEO'))).toBe(true);
  });

  it('merges workflow and contextual recommendations on every message', () => {
    const meta = attachRecommendationsToMetadata(
      {
        workflowType: 'geo_analysis',
        uiLayout: {
          version: 1,
          blocks: [
            {
              id: 'kv',
              type: 'key_value_list',
              props: { items: [{ label: 'URL', value: 'https://acme.com' }] },
            },
          ],
        },
        followUpPrompts: [],
      },
      {
        intent: { type: 'geo_analysis' },
        prompt: 'GEO Analyse https://acme.com',
        history: [{ role: 'user', content: 'GEO Analyse https://acme.com' }],
      }
    );
    const recs = meta?.followUpPrompts as Array<{ id: string }>;
    expect(recs?.length).toBeGreaterThanOrEqual(2);
    expect(recs?.some((r) => r.id === 'next-pagespeed')).toBe(true);
  });

  it('adds recommendations to free chat when URL known', () => {
    const recs = buildContextualRecommendations({
      prompt: 'Was bedeutet das für uns?',
      history: [{ role: 'user', content: 'GEO Analyse https://shop.example.com' }],
      url: 'https://shop.example.com',
    });
    expect(recs.some((r) => r.id === 'ctx-pagespeed')).toBe(true);
    expect(recs.some((r) => r.id === 'ctx-geo')).toBe(false);
  });

  it('adds gap audit when geo weak', () => {
    const followUps = buildWorkflowFollowUps({
      workflowType: 'geo_analysis',
      url: 'https://example.com',
      crossSignals: [
        {
          id: 'geo-vs-market',
          category: 'Wettbewerb',
          severity: 'error',
          title: 'Gap',
          fact: 'Behind market',
        },
      ],
    });
    expect(followUps.length).toBeGreaterThanOrEqual(3);
    expect(followUps.some((r) => r.id === 'next-pagespeed')).toBe(true);
  });
});
