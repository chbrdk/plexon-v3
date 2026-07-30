import { describe, it, expect } from 'vitest';
import {
  getUpstreamCardIdsInOrder,
  buildHistoryMessages,
  type HistoryMessage,
} from '@/lib/board-connection-history';

function conn(
  id: string,
  from: string,
  to: string,
  direction?: 'forward' | 'backward'
): { id: string; boardId: string; fromPrismionId: string; toPrismionId: string; strokeWidth: number; createdAt: string; updatedAt: string; direction?: 'forward' | 'backward' } {
  return {
    id,
    boardId: 'b',
    fromPrismionId: from,
    toPrismionId: to,
    strokeWidth: 2,
    createdAt: '',
    updatedAt: '',
    ...(direction && { direction }),
  };
}

function prismion(id: string, prompt: string): { id: string; prompt: string; position: { x: number; y: number }; size: { w: number; h: number }; [k: string]: unknown } {
  return {
    id,
    prompt,
    position: { x: 0, y: 0 },
    size: { w: 360, h: 220 },
  };
}

describe('getUpstreamCardIdsInOrder', () => {
  it('returns empty when card has no incoming connections', () => {
    const connections = [conn('c1', 'prompt-card', 'result-1')];
    const ids = new Set(['prompt-card', 'result-1']);
    expect(getUpstreamCardIdsInOrder('prompt-card', connections, ids)).toEqual([]);
  });

  it('returns direct parent when card has one incoming connection', () => {
    const connections = [conn('c1', 'prompt-card', 'result-1')];
    const ids = new Set(['prompt-card', 'result-1']);
    expect(getUpstreamCardIdsInOrder('result-1', connections, ids)).toEqual(['prompt-card']);
  });

  it('returns full chain in topological order when new prompt is added from result card', () => {
    // prompt-card -> result-1 -> prompt-123 (new prompt card from port)
    const connections = [
      conn('c1', 'prompt-card', 'result-1'),
      conn('c2', 'result-1', 'prompt-123'),
    ];
    const ids = new Set(['prompt-card', 'result-1', 'prompt-123']);
    const order = getUpstreamCardIdsInOrder('prompt-123', connections, ids);
    expect(order).toContain('prompt-card');
    expect(order).toContain('result-1');
    expect(order.length).toBe(2);
    expect(order.indexOf('prompt-card')).toBeLessThan(order.indexOf('result-1'));
  });

  it('ignores backward connections for upstream', () => {
    const connections = [
      conn('c1', 'prompt-card', 'result-1', 'backward'),
    ];
    const ids = new Set(['prompt-card', 'result-1']);
    expect(getUpstreamCardIdsInOrder('result-1', connections, ids)).toEqual([]);
  });

  it('two disconnected chains A→B→C | D→E: submit from C gives only A,B, from E only D', () => {
    const connections = [
      conn('c1', 'A', 'B'),
      conn('c2', 'B', 'C'),
      conn('c3', 'D', 'E'),
    ];
    const ids = new Set(['A', 'B', 'C', 'D', 'E']);
    expect(getUpstreamCardIdsInOrder('C', connections, ids)).toEqual(['A', 'B']);
    expect(getUpstreamCardIdsInOrder('E', connections, ids)).toEqual(['D']);
  });

  it('new prompt at C only gets history from A,B,C (not D,E)', () => {
    const connections = [
      conn('c1', 'A', 'B'),
      conn('c2', 'B', 'C'),
      conn('c3', 'D', 'E'),
      conn('c4', 'C', 'F'), // new prompt F attached to C
    ];
    const ids = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
    const order = getUpstreamCardIdsInOrder('F', connections, ids);
    expect(order).toEqual(['A', 'B', 'C']);
  });

  it('after deleting a connection, disconnected branch is not included', () => {
    const withBtoC = [
      conn('c1', 'A', 'B'),
      conn('c2', 'B', 'C'),
      conn('c3', 'D', 'E'),
    ];
    const ids = new Set(['A', 'B', 'C', 'D', 'E']);
    expect(getUpstreamCardIdsInOrder('C', withBtoC, ids)).toEqual(['A', 'B']);

    // Delete B→C: C has no incoming connection anymore
    const afterDelete = [conn('c1', 'A', 'B'), conn('c3', 'D', 'E')];
    expect(getUpstreamCardIdsInOrder('C', afterDelete, ids)).toEqual([]);
  });
});

describe('buildHistoryMessages', () => {
  it('builds user message for prompt card', () => {
    const prismions = [prismion('prompt-card', 'Hello')];
    const order = ['prompt-card'];
    const result = buildHistoryMessages(order, prismions as never, {});
    expect(result).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('builds user + assistant for result card', () => {
    const prismions = [prismion('result-1', 'Hi')];
    const results: Record<string, { type: string; content: string }[]> = {
      'result-1': [{ type: 'text', content: 'Assistant reply here' }],
    };
    const order = ['result-1'];
    const out = buildHistoryMessages(order, prismions as never, results as never);
    expect(out).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Assistant reply here' },
    ]);
  });

  it('builds full history for prompt -> result -> new prompt chain', () => {
    const prismions = [
      prismion('prompt-card', 'First question'),
      prismion('result-1', 'First question'),
      prismion('prompt-123', ''),
    ];
    const results: Record<string, { type: string; content: string }[]> = {
      'result-1': [{ type: 'text', content: 'First answer' }],
    };
    const order = ['prompt-card', 'result-1'];
    const out = buildHistoryMessages(order, prismions as never, results as never);
    expect(out).toEqual([
      { role: 'user', content: 'First question' },
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
    ]);
  });
});
