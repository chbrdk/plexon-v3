import { describe, expect, it } from 'vitest';
import {
  extractContrastHexPair,
  extractScanIdFromHistory,
  extractScanIdFromText,
} from '@/lib/assistant/conversation-context';

describe('conversation-context scan helpers', () => {
  it('extracts scan id from labeled text', () => {
    expect(extractScanIdFromText('Scan-ID: 550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('extracts scan id from assistant metadata', () => {
    const id = '660e8400-e29b-41d4-a716-446655440001';
    const history = [
      {
        role: 'assistant' as const,
        content: 'Scan fertig',
        metadata: {
          uiLayout: {
            blocks: [
              {
                type: 'key_value_list',
                props: {
                  items: [{ label: 'Scan-ID', value: id }],
                },
              },
            ],
          },
        },
      },
    ];
    expect(extractScanIdFromHistory(history, 'fasse den scan zusammen')).toBe(id);
  });

  it('extracts contrast hex pair', () => {
    expect(extractContrastHexPair('Kontrast #000000 und #ffffff')).toEqual({
      foreground: '000000',
      background: 'ffffff',
    });
  });
});
