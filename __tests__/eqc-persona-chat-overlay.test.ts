import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(__dirname, '..');

describe('EqcPersonaChatOverlay (Wave C6 native)', () => {
  it('hosts PersonaChatWorkspace instead of Audion iframe', () => {
    const src = readFileSync(
      path.join(root, 'components/event-quick-check/EqcPersonaChatOverlay.tsx'),
      'utf8',
    );
    expect(src).toContain('PersonaChatWorkspace');
    expect(src).not.toContain('<iframe');
    expect(src).not.toContain('eqc-persona-chat-iframe');
    expect(src).toContain('guestMode={guestEmbed}');
    expect(src).toContain('eqc-persona-chat-open-audion');
  });

  it('gives Tavus video iframe min-height 80vh', () => {
    const css = readFileSync(
      path.join(root, 'components/persona-chat/persona-chat.css'),
      'utf8',
    );
    expect(css).toMatch(/\.plexon-tavus-video-panel iframe\s*\{[^}]*min-height:\s*80vh/s);
  });
});
