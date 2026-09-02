'use client'

import { Text } from '@msqdx/ui'
import type { CollectionFlowNode } from '@/lib/collection-test-flow'
import { buildFlowOutputsDossierItems } from '@/lib/collection-flow-journey-context'
import type { FlowNodeRunOutput } from '@/lib/collection-flow-run-progress'

type Props = {
  nodes: CollectionFlowNode[]
  runOutputs: Record<string, FlowNodeRunOutput>
  onSelectNode?: (nodeId: string) => void
}

/** Linear process outputs list for the run dock (Wave 25). */
export function CollectionFlowOutputsDossier({ nodes, runOutputs, onSelectNode }: Props) {
  const items = buildFlowOutputsDossierItems(nodes, runOutputs)
  if (!items.length) {
    return (
      <div className="msqdx-flow-outputs-dossier" data-testid="flow-outputs-dossier-empty">
        <Text role="meta" as="p">
          Noch keine Prozess-Ausgaben — nach dem Lauf erscheinen hier Persona-Antworten und
          Prüfergebnisse.
        </Text>
      </div>
    )
  }

  return (
    <div className="msqdx-flow-outputs-dossier" data-testid="flow-outputs-dossier">
      <Text role="label" as="p" className="msqdx-flow-outputs-dossier-title">
        Prozess-Ausgaben
      </Text>
      <ol className="msqdx-flow-outputs-dossier-list">
        {items.map((item) => (
          <li key={item.nodeId}>
            <button
              type="button"
              className={
                item.highlight
                  ? 'msqdx-flow-outputs-dossier-item msqdx-flow-outputs-dossier-item--highlight'
                  : 'msqdx-flow-outputs-dossier-item'
              }
              onClick={() => onSelectNode?.(item.nodeId)}
            >
              <span className="msqdx-flow-outputs-dossier-kind">{item.kind}</span>
              <span className="msqdx-flow-outputs-dossier-label">{item.label}</span>
              <span className="msqdx-flow-outputs-dossier-text">{item.text}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
