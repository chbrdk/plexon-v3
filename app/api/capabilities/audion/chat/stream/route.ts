import { NextResponse } from 'next/server';
import type { ChatSendPayload } from '@audion-v3/contracts';
import {
  extractSetCookieValue,
  fetchAudionPlatform,
  readRequestCookie,
} from '@/lib/integrations/audion-platform-proxy';
import {
  audionPlatformChatStream,
} from '@/lib/paths/audion-chat-api';
import {
  GUEST_CHAT_TTL_SEC,
  PLEXON_GUEST_CHAT_COOKIE,
  resolveGuestSessionId,
} from '@/lib/persona-chat/guest-session';

export async function POST(request: Request) {
  let body: ChatSendPayload;
  try {
    body = (await request.json()) as ChatSendPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const personaId = body?.personaId?.trim() ?? '';
  const projectId = body?.projectId?.trim() ?? '';
  const cookieSession = readRequestCookie(request, PLEXON_GUEST_CHAT_COOKIE);
  const guestSessionId = resolveGuestSessionId(cookieSession, body.guestSessionId);
  const payload: ChatSendPayload = {
    ...body,
    guestSessionId,
  };

  const upstream = await fetchAudionPlatform(
    audionPlatformChatStream(),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
        Cookie: `${PLEXON_GUEST_CHAT_COOKIE}=${encodeURIComponent(guestSessionId)}`,
      },
      body: JSON.stringify(payload),
    },
    { serviceAuth: false },
  );

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/x-ndjson; charset=utf-8');
  headers.set('Cache-Control', 'no-store');

  const guestRemaining = upstream.headers.get('X-Audion-Guest-Remaining');
  if (guestRemaining) headers.set('X-Audion-Guest-Remaining', guestRemaining);

  const audionCookie = extractSetCookieValue(upstream.headers.get('set-cookie'), PLEXON_GUEST_CHAT_COOKIE);
  const sessionToSet = audionCookie || guestSessionId;
  headers.set('X-Plexon-Guest-Session', sessionToSet);
  headers.append(
    'Set-Cookie',
    `${PLEXON_GUEST_CHAT_COOKIE}=${encodeURIComponent(sessionToSet)}; Path=/; Max-Age=${GUEST_CHAT_TTL_SEC}; SameSite=Lax`,
  );

  if (!upstream.ok) {
    const errBody = await upstream.text();
    try {
      return NextResponse.json(JSON.parse(errBody), { status: upstream.status, headers });
    } catch {
      return new NextResponse(errBody, { status: upstream.status, headers });
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
