import { randomUUID } from 'crypto';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_LIMITS } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export type BrandionTokenListRow = {
  path?: string | null;
  type?: string | null;
  status?: string | null;
  hex?: string | null;
  family?: string | null;
  weight?: string | null;
  value?: unknown;
};

export type BrandionTokenListPayload = {
  guidelineId?: string;
  guidelineName?: string | null;
  count?: number;
  tokens?: BrandionTokenListRow[];
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function leafLabel(path: string | null | undefined): string {
  if (!path?.trim()) return 'Token';
  const parts = path.trim().split('.');
  return parts[parts.length - 1] || path.trim();
}

function isHex(value: string | null | undefined): value is string {
  return Boolean(value && HEX_RE.test(value.trim()));
}

/** Parse MCP tool text/JSON into a tokens_list payload. */
export function parseBrandionTokensListPayload(raw: string): BrandionTokenListPayload | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const row = parsed as BrandionTokenListPayload;
    if (!Array.isArray(row.tokens)) return null;
    return row;
  } catch {
    return null;
  }
}

/**
 * Build color_swatch_grid / font_specimen_list from Brandion MCP tokens_list payload.
 * Skips rows without valid hex / family.
 */
export function buildBrandionTokenBlocks(
  payload: BrandionTokenListPayload,
  meta?: UiBlock['meta']
): UiBlock[] {
  const tokens = Array.isArray(payload.tokens) ? payload.tokens : [];
  const guidelineName =
    typeof payload.guidelineName === 'string' && payload.guidelineName.trim()
      ? payload.guidelineName.trim()
      : undefined;

  const colorItems = tokens
    .filter((t) => (t.type ?? '').toLowerCase() === 'color' || isHex(t.hex ?? null))
    .map((t) => {
      const hex = t.hex?.trim() ?? '';
      if (!isHex(hex)) return null;
      const path = typeof t.path === 'string' ? t.path.trim() : '';
      return {
        label: leafLabel(path) || hex,
        hex,
        ...(path ? { path } : {}),
      };
    })
    .filter((x): x is { label: string; hex: string; path?: string } => Boolean(x))
    .slice(0, UI_BLOCK_LIMITS.maxColorSwatches);

  const fontItems = tokens
    .filter((t) => (t.type ?? '').toLowerCase() === 'typography' || Boolean(t.family?.trim()))
    .map((t) => {
      const family = t.family?.trim() ?? '';
      if (!family) return null;
      const path = typeof t.path === 'string' ? t.path.trim() : '';
      const weight = t.weight?.trim() || undefined;
      return {
        label: leafLabel(path) || family,
        family,
        ...(weight ? { weight } : {}),
        sample: 'Ag The quick brown fox',
        ...(path ? { path } : {}),
      };
    })
    .filter(
      (x): x is { label: string; family: string; weight?: string; sample: string; path?: string } =>
        Boolean(x)
    )
    .slice(0, UI_BLOCK_LIMITS.maxFontSpecimens);

  const blocks: UiBlock[] = [];

  if (colorItems.length > 0) {
    const created = createUiBlock(
      'color_swatch_grid',
      {
        title: guidelineName ? `Farben · ${guidelineName}` : 'Farben',
        ...(guidelineName ? { guidelineName } : {}),
        items: colorItems,
      },
      randomUUID(),
      meta
    );
    if (created.ok) blocks.push(created.block);
  }

  if (fontItems.length > 0) {
    const created = createUiBlock(
      'font_specimen_list',
      {
        title: guidelineName ? `Schriften · ${guidelineName}` : 'Schriften',
        items: fontItems,
      },
      randomUUID(),
      meta
    );
    if (created.ok) blocks.push(created.block);
  }

  return blocks;
}

export function isBrandionTokensListToolName(name: string): boolean {
  const n = name.replace(/\./g, '_');
  return n === 'brandion_tokens_list';
}
