import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import {
  buildProductCreatedLinks,
  type ProductCreatedTarget,
} from '@/lib/assistant/ui-blocks/product-links';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export type ProductCreatedLayoutInput = {
  product: ProductCreatedTarget;
  name: string;
  projectId: string;
  domain?: string | null;
  error?: string | null;
};

const PRODUCT_LABELS: Record<ProductCreatedTarget, string> = {
  audion: 'AUDION',
  checkion: 'CHECKION',
};

export function buildProductCreatedLayout(input: ProductCreatedLayoutInput): UiLayout {
  const blocks: UiLayout['blocks'] = [];
  const productLabel = PRODUCT_LABELS[input.product];

  const kv = createUiBlock(
    'key_value_list',
    {
      title: `Projekt in ${productLabel}`,
      items: [
        { label: 'Name', value: input.name },
        { label: 'Produkt', value: productLabel },
        { label: 'Projekt-ID', value: input.projectId },
        ...(input.domain ? [{ label: 'Domain', value: input.domain }] : []),
      ],
    },
    randomUUID()
  );
  if (kv.ok) blocks.push(kv.block);

  const links = buildProductCreatedLinks({ product: input.product, projectId: input.projectId });
  const linkBlock = createUiBlock(
    'link_list',
    { title: 'Öffnen', links },
    randomUUID()
  );
  if (linkBlock.ok) blocks.push(linkBlock.block);

  if (input.error?.trim()) {
    const alert = createUiBlock(
      'alert',
      { title: 'Hinweis', message: input.error.trim(), tone: 'error' },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
