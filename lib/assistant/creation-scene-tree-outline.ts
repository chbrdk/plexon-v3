/**
 * Compact outline for CREATION scene_tree_index payloads.
 * Flat JSON arrays burn tokens and slow the next LLM round; an indented outline is enough to plan ops.
 */

export type SceneTreeIndexLike = {
  sceneId?: string;
  updatedAt?: string;
  activePageId?: string | null;
  nodeCount?: number;
  nodes?: Array<{
    id?: string;
    type?: string;
    name?: string;
    parentId?: string | null;
    index?: number;
    instanceOf?: string;
    childCount?: number;
  }>;
  pages?: Array<{ id?: string; name?: string }>;
  masters?: Array<{ id?: string; name?: string; sourceKey?: string }>;
};

const MAX_OUTLINE_CHARS = 12_000;
const MAX_NODES = 200;

export function formatSceneTreeOutline(raw: unknown): string | null {
  const index = parseTreePayload(raw);
  if (!index?.nodes?.length) return null;

  const byParent = new Map<string | null, typeof index.nodes>();
  for (const node of index.nodes) {
    if (!node?.id) continue;
    const key = node.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(node);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  }

  const lines: string[] = [
    `sceneId=${index.sceneId ?? '?'} updatedAt=${index.updatedAt ?? '?'} nodes=${index.nodeCount ?? index.nodes.length}`,
  ];
  if (index.activePageId) lines.push(`activePageId=${index.activePageId}`);
  if (index.pages?.length) {
    lines.push(
      `pages: ${index.pages
        .map((p) => `${p.name ?? p.id}[${p.id}]`)
        .join(', ')}`,
    );
  }

  let rendered = 0;
  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const node of children) {
      if (rendered >= MAX_NODES) {
        lines.push(`${'  '.repeat(depth)}… (+${(index.nodeCount ?? index.nodes!.length) - rendered} weitere)`);
        return;
      }
      const label = node.name?.trim() || node.type || 'node';
      const extra = [
        node.type && node.name ? node.type : null,
        node.instanceOf ? `of:${node.instanceOf}` : null,
        typeof node.childCount === 'number' && node.childCount > 0 ? `kids:${node.childCount}` : null,
      ]
        .filter(Boolean)
        .join(' ');
      lines.push(`${'  '.repeat(depth)}- ${label} [${node.id}]${extra ? ` ${extra}` : ''}`);
      rendered += 1;
      walk(node.id!, depth + 1);
      if (rendered >= MAX_NODES) return;
    }
  };
  walk(null, 0);

  if (index.masters?.length) {
    lines.push('masters:');
    for (const m of index.masters.slice(0, 40)) {
      lines.push(`- ${m.name ?? m.id} [${m.id}]${m.sourceKey ? ` ${m.sourceKey}` : ''}`);
    }
  }

  let text = lines.join('\n');
  if (text.length > MAX_OUTLINE_CHARS) {
    text = `${text.slice(0, MAX_OUTLINE_CHARS)}\n… [Tree-Outline gekürzt]`;
  }
  return text;
}

/** Prefer outline when tool result is scene tree JSON; otherwise return original. */
export function maybeCompactSceneTreeToolResult(toolName: string, result: string): string {
  if (!/creation_scene_tree_index$/.test(toolName) && toolName !== 'creation.scene_tree_index') {
    return result;
  }
  try {
    const parsed = JSON.parse(result) as unknown;
    const outline = formatSceneTreeOutline(parsed);
    return outline ?? result;
  } catch {
    return result;
  }
}

function parseTreePayload(raw: unknown): SceneTreeIndexLike | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  // MCP may wrap { content } or return the index directly
  if (Array.isArray(obj.nodes)) return obj as SceneTreeIndexLike;
  if (obj.data && typeof obj.data === 'object' && Array.isArray((obj.data as SceneTreeIndexLike).nodes)) {
    return obj.data as SceneTreeIndexLike;
  }
  return null;
}
