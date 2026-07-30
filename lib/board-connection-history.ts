import type { Connection, Prismion, PrismionResultItem } from '@msqdx/react';

/**
 * Collects all card IDs that are "upstream" of the given card (connections
 * where the edge points TO the current card or to another upstream card).
 * Returns them in topological order (roots first) for use as chat history.
 *
 * Only considers the current `connections` list: when a connection is deleted,
 * it is no longer in the graph, so the disconnected branch is not included.
 * Example: A→B→C | D→E → submit from E gives only [D]; submit from C gives [A,B].
 * Add new prompt at C → only history from A,B,C (never D,E).
 */
export function getUpstreamCardIdsInOrder(
  cardId: string,
  connections: Connection[],
  prismionIds: Set<string>
): string[] {
  const upstream = new Set<string>();
  let frontier = new Set<string>([cardId]);
  while (frontier.size > 0) {
    const next = new Set<string>();
    for (const conn of connections) {
      // Only follow connections that point *towards* the current card (forward or no direction)
      if (conn.direction === 'backward') continue;
      const toId = conn.toPrismionId != null ? String(conn.toPrismionId) : '';
      const fromId = conn.fromPrismionId != null ? String(conn.fromPrismionId) : '';
      if (toId && frontier.has(toId) && fromId && prismionIds.has(fromId)) {
        if (!upstream.has(fromId)) {
          upstream.add(fromId);
          next.add(fromId);
        }
      }
    }
    frontier = next;
  }

  const nodes = Array.from(upstream);
  if (nodes.length === 0) return [];

  const nodeSet = new Set(nodes);
  const edges: { from: string; to: string }[] = connections.filter(
    (c) =>
      c.fromPrismionId &&
      c.toPrismionId &&
      nodeSet.has(c.fromPrismionId) &&
      nodeSet.has(c.toPrismionId)
  ).map((c) => ({ from: c.fromPrismionId, to: c.toPrismionId }));

  const inDegree = new Map<string, number>();
  for (const n of nodes) inDegree.set(n, 0);
  for (const { from, to } of edges) {
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => inDegree.get(n) === 0);
  const order: string[] = [];
  const outEdges = new Map<string, string[]>();
  for (const { from, to } of edges) {
    if (!outEdges.has(from)) outEdges.set(from, []);
    outEdges.get(from)!.push(to);
  }

  while (queue.length > 0) {
    const n = queue.shift()!;
    order.push(n);
    for (const m of outEdges.get(n) ?? []) {
      const d = (inDegree.get(m) ?? 1) - 1;
      inDegree.set(m, d);
      if (d === 0) queue.push(m);
    }
  }

  // Include any nodes not reached (e.g. cycles or disconnected) so we never drop upstream cards
  const orderSet = new Set(order);
  for (const n of nodes) {
    if (!orderSet.has(n)) order.push(n);
  }
  return order;
}

export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

function isPromptCard(id: string): boolean {
  return id === 'prompt-card' || id.startsWith('prompt-');
}

function isResultCard(id: string): boolean {
  return id.startsWith('result-');
}

/**
 * Builds chat history messages from an ordered list of card IDs (from
 * getUpstreamCardIdsInOrder). Prompt cards contribute one user message;
 * result cards contribute user (prompt) + assistant (result content).
 */
export function buildHistoryMessages(
  orderedCardIds: string[],
  prismions: Prismion[],
  prismionResults: Record<string, PrismionResultItem[]>
): HistoryMessage[] {
  const byId = new Map(prismions.map((p) => [p.id, p]));
  const out: HistoryMessage[] = [];

  for (const id of orderedCardIds) {
    const prismion = byId.get(id);
    if (!prismion) continue;

    const promptContent = (prismion.prompt ?? '').trim();

    if (isResultCard(id)) {
      out.push({ role: 'user', content: promptContent || '(no prompt)' });
      const items = prismionResults[id];
      const assistantContent = items
        ?.filter((i) => i.type === 'text' && i.content)
        .map((i) => (i as { content: string }).content)
        .join('\n\n')
        .trim();
      out.push({ role: 'assistant', content: assistantContent || '(no response)' });
    } else if (isPromptCard(id)) {
      out.push({ role: 'user', content: promptContent || '(no prompt)' });
    }
  }

  return out;
}
