import { afterEach, describe, expect, it, vi } from 'vitest';

describe('product entry URLs (dashboard teasers)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns defaults when env vars are unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUDION_ADMIN_URL', '');
    vi.stubEnv('NEXT_PUBLIC_CHECKION_URL', '');
    vi.stubEnv('NEXT_PUBLIC_VIDEON_URL', '');
    vi.stubEnv('NEXT_PUBLIC_BRANDION_URL', '');
    const { getAudionAdminUrl, getCheckionUrl, getVideonUrl, getBrandionUrl } = await import('@/lib/constants');
    expect(getAudionAdminUrl()).toBe('https://audion.projects-a.plygrnd.tech/admin/');
    expect(getCheckionUrl()).toBe('https://checkion.projects-a.plygrnd.tech/');
    expect(getVideonUrl()).toBeNull();
    expect(getBrandionUrl()).toBeNull();
  });

  it('uses /api suffix for audion service url when AUDION_API_URL unset', async () => {
    vi.stubEnv('AUDION_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_AUDION_ADMIN_URL', 'https://audion.projects-a.plygrnd.tech/admin/');
    const { getAudionServiceApiUrl } = await import('@/lib/constants');
    expect(getAudionServiceApiUrl()).toBe('https://audion.projects-a.plygrnd.tech/api');
  });

  it('builds audion platform API base from admin URL, ignoring FastAPI AUDION_API_URL', async () => {
    vi.stubEnv('AUDION_API_URL', 'http://audion-api:8000');
    vi.stubEnv('AUDION_PLATFORM_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_AUDION_ADMIN_URL', 'https://audion-v3.projects-a.plygrnd.tech/admin/');
    const { getAudionPlatformApiBase, getAudionWebOrigin } = await import('@/lib/constants');
    expect(getAudionWebOrigin()).toBe('https://audion-v3.projects-a.plygrnd.tech');
    expect(getAudionPlatformApiBase()).toBe('https://audion-v3.projects-a.plygrnd.tech/api');
  });

  it('honors AUDION_PLATFORM_API_URL for federation', async () => {
    vi.stubEnv('AUDION_PLATFORM_API_URL', 'https://audion-v3.example.com');
    vi.stubEnv('NEXT_PUBLIC_AUDION_ADMIN_URL', 'https://ignored.example.com/admin/');
    const { getAudionPlatformApiBase } = await import('@/lib/constants');
    expect(getAudionPlatformApiBase()).toBe('https://audion-v3.example.com/api');
  });

  it('uses NEXT_PUBLIC_* overrides when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUDION_ADMIN_URL', 'https://audion.example.com/admin/');
    vi.stubEnv('NEXT_PUBLIC_CHECKION_URL', 'https://checkion.example.com/');
    vi.stubEnv('NEXT_PUBLIC_VIDEON_URL', 'https://videon.example.com/');
    vi.stubEnv('NEXT_PUBLIC_BRANDION_URL', 'https://brandion.example.com/');
    const { getAudionAdminUrl, getCheckionUrl, getVideonUrl, getBrandionUrl } = await import('@/lib/constants');
    expect(getAudionAdminUrl()).toBe('https://audion.example.com/admin/');
    expect(getCheckionUrl()).toBe('https://checkion.example.com/');
    expect(getVideonUrl()).toBe('https://videon.example.com/');
    expect(getBrandionUrl()).toBe('https://brandion.example.com/');
  });
});
