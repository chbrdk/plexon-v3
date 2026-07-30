import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdmin } from '@/lib/auth-request-user';

vi.mock('@/lib/auth-request-user', () => ({
  requireAdmin: vi.fn(),
}));

describe('board complete API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects non-admin callers', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { POST } = await import('@/app/api/board/complete/route');
    const response = await POST(
      new Request('http://localhost/api/board/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      })
    );
    expect(response.status).toBe(403);
  });
});
