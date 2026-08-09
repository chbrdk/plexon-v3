import { describe, expect, it } from 'vitest';
import {
  allocatePersonasPerTargetGroup,
  EVENT_QUICK_CHECK_PROFILES,
  resolveEventQuickCheckProfile,
  resolveEventQuickCheckProfileFromStored,
} from '@/lib/paths/assistant-workflows';

describe('resolveEventQuickCheckProfile', () => {
  it('returns quick profile by default', () => {
    const p = resolveEventQuickCheckProfile();
    expect(p.depth).toBe('quick');
    expect(p.scanMaxPages).toBe(50);
    expect(p.targetGroupCount).toBe(1);
    expect(p.personaCount).toBe(1);
    expect(p.scanCompetitors).toBe(false);
  });

  it('returns complete profile with CHECKION project requirements', () => {
    const p = resolveEventQuickCheckProfile('complete');
    expect(p.depth).toBe('complete');
    expect(p.scanMaxPages).toBe(1000);
    expect(p.targetGroupCount).toBe(3);
    expect(p.personaCount).toBe(3);
    expect(p.scanCompetitors).toBe(true);
    expect(p.maxCompetitors).toBe(3);
    expect(p.requireCheckionProject).toBe(true);
  });

  it('applies independent overrides for pages, TGs, personas, competitors', () => {
    const p = resolveEventQuickCheckProfile('quick', {
      scanMaxPages: 120,
      targetGroupCount: 2,
      personaCount: 4,
      maxCompetitors: 2,
    });
    expect(p.scanMaxPages).toBe(120);
    expect(p.targetGroupCount).toBe(2);
    expect(p.personaCount).toBe(4);
    expect(p.maxCompetitors).toBe(2);
    expect(p.scanCompetitors).toBe(true);
    expect(p.requireCheckionProject).toBe(true);
  });

  it('clamps overrides to allowed ranges', () => {
    const p = resolveEventQuickCheckProfile('complete', {
      scanMaxPages: 99999,
      personaCount: 99,
      targetGroupCount: 0,
      maxCompetitors: -3,
    });
    expect(p.scanMaxPages).toBe(2000);
    expect(p.personaCount).toBe(5);
    expect(p.targetGroupCount).toBe(1);
    expect(p.maxCompetitors).toBe(0);
    expect(p.scanCompetitors).toBe(false);
  });

  it('resolves overrides from stored workflow result', () => {
    const p = resolveEventQuickCheckProfileFromStored({
      depth: 'complete',
      scanMaxPages: 250,
      targetGroupCount: 2,
      personaCount: 4,
      maxCompetitors: 1,
    });
    expect(p.depth).toBe('complete');
    expect(p.scanMaxPages).toBe(250);
    expect(p.targetGroupCount).toBe(2);
    expect(p.personaCount).toBe(4);
    expect(p.maxCompetitors).toBe(1);
  });

  it('falls back targetGroupCount to personaCount for legacy stored runs', () => {
    const p = resolveEventQuickCheckProfileFromStored({
      depth: 'complete',
      personaCount: 3,
    });
    expect(p.targetGroupCount).toBe(3);
    expect(p.personaCount).toBe(3);
  });

  it('keeps legacy constants aligned with quick profile', () => {
    expect(EVENT_QUICK_CHECK_PROFILES.quick.geoQuestionsPerPersona).toBe(3);
  });
});

describe('allocatePersonasPerTargetGroup', () => {
  it('distributes personas round-robin across target groups', () => {
    expect(allocatePersonasPerTargetGroup(3, 5)).toEqual([2, 2, 1]);
    expect(allocatePersonasPerTargetGroup(2, 1)).toEqual([1, 0]);
    expect(allocatePersonasPerTargetGroup(1, 3)).toEqual([3]);
  });
});
