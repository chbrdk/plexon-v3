import { randomUUID } from 'crypto';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

/** Parse Hub/Canva tool JSON for oauth_required and build CTA blocks. */
export function buildMcpOauthRequiredBlocks(
  toolResultText: string,
  meta?: UiBlock['meta']
): UiBlock[] {
  let parsed: { error?: string; connectUrl?: string } | null = null;
  try {
    parsed = JSON.parse(toolResultText) as { error?: string; connectUrl?: string };
  } catch {
    return [];
  }
  if (parsed?.error !== 'oauth_required') return [];
  const blocks: UiBlock[] = [];
  const alert = createUiBlock(
    'alert',
    {
      title: 'Canva verbinden',
      message:
        'Für Canva-Tools musst du dein Canva-Konto einmal verbinden. Danach funktionieren Template-Liste, Export und Autofill.',
      tone: 'warning',
    },
    randomUUID(),
    meta
  );
  if (alert.ok) blocks.push(alert.block);
  const href = parsed.connectUrl?.startsWith('/')
    ? parsed.connectUrl
    : '/api/platform/mcp-hub/oauth/canva/start';
  const links = createUiBlock(
    'link_list',
    {
      title: 'Verbindung',
      links: [{ label: 'Canva verbinden', href, external: false }],
    },
    randomUUID(),
    meta
  );
  if (links.ok) blocks.push(links.block);
  return blocks;
}
