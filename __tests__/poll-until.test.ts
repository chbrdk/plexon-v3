import { describe, expect, it, vi } from 'vitest';
import { pollUntil } from '@/lib/assistant/poll-until';

describe('pollUntil', () => {
  it('returns value when fetch reports done on first tick', async () => {
    const fetch = vi.fn().mockResolvedValue({ done: true, value: { id: '1' }, status: 'complete' });
    const result = await pollUntil({ fetch, intervalMs: 1, maxMs: 100 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ id: '1' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('polls until done', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ done: false, status: 'running', progress: 30 })
      .mockResolvedValueOnce({ done: false, status: 'running', progress: 60 })
      .mockResolvedValueOnce({ done: true, value: 'ok', status: 'complete', progress: 100 });

    const onTick = vi.fn();
    const result = await pollUntil({ fetch, intervalMs: 1, maxMs: 500, onTick });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('ok');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('returns error when done with error', async () => {
    const fetch = vi.fn().mockResolvedValue({ done: true, error: 'failed', status: 'error' });
    const result = await pollUntil({ fetch, intervalMs: 1, maxMs: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('failed');
  });

  it('times out when never done', async () => {
    const fetch = vi.fn().mockResolvedValue({ done: false, status: 'running' });
    const result = await pollUntil({ fetch, intervalMs: 5, maxMs: 20 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Timeout');
  });
});
