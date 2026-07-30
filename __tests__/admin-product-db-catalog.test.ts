import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('admin-product-db-catalog', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns empty CHECKION catalog when no database URL is configured', async () => {
    const { fetchCheckionProjectsFromProductDb } = await import('@/lib/admin-product-db-catalog');
    expect(await fetchCheckionProjectsFromProductDb()).toEqual([]);
  });

  it('returns empty AUDION catalog when no database URL is configured', async () => {
    const { fetchAudionProjectsFromProductDb } = await import('@/lib/admin-product-db-catalog');
    expect(await fetchAudionProjectsFromProductDb()).toEqual([]);
  });
});
