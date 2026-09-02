/**
 * Map flow output snapshots → Assistant UiBlocks for shared report generation.
 * @see specs/domain/collection-flow-report-pins.md
 */

import type { UiBlock } from '@/lib/assistant/ui-blocks/types'
import type { FlowOutputSnapshot } from '@/lib/db/collection-flow-report-pins'

const TEXT_MAX = 2000

export function truncateFlowPinText(text: string): string {
  const t = text.trim()
  if (t.length <= TEXT_MAX) return t
  return `${t.slice(0, TEXT_MAX - 1)}…`
}

export function flowOutputSnapshotToUiBlock(snapshot: FlowOutputSnapshot): UiBlock {
  const title = snapshot.label?.trim() || snapshot.kind || snapshot.nodeId
  const body = truncateFlowPinText(snapshot.text || '')
  const kindLine = snapshot.kind ? `_${snapshot.kind}_` : ''
  const markdown = [`### ${title}`, kindLine, body].filter(Boolean).join('\n\n')
  return {
    id: `flow-out-${snapshot.nodeId}`,
    type: 'text',
    props: {
      title,
      markdown,
    },
    meta: {
      source: 'plexon_ui',
      createdAt: new Date().toISOString(),
    },
  }
}

export function flowPinsToUiBlocks(
  snapshots: FlowOutputSnapshot[],
): UiBlock[] {
  return snapshots.map(flowOutputSnapshotToUiBlock)
}
