import { describe, expect, it } from 'vitest';
import {
  formatToolResultForAnthropic,
  isCreationScenePreviewToolName,
} from '@/lib/assistant/tool-result-multimodal';
import { classifyToolFamily } from '@/lib/assistant/tool-catalog';

describe('scene preview multimodal tool results', () => {
  it('classifies creation_scene_preview as creation_scene', () => {
    expect(classifyToolFamily('creation_scene_preview')).toBe('creation_scene');
    expect(isCreationScenePreviewToolName('creation_scene_preview')).toBe(true);
  });

  it('attaches Anthropic image block when pngBase64 present', () => {
    const raw = JSON.stringify({
      sceneId: 's1',
      pageId: 'p1',
      breakpoint: 'desktop',
      mimeType: 'image/jpeg',
      pngBase64: 'AAAABBBB',
      width: 960,
      height: 600,
    });
    const content = formatToolResultForAnthropic('creation_scene_preview', raw);
    expect(Array.isArray(content)).toBe(true);
    if (!Array.isArray(content)) throw new Error('expected array');
    expect(content[0]?.type).toBe('text');
    expect((content[0] as { text: string }).text).not.toContain('AAAABBBB');
    expect(content[1]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAABBBB' },
    });
  });

  it('omits oversized images as text soft-fail', () => {
    const raw = JSON.stringify({
      mimeType: 'image/jpeg',
      pngBase64: 'x'.repeat(500_000),
      sceneId: 's1',
    });
    const content = formatToolResultForAnthropic('creation_scene_preview', raw);
    expect(typeof content).toBe('string');
    expect(content).toContain('preview-too-large-for-vision');
    expect(content).not.toContain('xxxxx');
  });

  it('stays text-only when preview error is set', () => {
    const raw = JSON.stringify({
      error: 'preview-failed:browser missing',
      pngBase64: '',
      mimeType: 'image/jpeg',
    });
    const content = formatToolResultForAnthropic('creation_scene_preview', raw);
    expect(typeof content).toBe('string');
    expect(content).toContain('preview-failed');
  });
});
