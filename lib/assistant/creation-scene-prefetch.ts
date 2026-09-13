import { callCheckionMcpTool } from '@/lib/checkion-mcp-client';
import { getCreationMcpUrl, getSpirionMcpUrl } from '@/lib/constants';
import { formatSceneTreeOutline } from '@/lib/assistant/creation-scene-tree-outline';
import {
  hasCreationEditorSceneContext,
} from '@/lib/assistant/scene-write-intent';
import type { AssistantPageContext } from '@/lib/assistant/page-context';

export type CreationScenePrefetchHit = {
  toolName: string;
  preview: string;
};

/**
 * Prefetch compact scene tree + palette + craft-debug (+ Spirion captures)
 * so the model can plan without burning early LLM rounds on discovery.
 * Spec: specs/domain/assistant-creation-mcp.md § Latency
 */
export async function prefetchCreationSceneTreeBlock(input: {
  pageContext?: AssistantPageContext | null;
  actorUserId: string;
  useCreationMcp: boolean;
  useSpirionMcp?: boolean;
}): Promise<{ block: string; hits: CreationScenePrefetchHit[] } | null> {
  if (!input.useCreationMcp) return null;
  if (!hasCreationEditorSceneContext(input.pageContext)) return null;
  const mcpUrl = getCreationMcpUrl();
  const sceneId = input.pageContext?.entityId?.trim();
  if (!mcpUrl || !sceneId) return null;

  const actor = {
    sceneId,
    actorUserId: input.actorUserId,
    actorLabel: 'plexon-assistant-prefetch',
  };

  const hits: CreationScenePrefetchHit[] = [];
  const sections: string[] = [];

  const [treeRaw, paletteRaw, craftRaw, spirionRaw] = await Promise.all([
    callCheckionMcpTool(mcpUrl, 'creation.scene_tree_index', actor).catch((err: unknown) => {
      console.warn('[creation-scene-prefetch] tree failed', err);
      return null;
    }),
    callCheckionMcpTool(mcpUrl, 'creation.editor_palette', {
      actorUserId: input.actorUserId,
      actorLabel: 'plexon-assistant-prefetch',
    }).catch((err: unknown) => {
      console.warn('[creation-scene-prefetch] palette failed', err);
      return null;
    }),
    callCheckionMcpTool(mcpUrl, 'creation.scene_craft_debug', actor).catch((err: unknown) => {
      console.warn('[creation-scene-prefetch] craft-debug failed', err);
      return null;
    }),
    input.useSpirionMcp && getSpirionMcpUrl()
      ? callCheckionMcpTool(getSpirionMcpUrl()!, 'spirion.captures_list', {
          limit: 12,
        }).catch((err: unknown) => {
          console.warn('[creation-scene-prefetch] spirion captures failed', err);
          return null;
        })
      : Promise.resolve(null),
  ]);

  if (treeRaw) {
    hits.push({ toolName: 'creation_scene_tree_index', preview: 'prefetch outline' });
    let outline: string | null = null;
    try {
      outline = formatSceneTreeOutline(JSON.parse(treeRaw));
    } catch {
      outline = formatSceneTreeOutline(treeRaw);
    }
    if (!outline) {
      sections.push(
        [
          '## Scene-Tree (prefetch)',
          'Tree-Index konnte nicht als Outline gelesen werden — bei Bedarf creation_scene_tree_index erneut aufrufen.',
          treeRaw.slice(0, 2000),
        ].join('\n'),
      );
    } else {
      sections.push(
        [
          '## Scene-Tree (prefetch)',
          'Bereits geladen — creation_scene_tree_index nur erneut aufrufen wenn updatedAt abweicht oder die Outline unzureichend ist.',
          '```',
          outline,
          '```',
        ].join('\n'),
      );
    }
  }

  if (paletteRaw) {
    hits.push({ toolName: 'creation_editor_palette', preview: 'prefetch types' });
    sections.push(['## Palette (prefetch)', compactPalette(paletteRaw)].join('\n'));
  }

  if (craftRaw) {
    hits.push({ toolName: 'creation_scene_craft_debug', preview: 'prefetch craft' });
    sections.push(['## Craft-Debug (prefetch)', compactJson(craftRaw, 1800)].join('\n'));
  }

  if (spirionRaw) {
    hits.push({ toolName: 'spirion_captures_list', preview: 'prefetch captures' });
    sections.push(
      [
        '## Spirion Captures (prefetch)',
        'Library-Pfad — **kein** platformProjectId. 1–2 Captures → spirion_capture_prompt_pack.',
        compactCaptures(spirionRaw),
      ].join('\n'),
    );
  }

  if (!sections.length) return null;
  return { block: sections.join('\n\n'), hits };
}

function compactJson(raw: string, max: number): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const text = JSON.stringify(parsed);
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return raw.slice(0, max);
  }
}

function compactPalette(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      groups?: Array<{ id?: string; types?: Array<{ type?: string; contentHint?: string }> }>;
    };
    const types: string[] = [];
    for (const group of parsed.groups ?? []) {
      for (const t of group.types ?? []) {
        if (!t.type) continue;
        types.push(t.contentHint ? `${t.type}: ${t.contentHint}` : t.type);
      }
    }
    if (!types.length) return compactJson(raw, 1200);
    return ['Site-Kit/Insert-Typen (contentHint). Seed-Props überschreiben.', ...types.slice(0, 40)].join(
      '\n- ',
    );
  } catch {
    return compactJson(raw, 1200);
  }
}

function compactCaptures(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      captures?: Array<{ id?: string; title?: string; name?: string }>;
    };
    const rows = (parsed.captures ?? [])
      .slice(0, 12)
      .map((c) => `${c.id ?? '?'} ${c.title || c.name || ''}`.trim());
    if (!rows.length) return compactJson(raw, 800);
    return rows.join('\n');
  } catch {
    return compactJson(raw, 800);
  }
}
