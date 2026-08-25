import { describe, expect, it } from 'vitest';
import {
  EDITORIAL_LANDING_FALLBACK_LABEL,
  buildEditorialLandingFallbackBrief,
} from '@/lib/assistant/editorial-landing-fallback';
import { buildCreationSceneDepthPromptBlock } from '@/lib/assistant/creation-scene-depth';

describe('editorial landing fallback', () => {
  it('names Linear / Verve / Superhuman in the label', () => {
    expect(EDITORIAL_LANDING_FALLBACK_LABEL).toContain('Linear');
    expect(EDITORIAL_LANDING_FALLBACK_LABEL).toContain('Verve');
    expect(EDITORIAL_LANDING_FALLBACK_LABEL).toContain('Superhuman');
  });

  it('requires flex row sections in the brief', () => {
    const brief = buildEditorialLandingFallbackBrief();
    expect(brief).toContain('flex-direction:row');
    expect(brief).toContain('grid-template-columns:repeat(3,1fr)');
    expect(brief).toContain('creation_scene_import_html');
    expect(brief).toMatch(/Hex-Literale|kein `var\(--/);
  });

  it('is embedded in creation scene depth prompt as last resort after captures', () => {
    const block = buildCreationSceneDepthPromptBlock(true);
    expect(block).toContain(EDITORIAL_LANDING_FALLBACK_LABEL);
    expect(block).toContain('spirion_captures_list');
    expect(block).toContain('spirion_capture_prompt_pack');
    expect(block).toContain('Spirion Library leer');
  });
});
