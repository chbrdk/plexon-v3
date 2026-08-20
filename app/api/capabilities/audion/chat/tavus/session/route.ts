import { NextResponse } from 'next/server';
import { fetchAudionPlatform } from '@/lib/integrations/audion-platform-proxy';
import { audionPlatformChatTavusSession } from '@/lib/paths/audion-chat-api';

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await fetchAudionPlatform(
    audionPlatformChatTavusSession(),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    { serviceAuth: false },
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  });
}

export async function DELETE(request: Request) {
  const body = await request.text();
  const upstream = await fetchAudionPlatform(
    audionPlatformChatTavusSession(),
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    { serviceAuth: false },
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  });
}
