import { describe, expect, it } from 'vitest';
import { formatProjectCreatedMessage } from '@/lib/assistant/format-messages';
import { getAssistantCapabilitiesFallbackText } from '@/lib/assistant/capabilities-overview';

describe('assistant format messages', () => {
  it('formats project created message with markdown sections', () => {
    const text = formatProjectCreatedMessage({
      name: 'Acme',
      platformProjectId: 'pp-1',
      syncResults: [
        { productId: 'checkion', ok: true, externalProjectId: 'c-1' },
        { productId: 'audion', ok: true, externalProjectId: 'a-1' },
      ],
    });
    expect(text).toContain('## Projekt angelegt');
    expect(text).toContain('**Acme**');
    expect(text).toContain('**checkion**');
  });

  it('exposes capabilities fallback title', () => {
    expect(getAssistantCapabilitiesFallbackText()).toContain('PLEXON-Assistent');
  });
});
