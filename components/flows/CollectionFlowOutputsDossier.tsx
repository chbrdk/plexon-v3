'use client'

import { Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { CollectionFlowNode } from '@/lib/collection-test-flow'
import { buildFlowOutputsDossierItems } from '@/lib/collection-flow-journey-context'
import type { FlowNodeRunOutput } from '@/lib/collection-flow-run-progress'
import type { FlowReportPinItem } from '@/components/flows/FlowReportCollectionBar'

type Props = {
  nodes: CollectionFlowNode[]
  runOutputs: Record<string, FlowNodeRunOutput>
  pins: FlowReportPinItem[]
  /** Current history run — empty/null pins match empty scope. */
  historyRunId?: string | null
  pinBusyNodeId?: string | null
  onSelectNode?: (nodeId: string) => void
  onTogglePin?: (item: {
    nodeId: string
    kind: string
    label: string
    text: string
  }) => void
}

function pinMatchesRun(pin: FlowReportPinItem, historyRunId: string | null | undefined): boolean {
  const hr = historyRunId?.trim() || ''
  const pinHr = pin.historyRunId?.trim() || ''
  return pinHr === hr
}

/** Linear process outputs list for the run dock (Wave 25) + pins (Wave 26). */
export function CollectionFlowOutputsDossier({
  nodes,
  runOutputs,
  pins,
  historyRunId,
  pinBusyNodeId,
  onSelectNode,
  onTogglePin,
}: Props) {
  const { t } = useI18n()
  const items = buildFlowOutputsDossierItems(nodes, runOutputs)
  const pinnedNodeIds = new Set(
    pins.filter((p) => pinMatchesRun(p, historyRunId)).map((p) => p.nodeId),
  )

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
        {items.map((item) => {
          const pinned = pinnedNodeIds.has(item.nodeId)
          return (
            <li key={item.nodeId}>
              <div
                className={
                  item.highlight
                    ? 'msqdx-flow-outputs-dossier-item msqdx-flow-outputs-dossier-item--highlight'
                    : 'msqdx-flow-outputs-dossier-item'
                }
              >
                <button
                  type="button"
                  className="msqdx-flow-outputs-dossier-main"
                  onClick={() => onSelectNode?.(item.nodeId)}
                >
                  <span className="msqdx-flow-outputs-dossier-kind">{item.kind}</span>
                  <span className="msqdx-flow-outputs-dossier-label">{item.label}</span>
                  <span className="msqdx-flow-outputs-dossier-text">{item.text}</span>
                </button>
                {onTogglePin ? (
                  <button
                    type="button"
                    className="msqdx-flow-outputs-dossier-pin"
                    disabled={pinBusyNodeId === item.nodeId}
                    onClick={() =>
                      onTogglePin({
                        nodeId: item.nodeId,
                        kind: item.kind,
                        label: item.label,
                        text: item.text,
                      })
                    }
                    aria-pressed={pinned}
                    title={pinned ? t('assistant.report.unpin') : t('assistant.report.pin')}
                  >
                    {pinned ? t('assistant.report.unpinShort') : t('assistant.report.pinShort')}
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
