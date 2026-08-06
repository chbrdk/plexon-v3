'use client'

import { memo, useCallback, type ChangeEvent, type MouseEvent, type ReactNode } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Button, FlowNodeCard, Input } from '@msqdx/ui'
import type {
  AudionGateCondition,
  CollectionFlowNode as CollectionFlowNodeModel,
  CollectionFlowNodeKind,
} from '@/lib/collection-test-flow'
import {
  AUDION_GATE_OPTIONS,
  COLLECTION_COMPARE_OP_OPTIONS,
  type CollectionFlowRfNodeData,
} from '@/lib/collection-flow-canvas'
import {
  catalogOutputSlotsForKind,
  nodeIoSchemaForKind,
  type NodePortSlot,
} from '@/lib/collection-flow-node-ports'

type CollectionFlowNodeType = Node<CollectionFlowRfNodeData, 'collectionFlow'>

const KIND_LABEL: Record<CollectionFlowNodeKind, string> = {
  start: 'Start',
  prompt: 'Aufgabe',
  observe: 'Beobachten',
  action: 'Action',
  gate: 'Gate',
  message: 'Nachricht',
  success: 'Success',
  abandon: 'Abandon',
  measure: 'Frage',
  persona: 'Persona',
  zielgruppe: 'Zielgruppe',
  journey: 'Journey',
  scan: 'Scan',
  domain_scan: 'Domain Scan',
  geo_job: 'GEO Job',
  compare: 'Compare',
  set: 'Set',
  score_gate: 'Score Gate',
  issue_gate: 'Issue Gate',
  geo_gate: 'GEO Gate',
  quality_ok: 'Quality OK',
}

function stopDrag(e: MouseEvent) {
  e.stopPropagation()
}

function handleClassForSlot(slot: NodePortSlot, side: 'in' | 'out'): string {
  const parts = ['msqdx-flow-rf-handle', `msqdx-flow-rf-handle--io-${side}`]
  if (slot.role === 'data' || slot.role === 'catalog') parts.push('msqdx-flow-rf-handle--bind')
  if (slot.handleId === 'when') parts.push('msqdx-flow-rf-handle--when')
  if (slot.handleId === 'otherwise') parts.push('msqdx-flow-rf-handle--otherwise')
  return parts.join(' ')
}

function summarizeStartUrl(input: string): string {
  const raw = input.trim()
  if (!raw) return 'URL setzen…'
  try {
    const url = new URL(raw)
    const path = url.pathname && url.pathname !== '/' ? url.pathname : ''
    return `${url.hostname}${path}`
  } catch {
    return raw.length > 56 ? `${raw.slice(0, 56)}…` : raw
  }
}

function deriveStartLabelFromUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    if (!host) return null
    return host
  } catch {
    const compact = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    return compact || null
  }
}

/**
 * Compact n8n-like RF node: edge handles + title/preview on the card.
 * Full parameter editing lives in the Inspector (ExpressionField / Context tree).
 */
function CollectionFlowRfNodeInner({ id, data, selected }: NodeProps<CollectionFlowNodeType>) {
  const flowNode = data.flowNode
  const onUpdate = data.onUpdate
  const runState = data.runState ?? 'idle'
  const runOutput = data.runOutput
  const gateEvaluation = data.gateEvaluation
  const runBusy = data.runBusy ?? false
  const onManualGate = data.onManualGate
  const onOutputToNote = data.onOutputToNote
  const onOpenInspector = data.onOpenInspector
  const audionCatalog = data.audionCatalog
  const kind = flowNode.kind
  const io = nodeIoSchemaForKind(kind)
  const catalogOutPorts = catalogOutputSlotsForKind(kind)

  const patch = useCallback(
    (partial: Partial<CollectionFlowNodeModel>) => {
      onUpdate?.(id, partial)
    },
    [id, onUpdate]
  )

  const onLabel = (e: ChangeEvent<HTMLInputElement>) => patch({ label: e.target.value })
  const onStartUrl = (e: ChangeEvent<HTMLInputElement>) => {
    const nextUrl = e.target.value
    const patchNext: Partial<CollectionFlowNodeModel> = { urlKey: nextUrl, url: nextUrl }
    if (!flowNode.label.trim() || flowNode.label.trim() === KIND_LABEL.start) {
      const nextLabel = deriveStartLabelFromUrl(nextUrl)
      if (nextLabel) patchNext.label = nextLabel
    }
    patch(patchNext)
  }
  const onJourneyGateCondition = (e: ChangeEvent<HTMLSelectElement>) =>
    patch({ gateCondition: e.target.value as AudionGateCondition })
  const onCompareOp = (e: ChangeEvent<HTMLSelectElement>) =>
    patch({ op: e.target.value as CollectionFlowNodeModel['op'] })
  const onCompareValue = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      patch({ value: undefined })
      return
    }
    const n = Number(raw)
    patch({ value: Number.isFinite(n) && raw.trim() !== '' ? n : raw })
  }

  const showText =
    kind === 'prompt' ||
    kind === 'action' ||
    kind === 'message' ||
    kind === 'abandon' ||
    kind === 'success' ||
    kind === 'measure' ||
    kind === 'observe' ||
    kind === 'geo_job'
  const isJourneyGate = kind === 'gate'
  const showOutput =
    Boolean(runOutput?.text || runOutput?.imageUrl || runOutput?.label) &&
    (runState === 'active' || runState === 'done' || runState === 'error')

  const previewLine = (() => {
    if (kind === 'compare') {
      const path = flowNode.path ?? '—'
      const op = flowNode.op ?? 'gte'
      const val =
        flowNode.op === 'exists' || flowNode.op === 'not_exists'
          ? ''
          : ` ${flowNode.value ?? 70}`
      return `${path} ${op}${val}`
    }
    if (kind === 'set') return `${flowNode.alias || 'alias'} ← ${flowNode.path || '—'}`
    if (kind === 'start') return summarizeStartUrl(flowNode.urlKey || flowNode.url || '')
    if (kind === 'persona') return flowNode.personaName || flowNode.personaId || 'Persona wählen…'
    if (kind === 'zielgruppe')
      return flowNode.targetGroupName || flowNode.targetGroupId || 'Zielgruppe wählen…'
    if (kind === 'scan' || kind === 'domain_scan' || kind === 'geo_job')
      return flowNode.url || flowNode.companyName || 'URL optional'
    if (kind === 'gate') return String(flowNode.gateCondition ?? 'goal_reached')
    if (showText && flowNode.text?.trim()) {
      const t = flowNode.text.trim()
      return t.length > 72 ? `${t.slice(0, 72)}…` : t
    }
    if (flowNode.presetId) return `Preset · ${flowNode.presetId}`
    return null
  })()

  const body: ReactNode = (
    <>
      <label className="msqdx-flow-rf-field msqdx-flow-rf-field--title">
        <Input
          block
          size="sm"
          value={flowNode.label}
          onChange={onLabel}
          placeholder={KIND_LABEL[kind] ?? kind}
          aria-label="Node name"
        />
      </label>

      {previewLine ? (
        <button
          type="button"
          className="msqdx-flow-rf-preview"
          title="Im Inspector bearbeiten"
          onClick={() => onOpenInspector?.()}
        >
          {previewLine}
        </button>
      ) : (
        <button
          type="button"
          className="msqdx-flow-rf-preview msqdx-flow-rf-preview--muted"
          onClick={() => onOpenInspector?.()}
        >
          Inspector öffnen…
        </button>
      )}

      {kind === 'persona' ? (
        <select
          className="msqdx-flow-rf-select"
          value={flowNode.personaId ?? ''}
          onChange={(e) => {
            const pid = e.target.value
            const hit = audionCatalog?.personas.find((p) => p.id === pid)
            patch({
              personaId: pid || undefined,
              personaName: hit?.name,
            })
          }}
          aria-label="Persona"
        >
          <option value="">— Persona —</option>
          {(audionCatalog?.personas ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : null}

      {kind === 'zielgruppe' ? (
        <select
          className="msqdx-flow-rf-select"
          value={flowNode.targetGroupId ?? ''}
          onChange={(e) => {
            const tid = e.target.value
            const hit = audionCatalog?.targetGroups.find((t) => t.id === tid)
            patch({
              targetGroupId: tid || undefined,
              targetGroupName: hit?.name,
              segment: hit?.segment || undefined,
            })
          }}
          aria-label="Zielgruppe"
        >
          <option value="">— Zielgruppe —</option>
          {(audionCatalog?.targetGroups ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      ) : null}

      {kind === 'start' ? (
        <Input
          block
          size="sm"
          value={flowNode.urlKey ?? flowNode.url ?? ''}
          onChange={onStartUrl}
          placeholder="url / https://…"
          aria-label="Start URL"
        />
      ) : null}

      {kind === 'compare' ? (
        <div className="msqdx-flow-rf-compact-row">
          <select
            className="msqdx-flow-rf-select"
            value={flowNode.op ?? 'gte'}
            onChange={onCompareOp}
            aria-label="Compare op"
          >
            {COLLECTION_COMPARE_OP_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {flowNode.op !== 'exists' && flowNode.op !== 'not_exists' ? (
            <Input
              size="sm"
              className="msqdx-flow-rf-input--narrow"
              value={flowNode.value != null ? String(flowNode.value) : '70'}
              onChange={onCompareValue}
              aria-label="Compare value"
            />
          ) : null}
        </div>
      ) : null}

      {isJourneyGate ? (
        <>
          <select
            className="msqdx-flow-rf-select"
            value={(flowNode.gateCondition as string) ?? 'goal_reached'}
            onChange={onJourneyGateCondition}
            aria-label="Gate condition"
          >
            {AUDION_GATE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {gateEvaluation ? (
            <p className="msqdx-flow-rf-gate-evidence">
              {gateEvaluation.matched ? 'match' : '—'}
              {gateEvaluation.evidence ? ` · ${gateEvaluation.evidence}` : ''}
            </p>
          ) : null}
        </>
      ) : null}
    </>
  )

  const targetHandle =
    io.inputs.length > 0 ? (
      <div className="msqdx-flow-handles msqdx-flow-handles--in" aria-label="Inputs">
        {io.inputs.map((slot, index) => (
          <div
            key={slot.handleId}
            className="msqdx-flow-handle-slot msqdx-flow-handle-slot--in"
            style={{ top: `${((index + 1) / (io.inputs.length + 1)) * 100}%` }}
            title={slot.hint ? `${slot.label} — ${slot.hint}` : slot.label}
          >
            <span className="msqdx-flow-handle-caption">{slot.label}</span>
            <Handle
              type="target"
              position={Position.Left}
              id={slot.handleId}
              className={handleClassForSlot(slot, 'in')}
            />
          </div>
        ))}
      </div>
    ) : undefined

  const outs = [
    ...io.controlOutputs.map((slot) => ({
      id: slot.handleId,
      label: slot.label,
      title: slot.hint ? `${slot.label} — ${slot.hint}` : slot.label,
      className: handleClassForSlot(slot, 'out'),
    })),
    ...catalogOutPorts.map((port) => ({
      id: port.handleId,
      label: port.label,
      title: port.path,
      className: 'msqdx-flow-rf-handle msqdx-flow-rf-handle--io-out msqdx-flow-rf-handle--bind',
    })),
  ]

  const sourceHandles =
    outs.length > 0 ? (
      <div className="msqdx-flow-handles msqdx-flow-handles--out" aria-label="Outputs">
        {outs.map((slot, index) => (
          <div
            key={slot.id}
            className="msqdx-flow-handle-slot msqdx-flow-handle-slot--out"
            style={{ top: `${((index + 1) / (outs.length + 1)) * 100}%` }}
            title={slot.title}
          >
            <span className="msqdx-flow-handle-caption">{slot.label}</span>
            <Handle type="source" position={Position.Right} id={slot.id} className={slot.className} />
          </div>
        ))}
      </div>
    ) : undefined

  const runOutputPanel = showOutput ? (
    <>
      <p className="msqdx-flow-rf-output-label">
        Run
        {runOutput?.step != null ? ` · #${runOutput.step}` : ''}
      </p>
      {runOutput?.label ? (
        <p className="msqdx-flow-rf-output-headline">{runOutput.label}</p>
      ) : null}
      {runOutput?.text ? <pre className="msqdx-flow-rf-output-text">{runOutput.text}</pre> : null}
      {runOutput?.text && onOutputToNote ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => onOutputToNote()}>
          In Note
        </Button>
      ) : null}
      {runOutput?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="msqdx-flow-rf-output-img"
          src={runOutput.imageUrl}
          alt={runOutput.label ? `Screenshot: ${runOutput.label}` : 'Step screenshot'}
        />
      ) : null}
    </>
  ) : undefined

  const footer =
    isJourneyGate && runBusy && onManualGate ? (
      <div className="msqdx-flow-rf-gate-actions nodrag nopan" onMouseDown={stopDrag}>
        <Button type="button" size="sm" variant="subtle" onClick={() => onManualGate('when')}>
          Wenn
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onManualGate('otherwise')}>
          Sonst
        </Button>
      </div>
    ) : undefined

  return (
    <FlowNodeCard
      kind={kind}
      kindLabel={KIND_LABEL[kind] ?? kind}
      selected={selected}
      runState={runState}
      hasOutput={showOutput}
      className="msqdx-flow-rf-node--compact"
      targetHandle={targetHandle}
      sourceHandles={sourceHandles}
      output={runOutputPanel}
      footer={footer}
      title={id}
    >
      <div className="nodrag nopan msqdx-flow-rf-compact">{body}</div>
    </FlowNodeCard>
  )
}

export const CollectionFlowRfNode = memo(CollectionFlowRfNodeInner)
/** Back-compat alias for older imports of the single flow-node component. */
export const CollectionFlowNode = CollectionFlowRfNode
