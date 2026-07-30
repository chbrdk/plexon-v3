import { describe, expect, it } from 'vitest';
import { buildProductCreatedLayout } from '@/lib/assistant/ui-blocks/build-product-created-ui';

describe('buildProductCreatedLayout', () => {
  it('builds key_value_list and link_list for audion', () => {
    const layout = buildProductCreatedLayout({
      product: 'audion',
      name: 'Rheinland',
      projectId: 'id-1',
    });
    expect(layout.blocks.length).toBeGreaterThanOrEqual(2);
    expect(layout.blocks.some((b) => b.type === 'key_value_list')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'link_list')).toBe(true);
  });

  it('includes alert when error provided', () => {
    const layout = buildProductCreatedLayout({
      product: 'checkion',
      name: 'Acme',
      projectId: 'id-2',
      domain: 'acme.com',
      error: 'Token fehlt',
    });
    expect(layout.blocks.some((b) => b.type === 'alert')).toBe(true);
  });
});
