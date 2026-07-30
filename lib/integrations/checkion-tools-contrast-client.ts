import { checkionApiToolsContrast } from '@/lib/paths/checkion-api';
import { fetchCheckionToolGet } from '@/lib/integrations/checkion-tools-client';

export type ContrastCheckPreview = {
  ratio: number;
  score: { aa: string; aaa: string; aaLarge: string; aaaLarge: string };
  foreground: string;
  background: string;
};

export type ContrastCheckResult =
  | { ok: true; data: ContrastCheckPreview }
  | { ok: false; error: string; missing?: Array<'foreground' | 'background'> };

export function normalizeHexColor(input: string): string {
  const trimmed = input.trim().replace(/^#/, '');
  return /^[a-fA-F0-9]{6}$/.test(trimmed) ? trimmed : '';
}

export async function fetchCheckionContrastCheck(input: {
  foreground: string;
  background: string;
}): Promise<ContrastCheckResult> {
  const f = normalizeHexColor(input.foreground);
  const b = normalizeHexColor(input.background);
  if (!f || !b) {
    return {
      ok: false,
      error: 'Zwei gültige Hex-Farben nötig (z. B. #000000 und #ffffff)',
      missing: !f ? ['foreground'] : ['background'],
    };
  }

  const result = await fetchCheckionToolGet<{ ratio: number; score: ContrastCheckPreview['score'] }>(
    checkionApiToolsContrast(f, b),
    'Kontrast'
  );
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    data: {
      ratio: result.data.ratio,
      score: result.data.score,
      foreground: f,
      background: b,
    },
  };
}
