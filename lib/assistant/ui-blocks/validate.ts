import { UI_BLOCK_SCHEMAS } from '@/lib/assistant/ui-blocks/schemas';
import type { UiBlock, UiBlockType } from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_TYPES } from '@/lib/assistant/ui-blocks/types';

export function isUiBlockType(value: string): value is UiBlockType {
  return (UI_BLOCK_TYPES as readonly string[]).includes(value);
}

export function parseUiBlockProps(
  type: UiBlockType,
  props: unknown
): { ok: true; props: Record<string, unknown> } | { ok: false; error: string } {
  const schema = UI_BLOCK_SCHEMAS[type];
  const parsed = schema.safeParse(props);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, error: msg || 'Invalid props' };
  }
  return { ok: true, props: parsed.data as Record<string, unknown> };
}

export function createUiBlock(
  type: UiBlockType,
  props: unknown,
  id: string,
  meta?: UiBlock['meta']
): { ok: true; block: UiBlock } | { ok: false; error: string } {
  const validated = parseUiBlockProps(type, props);
  if (!validated.ok) return validated;
  return {
    ok: true,
    block: {
      id,
      type,
      props: validated.props,
      meta: { source: 'plexon_ui', ...meta },
    },
  };
}
