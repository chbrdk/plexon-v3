/**
 * Collection invite token + redirect helpers (unit).
 */

import { describe, expect, it } from 'vitest';
import {
  generateCollectionInviteToken,
  hashCollectionInviteToken,
} from '@/lib/collection-invite-token';
import { buildCreationInviteRedirectUrl } from '@/lib/collection-invite-redirect';

describe('collection invite token', () => {
  it('generates inv_ prefixed tokens', () => {
    const token = generateCollectionInviteToken();
    expect(token.startsWith('inv_')).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });

  it('hashes deterministically', () => {
    const a = hashCollectionInviteToken('inv_abc');
    const b = hashCollectionInviteToken('inv_abc');
    expect(a).toBe(b);
    expect(a).not.toBe('inv_abc');
  });
});

describe('collection invite redirect', () => {
  it('builds editor deep link when sceneId present', () => {
    const url = buildCreationInviteRedirectUrl('https://creation.example', {
      platformProjectId: 'col-1',
      sceneId: 'scene-9',
    });
    expect(url).toContain('/editor?');
    expect(url).toContain('sceneId=scene-9');
    expect(url).toContain('platformProjectId=col-1');
  });

  it('falls back to projects launch without sceneId', () => {
    const url = buildCreationInviteRedirectUrl('https://creation.example/', {
      platformProjectId: 'col-1',
    });
    expect(url).toBe('https://creation.example/projects?platformProjectId=col-1');
  });
});
