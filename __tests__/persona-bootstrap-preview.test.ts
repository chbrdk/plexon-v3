import { describe, expect, it } from 'vitest';
import {
  listPersonasFromPreview,
  personaBootstrapDetailLabel,
  primaryPersonaFromPreview,
} from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';

const multiPreview: PersonaBootstrapPreview = {
  projectId: 'p1',
  projectName: 'Acme',
  targetGroupId: 'tg1',
  targetGroupName: 'TG1',
  persona: { id: 'a', name: 'Anna', segment: 'Entscheider', confidence: 0.9, headline: 'H1' },
  personas: [
    { id: 'a', name: 'Anna', segment: 'Entscheider', confidence: 0.9, headline: 'H1' },
    { id: 'b', name: 'Ben', segment: 'Anwender', confidence: 0.85, headline: 'H2' },
    { id: 'c', name: 'Clara', segment: 'IT', confidence: 0.8, headline: 'H3' },
  ],
};

describe('persona-bootstrap-preview helpers', () => {
  it('lists all personas from multi preview', () => {
    expect(listPersonasFromPreview(multiPreview)).toHaveLength(3);
    expect(primaryPersonaFromPreview(multiPreview)?.name).toBe('Anna');
  });

  it('falls back to single persona field', () => {
    const single: PersonaBootstrapPreview = {
      projectId: 'p1',
      projectName: 'Acme',
      targetGroupId: 'tg1',
      targetGroupName: 'TG1',
      persona: { id: 'a', name: 'Anna', segment: 'B2B', confidence: 0.9, headline: 'H' },
    };
    expect(listPersonasFromPreview(single)).toHaveLength(1);
  });

  it('builds multi persona detail label', () => {
    expect(personaBootstrapDetailLabel(multiPreview)).toContain('3 Personas');
    expect(personaBootstrapDetailLabel(multiPreview)).toContain('Anna');
  });
});
