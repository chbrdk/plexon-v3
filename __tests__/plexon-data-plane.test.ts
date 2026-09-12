import { describe, expect, it, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PLATFORM_OUTBOX_KIND,
  __testBackoffMs,
} from '@/lib/platform-outbox';
import {
  buildCollectionProjectionSnapshot,
} from '@/lib/collection-projection';
import {
  createEmptyFacets,
  normalizeBrandData,
  buildKnowledgeFacetReadiness,
  normalizeFacetFreshness,
  productMayPublishFacet,
  toKnowledgePackResponse,
} from '@/lib/collection-knowledge-pack';
import {
  PLATFORM_DEEP_LINK_QUERY,
  appendPlatformProjectDeepLinkParams,
  resolvePlatformProjectIdFromSearchParams,
} from '@/lib/platform-deep-link-params';
import {
  decodeAccessibleCollectionsCursor,
} from '@/lib/list-accessible-collections';

const root = path.resolve(__dirname, '..');

describe('plexon data plane program', () => {
  it('ships knowledge + Wave A/B specs and migration', () => {
    const required = [
      'knowledge/plexon-data-plane-optimizations.md',
      'specs/domain/platform-outbox-delivery.md',
      'specs/domain/collection-read-model.md',
      'lib/db/migrations/0016_data_plane_outbox_projection.sql',
      'lib/platform-outbox.ts',
      'lib/collection-projection.ts',
      'lib/platform-deep-link-params.ts',
      'app/api/platform/ops/outbox/drain/route.ts',
      'app/api/platform/ops/data-plane/route.ts',
      'app/api/platform/projects/[platformProjectId]/projection/route.ts',
    ] as const;
    for (const rel of required) {
      expect(existsSync(path.join(root, rel)), `missing ${rel}`).toBe(true);
    }
  });

  it('indexes data plane in paths and specs-index', () => {
    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8');
    const index = readFileSync(path.join(root, 'knowledge/specs-index.md'), 'utf8');
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8');
    expect(paths).toContain('apiPlatformProjectProjection');
    expect(paths).toContain('outbox/drain');
    expect(paths).toContain('platform-outbox-scheduler');
    expect(paths).toContain('apiPlatformProjectKnowledgeFacetFreshness');
    expect(index).toContain('platform-outbox-delivery.md');
    expect(index).toContain('collection-read-model.md');
    expect(constants).toContain('apiPlatformProjectProjection');
    expect(constants).toContain('API_PLATFORM_OPS_DATA_PLANE');
    expect(constants).toContain('apiPlatformProjectKnowledgeFacetFreshness');
  });

  it('outbox backoff grows and kinds are stable', () => {
    expect(__testBackoffMs(1)).toBe(2000);
    expect(__testBackoffMs(2)).toBe(4000);
    expect(__testBackoffMs(10)).toBe(1000 * 2 ** 10);
    expect(__testBackoffMs(20)).toBe(1000 * 2 ** 10);
    expect(PLATFORM_OUTBOX_KIND.CAPABILITY_MIRROR_SYNC).toBe('capability_mirror_sync');
    expect(PLATFORM_OUTBOX_KIND.CAPABILITY_TOMBSTONE).toBe('capability_tombstone');
  });

  it('ships outbox scheduler + facet freshness route', () => {
    expect(existsSync(path.join(root, 'instrumentation.ts'))).toBe(true);
    expect(existsSync(path.join(root, 'lib/platform-outbox-scheduler.ts'))).toBe(true);
    expect(
      existsSync(
        path.join(
          root,
          'app/api/platform/projects/[platformProjectId]/knowledge/facets/[facetId]/freshness/route.ts'
        )
      )
    ).toBe(true);
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8');
    expect(constants).toContain('apiPlatformProjectKnowledgeFacetFreshness');
  });

  it('scheduler respects disable env', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://x');
    vi.stubEnv('PLEXON_OUTBOX_DRAIN_ENABLED', '0');
    const { __testDrainEnabled } = await import('@/lib/platform-outbox-scheduler');
    expect(__testDrainEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('builds projection snapshot with brand + freshness teasers', () => {
    const at = new Date().toISOString();
    const facets = createEmptyFacets(at);
    facets.brand = {
      ...facets.brand,
      freshness: 'fresh',
      data: normalizeBrandData({
        status: 'active',
        guidelineRef: {
          product: 'brandion',
          guidelineId: 'g1',
          version: 'v3',
          url: 'https://brandion.example/guidelines/g1',
        },
        voiceSummary: 'Clear and calm.',
        tokenRefs: [{ kind: 'color', name: 'ink' }],
      }),
    };
    facets.research_brief = {
      ...facets.research_brief,
      freshness: 'stale',
      data: {
        summary: 'Brief summary',
        sections: [],
        topics: [],
        sourceRunId: null,
        sourceProjectId: null,
      },
    };
    const pack = toKnowledgePackResponse({
      platformProjectId: 'pp-1',
      revision: 2,
      schemaVersion: facets.profile.schemaVersion,
      facets,
      updatedAt: at,
      updatedByUserId: null,
    });
    const snapshot = buildCollectionProjectionSnapshot({
      project: {
        id: 'pp-1',
        name: 'Acme',
        domain: 'acme.test',
        status: 'active',
        companyId: 'co-1',
      },
      bindings: [
        {
          productId: 'checkion',
          syncStatus: 'failed',
          externalProjectId: null,
          syncMessage: 'timeout',
        },
      ],
      pack,
    });
    expect(snapshot.brand.status).toBe('active');
    expect(snapshot.brand.guidelineRef?.guidelineId).toBe('g1');
    expect(snapshot.capabilityCards[0]?.stale).toBe(true);
    const research = snapshot.knowledgeTeasers.find((t) => t.facetId === 'research_brief');
    expect(research?.freshness).toBe('stale');
    expect(research?.readiness).toBe('filled');
    const brandReady = buildKnowledgeFacetReadiness(pack.facets).find((r) => r.facetId === 'brand');
    expect(brandReady?.status).toBe('filled');
  });

  it('allows Brandion to publish brand facet refs', () => {
    expect(productMayPublishFacet('brand', 'brandion')).toBe(true);
    const active = normalizeBrandData({
      status: 'active',
      guidelineRef: { guidelineId: 'g', version: '1' },
      voiceSummary: 'Voice',
    });
    expect(active.status).toBe('active');
    expect(active.guidelineRef?.guidelineId).toBe('g');
    expect(normalizeFacetFreshness('publish_failed')).toBe('publish_failed');
    expect(normalizeFacetFreshness('nope')).toBe('fresh');
  });

  it('canonical deep-link prefers platformProjectId with legacy hint', () => {
    const params = new URLSearchParams();
    appendPlatformProjectDeepLinkParams(params, {
      platformProjectId: 'abc',
      platformCompanyId: 'co',
    });
    expect(params.get(PLATFORM_DEEP_LINK_QUERY.PLATFORM_PROJECT_ID)).toBe('abc');
    expect(params.get(PLATFORM_DEEP_LINK_QUERY.PLATFORM_PROJECT_HINT)).toBe('abc');
    expect(
      resolvePlatformProjectIdFromSearchParams({
        platformProjectHint: 'legacy-only',
      })
    ).toBe('legacy-only');
    expect(
      resolvePlatformProjectIdFromSearchParams({
        platformProjectId: 'canonical',
        platformProjectHint: 'legacy',
      })
    ).toBe('canonical');
  });

  it('decodes accessible-collections cursors', () => {
    const cursor = Buffer.from(`Zebra\0id-9`, 'utf8').toString('base64url');
    expect(decodeAccessibleCollectionsCursor(cursor)).toEqual({ name: 'Zebra', id: 'id-9' });
    expect(decodeAccessibleCollectionsCursor('%%%')).toBeNull();
  });
});
