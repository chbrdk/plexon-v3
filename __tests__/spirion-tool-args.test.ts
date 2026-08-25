import { describe, expect, it } from 'vitest';
import { injectSpirionToolArgs } from '@/lib/assistant/spirion-tool-args';
import { injectAssistantMcpToolArgs } from '@/lib/assistant/creation-scene-tool-args';

describe('injectSpirionToolArgs', () => {
  it('injects platformProjectId into screens_search when missing', () => {
    const out = injectSpirionToolArgs(
      'spirion_screens_search',
      { q: 'landing', limit: 5 },
      { platformProjectId: 'proj-1' },
    );
    expect(out.platformProjectId).toBe('proj-1');
    expect(out.q).toBe('landing');
  });

  it('does not overwrite an existing platformProjectId', () => {
    const out = injectSpirionToolArgs(
      'spirion_references_search',
      { q: 'x', platformProjectId: 'keep-me' },
      { platformProjectId: 'other' },
    );
    expect(out.platformProjectId).toBe('keep-me');
  });

  it('does not inject into captures_list', () => {
    const out = injectSpirionToolArgs(
      'spirion_captures_list',
      { limit: 12 },
      { platformProjectId: 'proj-1' },
    );
    expect(out.platformProjectId).toBeUndefined();
  });

  it('prefers pageContext platformProjectId', () => {
    const out = injectSpirionToolArgs(
      'spirion_screens_search',
      {},
      {
        pageContext: {
          product: 'creation',
          pathname: '/editor',
          platformProjectId: 'from-page',
        },
        platformProjectId: 'from-conv',
      },
    );
    expect(out.platformProjectId).toBe('from-page');
  });
});

describe('injectAssistantMcpToolArgs', () => {
  it('still passes through non-creation non-search tools unchanged', () => {
    const input = { foo: 1 };
    expect(
      injectAssistantMcpToolArgs('plexon_ui_open', input, {
        actorUserId: 'u1',
        platformProjectId: 'p1',
      }),
    ).toEqual(input);
  });
});
