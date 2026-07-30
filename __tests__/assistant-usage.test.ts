import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/usage-conversion', () => ({
  getCurrentPeriod: () => '2026-06',
  tokensFromEvent: () => 968.25,
}));

describe('recordAssistantUsageEvent', () => {
  it('rounds fractional tokens before insert', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://test');
    const insert = vi.fn().mockResolvedValue(undefined);
    const select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { getDb } = await import('@/lib/db');
    vi.mocked(getDb).mockReturnValue({
      insert: vi.fn().mockReturnValue({ values: insert }),
      select,
    } as never);

    const { recordAssistantUsageEvent } = await import('@/lib/assistant/usage');
    await recordAssistantUsageEvent({
      userId: 'u1',
      eventType: 'chat',
      rawUnits: { input_tokens: 5.75, output_tokens: 481.25 },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: 968,
      })
    );
    vi.unstubAllEnvs();
  });
});
