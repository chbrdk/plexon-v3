/**
 * Plexon-owned board domain types (no `@msqdx/react` alias).
 * Sourced from sibling msqdx-design-system prismion types + local result union.
 */
export type {
  Prismion,
  Board,
  Connection,
  Connector,
  Presence,
  BoardParticipant,
} from '../../../msqdx-design-system/packages/react/src/types/prismion'

export type PrismionResultItem =
  | { type: 'markdown'; content: string; label?: string }
  | { type: 'text'; content: string; label?: string }
  | { type: string; content?: string; label?: string; [key: string]: unknown }

/** True if a card at position/size would overlap another prismion (exclude self). */
export function wouldOverlap(
  excludePrismionId: string,
  position: { x: number; y: number },
  size: { w: number; h: number },
  allPrismions: Array<{ id: string; position: { x: number; y: number }; size: { w: number; h: number } }>,
): boolean {
  const left = position.x
  const right = position.x + size.w
  const top = position.y
  const bottom = position.y + size.h
  for (const p of allPrismions) {
    if (p.id === excludePrismionId) continue
    const oLeft = p.position.x
    const oRight = p.position.x + p.size.w
    const oTop = p.position.y
    const oBottom = p.position.y + p.size.h
    if (left < oRight && right > oLeft && top < oBottom && bottom > oTop) return true
  }
  return false
}
