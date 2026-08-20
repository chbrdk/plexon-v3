import { NextResponse } from 'next/server';
import { fetchAudionPlatform } from '@/lib/integrations/audion-platform-proxy';
import { audionPlatformSharePersona } from '@/lib/paths/audion-chat-api';

type Params = { params: Promise<{ personaId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { personaId } = await params;
  const projectId = new URL(request.url).searchParams.get('projectId')?.trim() ?? '';
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const upstream = await fetchAudionPlatform(
    audionPlatformSharePersona(personaId, projectId),
    { method: 'GET' },
    { serviceAuth: false },
  );
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  });
}
