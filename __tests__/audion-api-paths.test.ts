import { describe, expect, it, vi, afterEach } from 'vitest';

describe('audion-api paths', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds target-group persona generate URL on FastAPI base', async () => {
    vi.stubEnv('AUDION_API_URL', 'http://audion-api:8000');
    const { audionApiTargetGroupPersonasGenerate } = await import('@/lib/paths/audion-api');
    expect(audionApiTargetGroupPersonasGenerate('tg-abc-123')).toBe(
      'http://audion-api:8000/target-groups/tg-abc-123/personas/generate'
    );
  });

  it('builds target-group persona generate URL on public /api proxy', async () => {
    vi.stubEnv('AUDION_API_URL', 'https://audion.example.com/api');
    const { audionApiTargetGroupPersonasGenerate } = await import('@/lib/paths/audion-api');
    expect(audionApiTargetGroupPersonasGenerate('tg-1')).toBe(
      'https://audion.example.com/api/target-groups/tg-1/personas/generate'
    );
  });
});
