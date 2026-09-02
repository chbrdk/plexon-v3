import { describe, expect, it, vi } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import {
  pickCompletedDomainScan,
  resolvePersonaFromCatalog,
  resolvePersonaPagePlatformProjectId,
} from '@/lib/integrations/persona-page-relevance-client';
import {
  matchesVaillantGroupMafoPersonaName,
  VAILLANT_GROUP_PLATFORM_PROJECT_ID,
} from '@/lib/demo/vaillant-group-mafo';
import {
  rankCorpusPagesForPersona,
  scorePageForPersona,
} from '@/lib/assistant/persona-page-relevance/rank-corpus-pages';
import { buildPersonaPageRelevanceLayout } from '@/lib/assistant/ui-blocks/build-persona-page-relevance-ui';
import type { CheckionCorpusPageRow } from '@/lib/integrations/checkion-domain-scans-v3-client';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: vi.fn(),
}));
vi.mock('@/lib/list-accessible-collections', () => ({
  listAccessibleCollectionsForUser: vi.fn().mockResolvedValue({
    items: [],
    totalAccessible: 0,
    truncated: false,
  }),
}));

describe('persona page relevance intent', () => {
  it('routes persona + seiten questions', () => {
    const intent = routeAssistantIntent(
      'Welche Seiten auf vaillant.de sind für Sandra besonders relevant — mit CHECKION Metriken?',
    );
    expect(intent.type).toBe('persona_page_relevance');
    if (intent.type === 'persona_page_relevance') {
      expect(intent.personaName).toBe('Sandra');
      expect(intent.urlHint).toMatch(/vaillant\.de/);
    }
  });

  it('infers B2B fachpartner spine when no URL is given', () => {
    const intent = routeAssistantIntent(
      'Welche Seiten sind für Klaus besonders relevant — CHECKION-Metriken auf dem Fachpartner-Spine?',
    );
    expect(intent.type).toBe('persona_page_relevance');
    if (intent.type === 'persona_page_relevance') {
      expect(intent.personaName).toBe('Klaus');
      expect(intent.urlHint).toMatch(/myvaillantpro\.de/);
    }
  });

  it('routes singular seite + lowercase full name (demo chat phrasing)', () => {
    const intent = routeAssistantIntent(
      'welche seite wäre denn für jana schmitt aus dem vaillant group projekt besonders relevant',
    );
    expect(intent.type).toBe('persona_page_relevance');
    if (intent.type === 'persona_page_relevance') {
      expect(intent.personaName?.toLowerCase()).toBe('jana schmitt');
    }
  });

  it('does not steal persona bootstrap intents', () => {
    expect(routeAssistantIntent('Generiere Persona für Zielgruppe Eltern').type).toBe('persona_bootstrap');
  });
});

describe('persona page relevance ranking', () => {
  const persona = { id: 'p1', name: 'Sandra', role: 'Altbau-Eigenheimbesitzerin' };
  const pages: CheckionCorpusPageRow[] = [
    {
      url: 'https://example.com/produkte/waermepumpen/',
      scanId: 's1',
      overallScore: 72,
      errors: 2,
      warnings: 4,
      scores: { accessibility: 81, seo: 68 },
      classification: { shortSummary: 'Produktvergleich Wärmepumpen', tags: ['produkt', 'waermepumpe'], intensityTier: 2 },
      resultsPath: '/results/s1/overview',
    },
    {
      url: 'https://example.com/impressum',
      scanId: 's2',
      overallScore: 90,
      errors: 0,
      warnings: 0,
      resultsPath: '/results/s2/overview',
    },
  ];

  it('scores product pages higher for homeowner persona', () => {
    expect(scorePageForPersona(pages[0]!, persona)).toBeGreaterThan(scorePageForPersona(pages[1]!, persona));
  });

  it('returns ranked subset with metrics', () => {
    const ranked = rankCorpusPagesForPersona(pages, persona, 1);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.url).toContain('waermepumpen');
    expect(ranked[0]?.accessibility).toBe(81);
  });

  it('builds ui layout blocks', () => {
    const layout = buildPersonaPageRelevanceLayout({
      persona,
      domainScan: {
        id: 'domain-1',
        projectId: 'proj-1',
        url: 'https://example.com/',
        status: 'completed',
        overallScore: 70,
        pageCount: 2,
      },
      corpusTruncated: false,
      corpusMetrics: { corpusSize: 2, avgScore: 81, pagesWithErrors: 1 },
      rankedPages: rankCorpusPagesForPersona(pages, persona),
      audionHref: 'https://audion.example/projects/p1',
      checkionDomainHref: 'https://checkion.example/domain/domain-1',
    });
    expect(layout.blocks.length).toBeGreaterThan(2);
  });
});

describe('persona page relevance helpers', () => {
  it('resolves persona by partial name', () => {
    const hit = resolvePersonaFromCatalog(
      [
        { id: 'p1', name: 'Sandra', role: 'Altbau', status: 'active' },
        { id: 'p2', name: 'Thomas', role: 'Tausch', status: 'active' },
      ],
      { personaName: 'sandra' },
    );
    expect(hit?.id).toBe('p1');
  });

  it('picks completed domain scan with url hint', () => {
    const picked = pickCompletedDomainScan(
      [
        { id: 'd1', projectId: 'p', url: 'https://other.com/', status: 'completed', overallScore: 50 },
        { id: 'd2', projectId: 'p', url: 'https://vaillant.de/', status: 'completed', overallScore: 60, pageCount: 12 },
      ],
      'https://vaillant.de/produkte/',
    );
    expect(picked?.id).toBe('d2');
  });
});

describe('resolvePersonaPagePlatformProjectId', () => {
  it('matches Jana Schmitt as Vaillant MaFo persona', () => {
    expect(matchesVaillantGroupMafoPersonaName('Jana Schmitt')).toBe(true);
    expect(matchesVaillantGroupMafoPersonaName('jana')).toBe(true);
  });

  it('infers Vaillant Group from known MaFo persona name when chat has no project', async () => {
    vi.mocked(userCanViewPlatformProject).mockResolvedValue(true);
    const id = await resolvePersonaPagePlatformProjectId({
      plexonUserId: 'user-1',
      personaName: 'Jana Schmitt',
      prompt: 'Welche Seiten sind für Jana Schmitt besonders relevant?',
    });
    expect(id).toBe(VAILLANT_GROUP_PLATFORM_PROJECT_ID);
    expect(userCanViewPlatformProject).toHaveBeenCalledWith(
      'user-1',
      'user',
      VAILLANT_GROUP_PLATFORM_PROJECT_ID,
    );
  });
});
