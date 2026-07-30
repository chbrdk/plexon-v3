import { describe, it, expect } from 'vitest';
import {
  getThreadRootId,
  getThreadChildrenInOrder,
  getThreadRootIdFromParent,
  getChildrenInOrder,
  getThreadSequenceFlattened,
  getThreadSequenceFlattenedFromConnections,
} from '@/lib/board-thread';

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

function prismion(id: string): { id: string; position: { x: number; y: number }; size: { w: number; h: number }; [k: string]: unknown } {
  return {
    id,
    position: { x: 0, y: 0 },
    size: { w: 360, h: 72 },
  };
}

describe('getThreadRootId', () => {
  it('returns null for prompt-card (it is itself the root)', () => {
    const connections = [conn('c1', 'prompt-card', 'result-1')];
    const ids = new Set(['prompt-card', 'result-1']);
    expect(getThreadRootId('prompt-card', connections, ids)).toBeNull();
  });

  it('returns prompt-card for result-1 when connected from prompt-card', () => {
    const connections = [conn('c1', 'prompt-card', 'result-1')];
    const ids = new Set(['prompt-card', 'result-1']);
    expect(getThreadRootId('result-1', connections, ids)).toBe('prompt-card');
  });

  it('returns prompt-card for follow-up prompt when nesting is (promptcard (result-1)+(prompt-2))', () => {
    const connections = [
      conn('c1', 'prompt-card', 'result-1'),
      conn('c2', 'prompt-card', 'prompt-2'),
      conn('c3', 'result-1', 'prompt-2'),
    ];
    const ids = new Set(['prompt-card', 'result-1', 'prompt-2']);
    expect(getThreadRootId('prompt-2', connections, ids)).toBe('prompt-card');
  });

  it('returns prompt-card for result-2 when nesting is (promptcard (result-1)+(prompt-2 (result-2)))', () => {
    const connections = [
      conn('c1', 'prompt-card', 'result-1'),
      conn('c2', 'prompt-card', 'prompt-2'),
      conn('c3', 'result-1', 'prompt-2'),
      conn('c4', 'prompt-2', 'result-2'),
    ];
    const ids = new Set(['prompt-card', 'result-1', 'prompt-2', 'result-2']);
    expect(getThreadRootId('result-2', connections, ids)).toBe('prompt-card');
  });

  it('ignores backward connections when walking upstream', () => {
    const connections = [conn('c1', 'prompt-card', 'result-1', 'backward')];
    const ids = new Set(['prompt-card', 'result-1']);
    expect(getThreadRootId('result-1', connections, ids)).toBeNull();
  });
});

describe('getThreadChildrenInOrder', () => {
  it('returns empty when root has no outgoing connections', () => {
    const connections: ReturnType<typeof conn>[] = [];
    const prismions = [prismion('prompt-card'), prismion('result-1')];
    expect(getThreadChildrenInOrder('prompt-card', connections, prismions as never)).toEqual([]);
  });

  it('returns single result when root connects to one result', () => {
    const connections = [conn('c1', 'prompt-card', 'result-1')];
    const prismions = [prismion('prompt-card'), prismion('result-1')];
    expect(getThreadChildrenInOrder('prompt-card', connections, prismions as never)).toEqual(['result-1']);
  });

  it('returns direct children in order (resultcard)+(weitere promptcard): result-1, prompt-2', () => {
    const connections = [
      conn('c1', 'prompt-card', 'result-1'),
      conn('c2', 'prompt-card', 'prompt-2'),
      conn('c3', 'result-1', 'prompt-2'),
      conn('c4', 'prompt-2', 'result-2'),
    ];
    const prismions = [
      prismion('prompt-card'),
      prismion('result-1'),
      prismion('prompt-2'),
      prismion('result-2'),
    ];
    expect(getThreadChildrenInOrder('prompt-card', connections, prismions as never)).toEqual([
      'result-1',
      'prompt-2',
    ]);
    expect(getThreadChildrenInOrder('prompt-2', connections, prismions as never)).toEqual(['result-2']);
  });

  it('stops at first missing link (no connection from result-1)', () => {
    const connections = [conn('c1', 'prompt-card', 'result-1')];
    const prismions = [prismion('prompt-card'), prismion('result-1'), prismion('prompt-2')];
    expect(getThreadChildrenInOrder('prompt-card', connections, prismions as never)).toEqual(['result-1']);
  });

  it('ignores backward connections for downstream walk', () => {
    const connections = [
      conn('c1', 'prompt-card', 'result-1'),
      conn('c2', 'result-1', 'prompt-2', 'backward'),
    ];
    const prismions = [prismion('prompt-card'), prismion('result-1'), prismion('prompt-2')];
    expect(getThreadChildrenInOrder('prompt-card', connections, prismions as never)).toEqual(['result-1']);
  });
});

describe('getThreadRootIdFromParent', () => {
  it('returns card id when card has no parent', () => {
    expect(getThreadRootIdFromParent('prompt-card', {})).toBe('prompt-card');
    expect(getThreadRootIdFromParent('result-1', {})).toBe('result-1');
  });

  it('returns root when card has parent chain', () => {
    const parent = { 'result-1': 'prompt-card', 'prompt-2': 'prompt-card', 'result-2': 'prompt-2' };
    expect(getThreadRootIdFromParent('prompt-card', parent)).toBe('prompt-card');
    expect(getThreadRootIdFromParent('result-1', parent)).toBe('prompt-card');
    expect(getThreadRootIdFromParent('prompt-2', parent)).toBe('prompt-card');
    expect(getThreadRootIdFromParent('result-2', parent)).toBe('prompt-card');
  });
});

describe('getChildrenInOrder', () => {
  it('returns empty when root has no children in parent map', () => {
    const prismions = [prismion('prompt-card'), prismion('result-1')];
    expect(getChildrenInOrder('prompt-card', {}, prismions as never)).toEqual([]);
  });

  it('returns direct children in order (resultcard)+(weitere promptcard)', () => {
    const parent = { 'result-1': 'prompt-card', 'prompt-2': 'prompt-card', 'result-2': 'prompt-2' };
    const prismions = [
      prismion('prompt-card'),
      prismion('result-1'),
      prismion('prompt-2'),
      prismion('result-2'),
    ];
    expect(getChildrenInOrder('prompt-card', parent, prismions as never)).toEqual(['result-1', 'prompt-2']);
    expect(getChildrenInOrder('prompt-2', parent, prismions as never)).toEqual(['result-2']);
  });
});

describe('getThreadSequenceFlattened', () => {
  it('returns empty when root has no children', () => {
    const prismions = [prismion('prompt-card'), prismion('result-1')];
    expect(getThreadSequenceFlattened('prompt-card', {}, prismions as never)).toEqual([]);
  });

  it('returns single level in conversation order (result then prompt)', () => {
    const parent = { 'result-1': 'prompt-card', 'prompt-2': 'prompt-card' };
    const prismions = [
      prismion('prompt-card'),
      prismion('result-1'),
      prismion('prompt-2'),
    ];
    expect(getThreadSequenceFlattened('prompt-card', parent, prismions as never)).toEqual([
      'result-1',
      'prompt-2',
    ]);
  });

  it('returns full thread in conversation order across levels', () => {
    const parent = { 'result-1': 'prompt-card', 'prompt-2': 'prompt-card', 'result-2': 'prompt-2', 'prompt-3': 'prompt-2' };
    const prismions = [
      prismion('prompt-card'),
      prismion('result-1'),
      prismion('prompt-2'),
      prismion('result-2'),
      prismion('prompt-3'),
    ];
    expect(getThreadSequenceFlattened('prompt-card', parent, prismions as never)).toEqual([
      'result-1',
      'prompt-2',
      'result-2',
      'prompt-3',
    ]);
  });
});

describe('getThreadSequenceFlattenedFromConnections', () => {
  it('returns empty when root has no outgoing connections', () => {
    const connections: ReturnType<typeof conn>[] = [];
    const prismions = [prismion('prompt-card'), prismion('result-1')];
    expect(getThreadSequenceFlattenedFromConnections('prompt-card', connections, prismions as never)).toEqual([]);
  });

  it('returns full thread in conversation order from connections', () => {
    const connections = [
      conn('c1', 'prompt-card', 'result-1'),
      conn('c2', 'prompt-card', 'prompt-2'),
      conn('c3', 'result-1', 'prompt-2'),
      conn('c4', 'prompt-2', 'result-2'),
      conn('c5', 'prompt-2', 'prompt-3'),
    ];
    const prismions = [
      prismion('prompt-card'),
      prismion('result-1'),
      prismion('prompt-2'),
      prismion('result-2'),
      prismion('prompt-3'),
    ];
    expect(getThreadSequenceFlattenedFromConnections('prompt-card', connections, prismions as never)).toEqual([
      'result-1',
      'prompt-2',
      'result-2',
      'prompt-3',
    ]);
  });
});
