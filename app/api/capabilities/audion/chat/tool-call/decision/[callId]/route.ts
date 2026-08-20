import { NextResponse } from 'next/server';
import { fetchAudionPlatform } from '@/lib/integrations/audion-platform-proxy';
import { audionPlatformChatToolDecision } from '@/lib/paths/audion-chat-api';

type Params = { params: Promise<{ callId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { callId } = await params;
  const body = await request.text();
  const upstream = await fetchAudionPlatform(audionPlatformChatToolDecision(callId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body,
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return new NextResponse(text, { status: upstream.status });
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
