import { describe, expect, it } from 'vitest';
import { parseAudionPersonaResponse } from '@/lib/integrations/parse-audion-persona-profile';

describe('parseAudionPersonaResponse', () => {
  it('reads nested PersonaResponse profile fields', () => {
    const parsed = parseAudionPersonaResponse(
      {
      profile: {
        name: 'Anna Buyer',
        segment: 'Procurement',
        headline: 'Skeptical buyer',
        bio: 'Buys chips for automotive.',
        traits: { Analytical: 0.82, RiskAware: 0.71 },
        goals: ['Reliable supply', 'Cost control'],
        pain_points: ['Long lead times'],
        interests: ['Power ICs'],
      },
      metadata: {
        personaId: 'p-1',
        confidence: 0.88,
      },
    },
      { outputLocale: 'en' }
    );

    expect(parsed.name).toBe('Anna Buyer');
    expect(parsed.confidence).toBe(0.88);
    expect(parsed.profile?.traits[0]).toEqual({
      name: 'Analytical',
      displayName: 'Analytisch',
      score: 0.82,
    });
    expect(parsed.profile?.goals).toContain('Reliable supply');
    expect(parsed.profile?.painPoints).toContain('Long lead times');
  });

  it('extracts label from object goals and pain points', () => {
    const parsed = parseAudionPersonaResponse(
      {
      profile: {
        name: 'Elena',
        goals: [{ label: 'Stay informed', priority: 1 }],
        pain_points: [{ label: 'Long cycles', evidence_count: 1 }],
        traits: { detail_oriented: 0.82 },
      },
      metadata: { personaId: 'p-2', confidence: 0.81 },
    },
      { outputLocale: 'en' }
    );
    expect(parsed.profile?.goals).toEqual(['Stay informed']);
    expect(parsed.profile?.painPoints).toEqual(['Long cycles']);
    expect(parsed.profile?.traits[0]?.displayName).toBe('Detail-orientiert');
  });

  it('supports legacy flat JSON', () => {
    const parsed = parseAudionPersonaResponse({
      id: 'legacy-1',
      name: 'Legacy',
      segment: 'B2B',
      confidence: 0.7,
      headline: 'Head',
    });
    expect(parsed.id).toBe('legacy-1');
    expect(parsed.name).toBe('Legacy');
  });

  it('unwraps audion-v3 generatePersonas batch response', () => {
    const parsed = parseAudionPersonaResponse({
      stubbed: false,
      workflowId: 'generatePersonas',
      personas: [{ id: 'persona-anna-abc', name: 'Anna', role: 'Privatkunden' }],
    });
    expect(parsed.id).toBe('persona-anna-abc');
    expect(parsed.name).toBe('Anna');
    expect(parsed.segment).toBe('Privatkunden');
    expect(parsed.headline).toBe('Privatkunden');
  });

  it('prefers German profile_de and headline_de when output locale is de', () => {
    const parsed = parseAudionPersonaResponse(
      {
        profile: {
          name: 'Marcus',
          headline: 'Experienced tradesperson',
          bio: 'Marcus is an experienced tradesperson with 15+ years.',
          goals: [{ label: 'Identify premium tools', priority: 1 }],
          pain_points: [{ label: 'Tool reliability', evidence_count: 1 }],
          traits: { pragmatic: 0.9 },
        },
        profile_de: {
          headline: 'Erfahrener Handwerker',
          bio: 'Marcus ist ein erfahrener Handwerker mit über 15 Jahren Erfahrung.',
          goals: [{ label: 'Premium-Werkzeuge finden', priority: 1 }],
          pain_points: [{ label: 'Werkzeug-Zuverlässigkeit', evidence_count: 1 }],
        },
        headline_de: 'Erfahrener Handwerker',
        metadata: { personaId: 'p-de', confidence: 0.9 },
      },
      { outputLocale: 'de' }
    );

    expect(parsed.headline).toBe('Erfahrener Handwerker');
    expect(parsed.profile?.bio).toContain('erfahrener Handwerker');
    expect(parsed.profile?.goals[0]).toContain('Premium-Werkzeuge');
    expect(parsed.profile?.painPoints[0]).toContain('Zuverlässigkeit');
  });
});
