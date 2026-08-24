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

/**
 * Soft cap for Vision attach (~300KB binary ≈ 400k base64).
 * Larger payloads caused assistant SSE / proxy "network error" on long Creation turns.
 */
const MAX_IMAGE_BASE64_CHARS = 450_000;

export function isCreationScenePreviewToolName(toolName: string): boolean {
  return (
    PREVIEW_TOOL.test(toolName) ||
    toolName === 'creation.scene_preview' ||
    toolName === 'creation_scene_preview'
  );
}

/**
 * If the tool result is a scene_preview image payload, return multimodal content.
 * Otherwise return the (already truncated) text string.
 * Never echo raw base64 into the text summary (SSE-safe).
 */
export function formatToolResultForAnthropic(
  toolName: string,
  truncatedText: string,
): AnthropicToolResultContent {
  if (!isCreationScenePreviewToolName(toolName)) return truncatedText;

  try {
    const parsed = JSON.parse(truncatedText) as {
      pngBase64?: string
      imageBase64?: string
      mimeType?: string
      error?: string
      sceneId?: string
      pageId?: string
      breakpoint?: string
      width?: number
      height?: number
    };
    const data = parsed.pngBase64 || parsed.imageBase64 || '';
    if (parsed.error || !data || !parsed.mimeType?.startsWith('image/')) {
      // Strip any accidental base64 from error payloads before returning as text.
      return JSON.stringify({
        error: parsed.error || 'preview-missing-image',
        sceneId: parsed.sceneId,
        pageId: parsed.pageId,
        breakpoint: parsed.breakpoint,
        note: 'Pixel QA skipped — rely on creation_scene_content_audit; do not claim Vision ran.',
      });
    }
    if (data.length > MAX_IMAGE_BASE64_CHARS) {
      return JSON.stringify({
        sceneId: parsed.sceneId,
        pageId: parsed.pageId,
        breakpoint: parsed.breakpoint,
        width: parsed.width,
        height: parsed.height,
        error: 'preview-too-large-for-vision',
        note: 'Image omitted — finish with content_audit only; do not claim pixels were checked.',
      });
    }
    const summary = {
      sceneId: parsed.sceneId,
      pageId: parsed.pageId,
      breakpoint: parsed.breakpoint,
      width: parsed.width,
      height: parsed.height,
      mimeType: parsed.mimeType,
      note: 'Image attached — Vision-check hierarchy, CTAs, seed leftovers, contrast. Max 1 more preview after fixes.',
    };
    return [
      { type: 'text', text: JSON.stringify(summary) },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: parsed.mimeType,
          data,
        },
      },
    ];
  } catch {
    return truncatedText.length > 2_000
      ? truncatedText.slice(0, 2_000) + '…[preview payload truncated]'
      : truncatedText;
  }
}
