import { describe, expect, it } from 'vitest';
import {
  createGuestSessionId,
  GUEST_CHAT_MAX_CHARS,
  GUEST_CHAT_MAX_USER_TURNS,
  resolveGuestSessionId,
} from '@/lib/persona-chat/guest-session';

describe('persona-chat guest session (Wave C6)', () => {
  it('creates stable-format guest ids', () => {
    const id = createGuestSessionId();
    expect(id.startsWith('g_')).toBe(true);
    expect(id.length).toBeGreaterThan(8);
  });

  it('prefers body over cookie on server resolver', () => {
    expect(resolveGuestSessionId('cookie-id', 'body-id')).toBe('body-id');
    expect(resolveGuestSessionId('cookie-id', null)).toBe('cookie-id');
    const fresh = resolveGuestSessionId(null, null);
    expect(fresh.startsWith('g_')).toBe(true);
  });

  it('documents guest budget constants aligned with Audion', () => {
    expect(GUEST_CHAT_MAX_USER_TURNS).toBe(5);
    expect(GUEST_CHAT_MAX_CHARS).toBe(800);
  });
});
