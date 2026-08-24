import { callCheckionMcpTool } from '@/lib/checkion-mcp-client';
import { getCreationMcpUrl } from '@/lib/constants';
import { formatSceneTreeOutline } from '@/lib/assistant/creation-scene-tree-outline';
import {
  hasCreationEditorSceneContext,
} from '@/lib/assistant/scene-write-intent';
import type { AssistantPageContext } from '@/lib/assistant/page-context';

/**
 * Prefetch compact scene tree for CREATION editor turns so the model can plan ops
 * without a full tool round for creation_scene_tree_index.
 */
export async function prefetchCreationSceneTreeBlock(input: {
  pageContext?: AssistantPageContext | null;
  actorUserId: string;
  useCreationMcp: boolean;
}): Promise<string | null> {
  if (!input.useCreationMcp) return null;
  if (!hasCreationEditorSceneContext(input.pageContext)) return null;
  const mcpUrl = getCreationMcpUrl();
  const sceneId = input.pageContext?.entityId?.trim();
  if (!mcpUrl || !sceneId) return null;

  try {
    const raw = await callCheckionMcpTool(mcpUrl, 'creation.scene_tree_index', {
      sceneId,
      actorUserId: input.actorUserId,
      actorLabel: 'plexon-assistant-prefetch',
    });
    let outline: string | null = null;
    try {
      outline = formatSceneTreeOutline(JSON.parse(raw));
    } catch {
      outline = formatSceneTreeOutline(raw);
    }
    if (!outline) {
      return [
        '## Scene-Tree (prefetch)',
        'Tree-Index konnte nicht als Outline gelesen werden — bei Bedarf creation_scene_tree_index erneut aufrufen.',
        raw.slice(0, 2000),
      ].join('\n');
    }
    return [
      '## Scene-Tree (prefetch)',
      'Bereits geladen — creation_scene_tree_index nur erneut aufrufen wenn updatedAt abweicht oder die Outline unzureichend ist.',
      '```',
      outline,
      '```',
    ].join('\n');
  } catch (err) {
    console.warn('[creation-scene-prefetch] failed', err);
    return null;
  }
}
