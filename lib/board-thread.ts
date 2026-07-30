import type { Connection, Prismion } from '@msqdx/react';
import { getUpstreamCardIdsInOrder } from './board-connection-history';

/** Map: child prismion id -> parent prismion id. Used for explicit nesting. */
export type ParentByPrismionId = Record<string, string>;

/** Tool cards (e.g. CHECKION MCP) are not thread roots. */
function isToolCard(id: string, prismions: Prismion[]): boolean {
  const p = prismions.find((x) => x.id === id);
  return (p as Prismion & { kind?: string })?.kind === 'tool';
}

/** Prompt cards that can act as thread roots. */
export function isPromptCard(id: string): boolean {
  return id === 'prompt-card' || id.startsWith('prompt-');
}

/** Result cards (part of a thread). */
export function isResultCard(id: string): boolean {
  return id.startsWith('result-');
}

/** Card is a thread member (result or follow-up prompt), not a root or tool. */
function isThreadMember(id: string, prismions: Prismion[]): boolean {
  if (isToolCard(id, prismions)) return false;
  return isResultCard(id) || isPromptCard(id);
}

/**
 * Returns the thread root id for the given card: the first prompt card when
 * walking upstream. Returns null if the card is itself a root or has no
 * prompt upstream (e.g. tool-only chain). Tool cards are skipped.
 */
export function getThreadRootId(
  cardId: string,
  connections: Connection[],
  prismionIds: Set<string>,
  prismions?: Prismion[]
): string | null {
  const upstream = getUpstreamCardIdsInOrder(cardId, connections, prismionIds);
  const list = prismions ?? [];
  for (const id of upstream) {
    if (isToolCard(id, list)) continue;
    if (isPromptCard(id)) return id;
  }
  return null;
}

/** Find the single next card id connected from fromId (forward direction). Used for legacy chain walk. */
function nextInChain(
  fromId: string,
  connections: Connection[],
  prismionIds: Set<string>
): string | null {
  for (const conn of connections) {
    if (conn.direction === 'backward') continue;
    const from = conn.fromPrismionId != null ? String(conn.fromPrismionId) : '';
    const to = conn.toPrismionId != null ? String(conn.toPrismionId) : '';
    if (from === fromId && to && prismionIds.has(to)) return to;
  }
  return null;
}

/**
 * Returns direct child card IDs of rootId in order: (resultcard)+(weitere promptcard).
 * Nesting: (promptcard (resultcard)+(weitere promptcard (resultcard)+(weitere promptcard))).
 * Collects all connections from rootId → X, filters to thread members, then sorts:
 * result cards first, then prompt cards (by connection order / id).
 */
export function getThreadChildrenInOrder(
  rootId: string,
  connections: Connection[],
  prismions: Prismion[]
): string[] {
  const prismionIds = new Set(prismions.map((p) => p.id));
  const directTargets: string[] = [];
  const seen = new Set<string>();
  for (const conn of connections) {
    if (conn.direction === 'backward') continue;
    const from = conn.fromPrismionId != null ? String(conn.fromPrismionId) : '';
    const to = conn.toPrismionId != null ? String(conn.toPrismionId) : '';
    if (from !== rootId || !to || !prismionIds.has(to) || seen.has(to)) continue;
    if (!isThreadMember(to, prismions)) continue;
    seen.add(to);
    directTargets.push(to);
  }
  if (directTargets.length <= 1) return directTargets;
  // Order: result cards first, then prompt cards (resultcard)+(weitere promptcard)
  const results = directTargets.filter((id) => isResultCard(id));
  const prompts = directTargets.filter((id) => isPromptCard(id));
  return [...results, ...prompts];
}

/**
 * Returns the thread root id by walking the parent chain. Root has no parent.
 */
export function getThreadRootIdFromParent(
  cardId: string,
  parentByPrismionId: ParentByPrismionId
): string {
  let current: string = cardId;
  while (parentByPrismionId[current]) {
    current = parentByPrismionId[current];
  }
  return current;
}

/**
 * Returns direct child card IDs of rootId from the parent map, in order:
 * (resultcard)+(weitere promptcard). Use for nesting when parentByPrismionId is the source of truth.
 */
export function getChildrenInOrder(
  rootId: string,
  parentByPrismionId: ParentByPrismionId,
  prismions: Prismion[]
): string[] {
  const byParent = prismions.filter(
    (p) => (p as Prismion & { kind?: string }).kind !== 'tool' && parentByPrismionId[p.id] === rootId
  );
  const results = byParent.filter((p) => isResultCard(p.id));
  const prompts = byParent.filter((p) => isPromptCard(p.id));
  return [...results, ...prompts].map((p) => p.id);
}

/**
 * Returns all descendant card IDs of rootId in conversation order (flat):
 * for each "turn", result(s) first, then the follow-up prompt; recursively.
 * Example: root → [result1, prompt2], prompt2 → [result2, prompt3]
 *   → [result1, prompt2, result2, prompt3].
 */
export function getThreadSequenceFlattened(
  rootId: string,
  parentByPrismionId: ParentByPrismionId,
  prismions: Prismion[]
): string[] {
  const direct = getChildrenInOrder(rootId, parentByPrismionId, prismions);
  const out: string[] = [];
  for (const cid of direct) {
    out.push(cid);
    if (isPromptCard(cid)) {
      out.push(...getThreadSequenceFlattened(cid, parentByPrismionId, prismions));
    }
  }
  return out;
}

/**
 * Same as getThreadSequenceFlattened but using connections instead of parentByPrismionId.
 * Use when parent map is not the source of truth (e.g. legacy boards).
 */
export function getThreadSequenceFlattenedFromConnections(
  rootId: string,
  connections: Connection[],
  prismions: Prismion[]
): string[] {
  const direct = getThreadChildrenInOrder(rootId, connections, prismions);
  const out: string[] = [];
  for (const cid of direct) {
    out.push(cid);
    if (isPromptCard(cid)) {
      out.push(...getThreadSequenceFlattenedFromConnections(cid, connections, prismions));
    }
  }
  return out;
}
