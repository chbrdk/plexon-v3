import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import type { AudionProbeResult } from '@/lib/integrations/audion-connectivity';
import type { CheckionProbeResult } from '@/lib/integrations/checkion-connectivity';

export type SyncDiagnoseInput = {
  checkion: CheckionProbeResult;
  audion: AudionProbeResult;
  platformProjectId?: string | null;
  checkionProjectId?: string | null;
  audionProjectId?: string | null;
  retryMessage?: string | null;
};

export function buildSyncDiagnoseLayout(input: SyncDiagnoseInput): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const items = [
    {
      label: 'CHECKION API',
      value: input.checkion.ok ? `✓ (${input.checkion.status ?? 'ok'})` : `✗ ${input.checkion.hint ?? 'fehlgeschlagen'}`,
    },
    {
      label: 'AUDION API',
      value: input.audion.ok
        ? `✓ (${input.audion.status ?? 'ok'})`
        : `✗ ${input.audion.hint ?? 'fehlgeschlagen'}`,
    },
  ];
  if (input.platformProjectId) {
    items.push({ label: 'Plattform-Projekt', value: input.platformProjectId });
  }
  if (input.checkionProjectId) {
    items.push({ label: 'CHECKION Binding', value: input.checkionProjectId });
  } else if (input.platformProjectId) {
    items.push({ label: 'CHECKION Binding', value: '—' });
  }
  if (input.audionProjectId) {
    items.push({ label: 'AUDION Binding', value: input.audionProjectId });
  } else if (input.platformProjectId) {
    items.push({ label: 'AUDION Binding', value: '—' });
  }

  const kv = createUiBlock('key_value_list', { title: 'Sync-Diagnose', items }, randomUUID());
  if (kv.ok) blocks.push(kv.block);

  const hints: string[] = [];
  if (!input.checkion.ok && input.checkion.hint) hints.push(`CHECKION: ${input.checkion.hint}`);
  if (!input.audion.ok && input.audion.hint) hints.push(`AUDION: ${input.audion.hint}`);
  if (input.retryMessage) hints.push(input.retryMessage);

  if (hints.length > 0) {
    const alert = createUiBlock(
      'alert',
      {
        title: 'Empfehlung',
        message: hints.join('\n\n'),
        tone: input.checkion.ok && input.audion.ok ? 'info' : 'warning',
      },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
