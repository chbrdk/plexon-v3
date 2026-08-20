import { describe, expect, it } from 'vitest';
import {
  API_AUDION_CHAT_STREAM,
  API_AUDION_CHAT_TAVUS_SESSION,
  apiAudionChatToolDecision,
  apiAudionSharePersona,
  audionPlatformChatStream,
  audionPlatformSharePersona,
} from '@/lib/paths/audion-chat-api';

describe('audion-chat-api paths (Wave C6)', () => {
  it('exposes same-origin BFF routes', () => {
    expect(API_AUDION_CHAT_STREAM).toBe('/api/capabilities/audion/chat/stream');
    expect(API_AUDION_CHAT_TAVUS_SESSION).toBe('/api/capabilities/audion/chat/tavus/session');
    expect(apiAudionSharePersona('persona-a', 'proj-b')).toBe(
      '/api/capabilities/audion/share/personas/persona-a?projectId=proj-b',
    );
    expect(apiAudionChatToolDecision('call-1')).toBe(
      '/api/capabilities/audion/chat/tool-call/decision/call-1',
    );
  });

  it('maps audion platform proxy targets', () => {
    expect(audionPlatformChatStream()).toBe('/chat/stream');
    expect(audionPlatformSharePersona('p1', 'pr1')).toBe('/share/personas/p1?projectId=pr1');
  });
});
