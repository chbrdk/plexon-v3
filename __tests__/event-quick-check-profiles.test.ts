import { describe, expect, it } from 'vitest';
import {
  EVENT_QUICK_CHECK_PROFILES,
  resolveEventQuickCheckProfile,
  resolveEventQuickCheckProfileFromStored,
} from '@/lib/paths/assistant-workflows';

describe('resolveEventQuickCheckProfile', () => {
  it('returns quick profile by default', () => {
    const p = resolveEventQuickCheckProfile();
    expect(p.depth).toBe('quick');
    expect(p.scanMaxPages).toBe(50);
    expect(p.scanCompetitors).toBe(false);
  });

  it('returns complete profile with CHECKION project requirements', () => {
    const p = resolveEventQuickCheckProfile('complete');
    expect(p.depth).toBe('complete');
    expect(p.scanMaxPages).toBe(1000);
    expect(p.personaCount).toBe(3);
    expect(p.scanCompetitors).toBe(true);
    expect(p.maxCompetitors).toBe(3);
    expect(p.requireCheckionProject).toBe(true);
  });

  it('applies persona and competitor count overrides', () => {
    const p = resolveEventQuickCheckProfile('quick', { personaCount: 4, maxCompetitors: 2 });
    expect(p.personaCount).toBe(4);
    expect(p.maxCompetitors).toBe(2);
    expect(p.scanCompetitors).toBe(true);
    expect(p.requireCheckionProject).toBe(true);
  });

  it('clamps overrides to allowed ranges', () => {
    const p = resolveEventQuickCheckProfile('complete', { personaCount: 99, maxCompetitors: -3 });
    expect(p.personaCount).toBe(5);
    expect(p.maxCompetitors).toBe(0);
    expect(p.scanCompetitors).toBe(false);
  });

  it('resolves overrides from stored workflow result', () => {
    const p = resolveEventQuickCheckProfileFromStored({
      depth: 'complete',
      personaCount: 2,
      maxCompetitors: 1,
    });
    expect(p.depth).toBe('complete');
    expect(p.personaCount).toBe(2);
    expect(p.maxCompetitors).toBe(1);
  });

  it('keeps legacy constants aligned with quick profile', () => {
    expect(EVENT_QUICK_CHECK_PROFILES.quick.geoQuestionsPerPersona).toBe(3);
  });
});
