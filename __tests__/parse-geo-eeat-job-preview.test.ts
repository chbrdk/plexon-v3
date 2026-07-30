import { describe, expect, it } from 'vitest';
import { parseGeoEeatJobPreview } from '@/lib/integrations/parse-geo-eeat-job-preview';

describe('parseGeoEeatJobPreview', () => {
  it('derives scores and competitors from nested CHECKION payload', () => {
    const job = parseGeoEeatJobPreview(
      {
        jobId: 'geo-1',
        url: 'https://msq.com',
        status: 'complete',
        payload: {
          pages: [
            {
              url: 'https://msq.com',
              geoFitnessScore: 68,
              eeatScores: {
                trust: { score: 3, reasoning: 'Solid imprint' },
                expertise: { score: 4, reasoning: 'Technical depth' },
              },
            },
          ],
          recommendations: [
            { title: 'Add case studies', description: 'Strengthen E-E-A-T', priority: 1 },
          ],
          competitiveByModel: {
            default: {
              queries: ['best semiconductor vendor'],
              competitors: ['rival.com'],
              metrics: [
                { domain: 'msq.com', shareOfVoice: 0.42, avgPosition: 2.1, mentionCount: 5 },
                { domain: 'rival.com', shareOfVoice: 0.31, avgPosition: 3.4, mentionCount: 3 },
              ],
              runs: [
                {
                  query: 'best semiconductor vendor',
                  citations: [{ domain: 'msq.com', position: 2 }],
                },
              ],
            },
          },
        },
      },
      'geo-1'
    );

    expect(job.overallScore).toBe(42);
    expect(job.geoFitnessScore).toBe(68);
    expect(job.eeatScores?.trust?.score).toBe(3);
    expect(job.competitors?.length).toBeGreaterThanOrEqual(1);
    expect(job.queries).toContain('best semiconductor vendor');
    expect(job.recommendations?.[0]?.title).toBe('Add case studies');
    expect(job.citationHighlights?.[0]?.position).toBe(2);
  });

  it('exposes per-model citation slices from competitiveByModel', () => {
    const job = parseGeoEeatJobPreview(
      {
        jobId: 'geo-2',
        url: 'https://wera.de',
        status: 'complete',
        payload: {
          competitiveByModel: {
            'gpt-5.4': {
              runs: [
                {
                  query: 'best tools (Wera)',
                  answerText: 'Wera und Gedore sind die besten Marken.',
                  rawAnswerExcerpt: '{"answer":"Wera und Gedore sind die besten Marken.","citations":[{"domain":"wera.de","position":1}]}',
                  citations: [
                    { domain: 'wera.de', position: 1 },
                    { domain: 'competitor.de', position: 2 },
                  ],
                },
              ],
            },
            'claude-sonnet': {
              runs: [
                {
                  query: 'best tools (Wera)',
                  citations: [{ domain: 'wera.de', position: 3 }],
                },
              ],
            },
          },
        },
      },
      'geo-2'
    );

    expect(job.citationHighlightsByModel?.length).toBe(2);
    const gpt = job.citationHighlightsByModel?.find((s) => s.modelId === 'gpt-5.4');
    const claude = job.citationHighlightsByModel?.find((s) => s.modelId === 'claude-sonnet');
    expect(gpt?.citations[0]?.position).toBe(1);
    expect(gpt?.runs?.[0]?.citations).toHaveLength(2);
    expect(gpt?.runs?.[0]?.answerText).toContain('Wera');
    expect(gpt?.runs?.[0]?.rawAnswerExcerpt).toContain('wera.de');
    expect(claude?.citations[0]?.position).toBe(3);
    expect(job.citationHighlights?.[0]?.position).toBe(3);
  });

  it('keeps top-level overallScore when present', () => {
    const job = parseGeoEeatJobPreview(
      { jobId: 'g2', url: 'https://a.com', status: 'complete', overallScore: 77 },
      'g2'
    );
    expect(job.overallScore).toBe(77);
  });
});
