import { describe, expect, it, vi, afterEach } from 'vitest';
import { extractHomepageSignals } from '@/lib/assistant/event-quick-check/extract-homepage-signals';
import {
  applyCompanyBriefEdits,
  researchCompanyBrief,
} from '@/lib/assistant/event-quick-check/research-company-brief';

describe('extractHomepageSignals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses title, meta and h1 from HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () =>
          `<html><head><title>Schreiner Group | Engineering</title>
          <meta name="description" content="Global engineering leader">
          <meta property="og:title" content="Schreiner Group">
          </head><body><h1>We design high-tech facilities</h1></body></html>`,
      })
    );

    const signals = await extractHomepageSignals('https://www.schreiner-group.com');
    expect(signals.pageTitle).toContain('Schreiner Group');
    expect(signals.metaDescription).toContain('engineering');
    expect(signals.h1[0]).toContain('facilities');
  });
});

describe('researchCompanyBrief', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('builds fallback brief without LLM', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () =>
          `<html><head><title>Schreiner Group</title>
          <meta name="description" content="Engineering services worldwide"></head>
          <body><h1>Engineering</h1></body></html>`,
      })
    );

    const brief = await researchCompanyBrief({
      url: 'https://www.schreiner-group.com',
      projectName: 'Schreiner Group',
    });

    expect(brief.displayName).toContain('Schreiner');
    expect(brief.summary).toContain('Engineering');
    expect(brief.disambiguationNote.length).toBeGreaterThan(10);
    expect(brief.companyContext).toContain('Schreiner Group');
  });

  it('applyCompanyBriefEdits updates companyContext', () => {
    const base = {
      displayName: 'A',
      industry: 'B',
      summary: 'C',
      targetAudienceHint: 'D',
      disambiguationNote: 'E',
      companyContext: 'old',
      sources: { url: 'https://a.de', domain: 'a.de', h1: [] },
      generatedAt: new Date().toISOString(),
    };
    const next = applyCompanyBriefEdits(base, { summary: 'Neue Summary' });
    expect(next.summary).toBe('Neue Summary');
    expect(next.companyContext).toContain('Neue Summary');
  });
});
