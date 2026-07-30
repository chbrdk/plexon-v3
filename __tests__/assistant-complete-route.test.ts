import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequestUser } from '@/lib/auth-request-user';

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(),
}));

describe('assistant complete API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects unauthenticated callers', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    const { POST } = await import('@/app/api/assistant/complete/route');
    const response = await POST(
      new Request('http://localhost/api/assistant/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      }) as import('next/server').NextRequest
    );
    expect(response.status).toBe(401);
  });
});
