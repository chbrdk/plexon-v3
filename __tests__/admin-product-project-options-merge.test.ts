import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/platform-product-project-options', () => ({
  listBoundPlatformProjectsForProduct: vi.fn(),
}));

vi.mock('@/lib/db/product-project-assignments', () => ({
  listUserProductProjectAssignments: vi.fn(),
}));

vi.mock('@/lib/admin-product-db-catalog', () => ({
  fetchCheckionProjectsFromProductDb: vi.fn(),
  fetchAudionProjectsFromProductDb: vi.fn(),
}));

describe('listAdminProductProjectPickerItems', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const { listBoundPlatformProjectsForProduct } = await import('@/lib/db/platform-product-project-options');
    const { listUserProductProjectAssignments } = await import('@/lib/db/product-project-assignments');
    const cat = await import('@/lib/admin-product-db-catalog');
    vi.mocked(listBoundPlatformProjectsForProduct).mockResolvedValue([]);
    vi.mocked(listUserProductProjectAssignments).mockResolvedValue([]);
    vi.mocked(cat.fetchCheckionProjectsFromProductDb).mockResolvedValue([
      { id: 'chk-uuid-1', name: 'Kunde A', domain: 'a.test' },
    ]);
    vi.mocked(cat.fetchAudionProjectsFromProductDb).mockResolvedValue([
      { id: 'aud-uuid-1', name: 'Persona-Projekt B' },
    ]);
  });

  it('merges CHECKION catalog when platform bindings are empty', async () => {
    const { listAdminProductProjectPickerItems } = await import('@/lib/admin-product-project-options');
    const items = await listAdminProductProjectPickerItems('u1', 'checkion');
    expect(items).toHaveLength(1);
    expect(items[0]?.projectId).toBe('chk-uuid-1');
    expect(items[0]?.platformProjectName).toBe('Kunde A');
  });

  it('merges AUDION catalog when platform bindings are empty', async () => {
    const { listAdminProductProjectPickerItems } = await import('@/lib/admin-product-project-options');
    const items = await listAdminProductProjectPickerItems('u1', 'audion');
    expect(items).toHaveLength(1);
    expect(items[0]?.projectId).toBe('aud-uuid-1');
    expect(items[0]?.platformProjectName).toBe('Persona-Projekt B');
  });
});
