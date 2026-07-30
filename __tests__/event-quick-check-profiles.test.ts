import { describe, expect, it } from 'vitest';
import {
  EVENT_QUICK_CHECK_PROFILES,
  resolveEventQuickCheckProfile,
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

  it('keeps legacy constants aligned with quick profile', () => {
    expect(EVENT_QUICK_CHECK_PROFILES.quick.geoQuestionsPerPersona).toBe(3);
  });
});
