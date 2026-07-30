import { describe, expect, it } from 'vitest';
import { encodeAssistantSseEvent } from '@/lib/assistant/assistant-sse';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';

describe('assistant-sse', () => {
  it('encodes phase events', () => {
    const encoded = encodeAssistantSseEvent({ type: 'phase', phase: 'planning' });
    expect(encoded).toContain('event: phase');
    expect(encoded).toContain('"phase":"planning"');
  });
});

describe('intent-router research patterns', () => {
  it('detects recherche intent', () => {
    expect(routeAssistantIntent('Starte Recherche für das Projekt').type).toBe('start_research');
  });

  it('detects website analysis intent', () => {
    expect(routeAssistantIntent('Analysiere die Website des Projekts').type).toBe('start_research');
  });
});
