/**
 * Turn MCP tool JSON into Anthropic tool_result content (text or multimodal).
 * Spec: creation scene-preview.md — Vision self-check.
 */
export type AnthropicToolResultPart =
  | { type: 'text'; text: string }
  | {
      type: 'image'
      source: { type: 'base64'; media_type: string; data: string }
    };

export type AnthropicToolResultContent = string | AnthropicToolResultPart[];

const PREVIEW_TOOL =
  /(?:^|_)creation_scene_preview$/i;

/** Max base64 chars to attach (~3MB binary ≈ 4M chars — keep under Anthropic image limits). */
const MAX_PNG_BASE64_CHARS = 3_500_000;

export function isCreationScenePreviewToolName(toolName: string): boolean {
  return (
    PREVIEW_TOOL.test(toolName) ||
    toolName === 'creation.scene_preview' ||
    toolName === 'creation_scene_preview'
  );
}

/**
 * If the tool result is a scene_preview PNG payload, return multimodal content.
 * Otherwise return the (already truncated) text string.
 */
export function formatToolResultForAnthropic(
  toolName: string,
  truncatedText: string,
): AnthropicToolResultContent {
  if (!isCreationScenePreviewToolName(toolName)) return truncatedText;

  try {
    const parsed = JSON.parse(truncatedText) as {
      pngBase64?: string
      mimeType?: string
      error?: string
      sceneId?: string
      pageId?: string
      breakpoint?: string
      width?: number
      height?: number
    };
    if (parsed.error || !parsed.pngBase64 || !parsed.mimeType?.startsWith('image/')) {
      return truncatedText;
    }
    if (parsed.pngBase64.length > MAX_PNG_BASE64_CHARS) {
      return JSON.stringify({
        ...parsed,
        pngBase64: undefined,
        error: 'preview-too-large-for-vision',
        note: 'PNG omitted — re-run with smaller viewport or fix layout',
      });
    }
    const summary = {
      sceneId: parsed.sceneId,
      pageId: parsed.pageId,
      breakpoint: parsed.breakpoint,
      width: parsed.width,
      height: parsed.height,
      mimeType: parsed.mimeType,
      note: 'PNG attached as image — Vision-check hierarchy, CTAs, seed leftovers, contrast.',
    };
    return [
      { type: 'text', text: JSON.stringify(summary) },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: parsed.mimeType,
          data: parsed.pngBase64,
        },
      },
    ];
  } catch {
    return truncatedText;
  }
}
