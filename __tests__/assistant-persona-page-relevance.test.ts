import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import {
  findPersonaAcrossAccessibleCollections,
  pickBestPersonaCollectionMatch,
  pickCompletedDomainScan,
  resolvePersonaFromCatalog,
  resolvePersonaPageContext,
} from '@/lib/integrations/persona-page-relevance-client';
import {
  rankCorpusPagesForPersona,
  scorePageForPersona,
} from '@/lib/assistant/persona-page-relevance/rank-corpus-pages';
import { buildPersonaPageRelevanceLayout } from '@/lib/assistant/ui-blocks/build-persona-page-relevance-ui';
import type { CheckionCorpusPageRow } from '@/lib/integrations/checkion-domain-scans-v3-client';
import { listAccessibleCollectionsForUser } from '@/lib/list-accessible-collections';
import { fetchAudionPlatformProjectSummary } from '@/lib/platform-project-dashboard-fetch';

vi.mock('@/lib/list-accessible-collections', () => ({
  listAccessibleCollectionsForUser: vi.fn(),
}));
vi.mock('@/lib/platform-project-dashboard-fetch', () => ({
  fetchAudionPlatformProjectSummary: vi.fn(),
  fetchCheckionPlatformProjectSummary: vi.fn(),
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
      classification: {
        shortSummary: 'Produktvergleich Wärmepumpen',
        tags: ['produkt', 'waermepumpe'],
        intensityTier: 2,
      },
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
      platformProjectId: 'pp-1',
      collectionName: 'Demo Collection',
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
        {
          id: 'd2',
          projectId: 'p',
          url: 'https://vaillant.de/',
          status: 'completed',
          overallScore: 60,
          pageCount: 12,
        },
      ],
      'https://vaillant.de/produkte/',
    );
    expect(picked?.id).toBe('d2');
  });

  it('prefers exact match and collection name hint when ranking hits', () => {
    const best = pickBestPersonaCollectionMatch(
      [
        {
          platformProjectId: 'a',
          collectionName: 'Other',
          persona: { id: 'p1', name: 'Jana Schmitt', role: 'x', status: 'active' },
          exactName: true,
          summary: { externalProjectId: 'aud-a', personas: [], targetGroups: [], personaCount: 1, targetGroupCount: 0, journeyCount: 0, studyCount: 0, journeys: [], studies: [] },
        },
        {
          platformProjectId: 'b',
          collectionName: 'Vaillant Group',
          persona: { id: 'p2', name: 'Jana Schmitt', role: 'x', status: 'active' },
          exactName: true,
          summary: { externalProjectId: 'aud-b', personas: [], targetGroups: [], personaCount: 1, targetGroupCount: 0, journeyCount: 0, studyCount: 0, journeys: [], studies: [] },
        },
      ],
      'für Jana Schmitt aus dem Vaillant Group projekt',
    );
    expect(best?.platformProjectId).toBe('b');
  });
});

describe('findPersonaAcrossAccessibleCollections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves Collection from persona catalog when chat has no project', async () => {
    vi.mocked(listAccessibleCollectionsForUser).mockResolvedValue({
      items: [
        { id: 'pp-other', name: 'Other Co', status: 'active', companyId: 'c1', domain: null },
        { id: 'pp-vaillant', name: 'Vaillant Group', status: 'active', companyId: 'c1', domain: null },
      ],
      totalAccessible: 2,
      truncated: false,
    });
    vi.mocked(fetchAudionPlatformProjectSummary).mockImplementation(async (platformProjectId) => {
      if (platformProjectId === 'pp-vaillant') {
        return {
          externalProjectId: 'aud-vg',
          personaCount: 1,
          targetGroupCount: 0,
          journeyCount: 0,
          studyCount: 0,
          personas: [{ id: 'persona-jana', name: 'Jana Schmitt', role: 'Öko', status: 'active' }],
          targetGroups: [],
          journeys: [],
          studies: [],
        };
      }
      return {
        externalProjectId: 'aud-other',
        personaCount: 1,
        targetGroupCount: 0,
        journeyCount: 0,
        studyCount: 0,
        personas: [{ id: 'persona-marcus', name: 'Marcus', role: 'x', status: 'active' }],
        targetGroups: [],
        journeys: [],
        studies: [],
      };
    });

    const found = await findPersonaAcrossAccessibleCollections({
      plexonUserId: 'user-1',
      personaName: 'Jana Schmitt',
      prompt: 'Welche Seiten sind für Jana Schmitt besonders relevant?',
    });
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.match.platformProjectId).toBe('pp-vaillant');
      expect(found.match.persona.id).toBe('persona-jana');
    }
  });

  it('keeps explicit platformProjectId over persona scan', async () => {
    const resolved = await resolvePersonaPageContext({
      plexonUserId: 'user-1',
      platformProjectId: 'pp-explicit',
      personaName: 'Jana Schmitt',
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.platformProjectId).toBe('pp-explicit');
      expect(resolved.inferred).toBe(false);
    }
    expect(listAccessibleCollectionsForUser).not.toHaveBeenCalled();
  });

  it('errors when persona is missing from all accessible collections', async () => {
    vi.mocked(listAccessibleCollectionsForUser).mockResolvedValue({
      items: [{ id: 'pp-1', name: 'Only One', status: 'active', companyId: 'c1', domain: null }],
      totalAccessible: 1,
      truncated: false,
    });
    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue({
      externalProjectId: 'aud-1',
      personaCount: 1,
      targetGroupCount: 0,
      journeyCount: 0,
      studyCount: 0,
      personas: [{ id: 'p-m', name: 'Marcus', role: 'x', status: 'active' }],
      targetGroups: [],
      journeys: [],
      studies: [],
    });

    const found = await findPersonaAcrossAccessibleCollections({
      plexonUserId: 'user-1',
      personaName: 'Jana Schmitt',
    });
    expect(found.ok).toBe(false);
    if (!found.ok) {
      expect(found.error).toMatch(/keiner zugänglichen Collection/i);
    }
  });

  it('asks to pick Collection when the same exact persona exists twice', async () => {
    vi.mocked(listAccessibleCollectionsForUser).mockResolvedValue({
      items: [
        { id: 'pp-a', name: 'Alpha', status: 'active', companyId: 'c1', domain: null },
        { id: 'pp-b', name: 'Beta', status: 'active', companyId: 'c1', domain: null },
      ],
      totalAccessible: 2,
      truncated: false,
    });
    vi.mocked(fetchAudionPlatformProjectSummary).mockResolvedValue({
      externalProjectId: 'aud-x',
      personaCount: 1,
      targetGroupCount: 0,
      journeyCount: 0,
      studyCount: 0,
      personas: [{ id: 'persona-jana', name: 'Jana Schmitt', role: 'Öko', status: 'active' }],
      targetGroups: [],
      journeys: [],
      studies: [],
    });

    const found = await findPersonaAcrossAccessibleCollections({
      plexonUserId: 'user-1',
      personaName: 'Jana Schmitt',
      prompt: 'Welche Seiten sind für Jana Schmitt besonders relevant?',
    });
    expect(found.ok).toBe(false);
    if (!found.ok) {
      expect(found.ambiguous).toHaveLength(2);
      expect(found.error).toMatch(/mehreren Collections/i);
    }
  });
});
