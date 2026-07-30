import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-request-user';
import {
  normalizeMessageHistory,
  runOrchestratorComplete,
} from '@/lib/assistant/orchestrator-complete';

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  let body: { prompt?: string; messages?: unknown; useCheckionMcp?: boolean; useAudionMcp?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return NextResponse.json({ error: 'Missing or empty prompt' }, { status: 400 });
  }

  const useCheckionMcp = body.useCheckionMcp === true;
  const useAudionMcp = body.useAudionMcp === true;
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const history = normalizeMessageHistory(rawMessages);

  try {
    const result = await runOrchestratorComplete({
      apiKey,
      prompt,
      history,
      useCheckionMcp,
      useAudionMcp,
      maxToolRounds: 5,
      modelProfile: 'board',
    });
    return NextResponse.json({ text: result.text });
  } catch (e) {
    console.error('[board/complete]', e);
    return NextResponse.json({ error: 'Request failed', details: String(e) }, { status: 500 });
  }
}
