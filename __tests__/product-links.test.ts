import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildAudionDirectProjectLink,
  buildCheckionDirectProjectLink,
  buildCheckionScanLink,
  buildProductCreatedLinks,
} from '@/lib/assistant/ui-blocks/product-links';

describe('product-links', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds direct CHECKION project link', () => {
    vi.stubEnv('NEXT_PUBLIC_CHECKION_URL', 'https://checkion.example');
    const link = buildCheckionDirectProjectLink('proj-1');
    expect(link.href).toBe('https://checkion.example/projects/proj-1');
    expect(link.external).toBe(true);
  });

  it('builds direct AUDION project link', () => {
    vi.stubEnv('NEXT_PUBLIC_AUDION_ADMIN_URL', 'https://audion.example/admin/');
    const link = buildAudionDirectProjectLink('proj-2');
    expect(link.href).toContain('/admin/projects/proj-2');
  });

  it('builds scan result link', () => {
    vi.stubEnv('NEXT_PUBLIC_CHECKION_URL', 'https://checkion.example');
    const link = buildCheckionScanLink('scan-abc');
    expect(link.href).toBe('https://checkion.example/results/scan-abc');
  });

  it('buildProductCreatedLinks returns single product link', () => {
    vi.stubEnv('NEXT_PUBLIC_AUDION_ADMIN_URL', 'https://audion.example/admin/');
    const links = buildProductCreatedLinks({ product: 'audion', projectId: 'a1' });
    expect(links).toHaveLength(1);
    expect(links[0].label).toContain('AUDION');
  });
});
