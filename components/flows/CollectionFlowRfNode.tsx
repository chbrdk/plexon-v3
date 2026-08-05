'use client'

import { memo, useCallback, type ChangeEvent, type MouseEvent } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Button, Input, Textarea } from '@msqdx/ui'
import type {
  AudionGateCondition,
  CollectionFlowGateCondition,
  CollectionFlowNode as CollectionFlowNodeModel,
  CollectionFlowNodeKind,
} from '@/lib/collection-test-flow'
import { AUDION_GATE_OPTIONS, type CollectionFlowRfNodeData } from '@/lib/collection-flow-canvas'

type CollectionFlowNodeType = Node<CollectionFlowRfNodeData, 'collectionFlow'>

const KIND_LABEL: Record<CollectionFlowNodeKind, string> = {
  start: 'Start',
  prompt: 'Prompt',
  observe: 'Observe',
  action: 'Action',
  gate: 'Gate',
  message: 'Message',
  success: 'Success',
  abandon: 'Abandon',
  measure: 'Measure',
  journey: 'Journey',
  scan: 'Scan',
  score_gate: 'Score Gate',
  issue_gate: 'Issue Gate',
  quality_ok: 'Quality OK',
}

const ISSUE_GATE_CONDITIONS: CollectionFlowGateCondition[] = [
  'critical_issues',
  'no_critical_issues',
  'issue_rule_match',
]

function stopDrag(e: MouseEvent) {
  e.stopPropagation()
}

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
  const kind = flowNode.kind

  const patch = useCallback(
    (partial: Partial<CollectionFlowNodeModel>) => {
      onUpdate?.(id, partial)
    },
    [id, onUpdate]
  )

  const onLabel = (e: ChangeEvent<HTMLInputElement>) => patch({ label: e.target.value })
  const onText = (e: ChangeEvent<HTMLTextAreaElement>) => patch({ text: e.target.value })
  const onNote = (e: ChangeEvent<HTMLTextAreaElement>) => patch({ note: e.target.value })
  const onStartUrl = (e: ChangeEvent<HTMLInputElement>) =>
    patch({ urlKey: e.target.value, url: e.target.value })
  const onScanUrl = (e: ChangeEvent<HTMLInputElement>) => patch({ url: e.target.value })
  const onPattern = (e: ChangeEvent<HTMLInputElement>) => patch({ pattern: e.target.value })
  const onSeconds = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    patch({ observeSeconds: Number.isFinite(n) ? n : undefined })
  }
  const onThreshold = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    patch({ threshold: Number.isFinite(n) ? n : undefined })
  }
  const onMinCount = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    patch({ minCount: Number.isFinite(n) ? n : undefined })
  }
  const onJourneyGateCondition = (e: ChangeEvent<HTMLSelectElement>) =>
    patch({ gateCondition: e.target.value as AudionGateCondition })
  const onIssueGateCondition = (e: ChangeEvent<HTMLSelectElement>) =>
    patch({ gateCondition: e.target.value as CollectionFlowGateCondition })

  const showText =
    kind === 'prompt' ||
    kind === 'action' ||
    kind === 'message' ||
    kind === 'abandon' ||
    kind === 'success' ||
    kind === 'measure' ||
    kind === 'observe'
  const isJourneyGate = kind === 'gate'
  const isQualityGate = kind === 'score_gate' || kind === 'issue_gate'
  const showOutput =
    Boolean(runOutput?.text || runOutput?.imageUrl || runOutput?.label) &&
    (runState === 'active' || runState === 'done' || runState === 'error')

  return (
    <div
      className={`plexon-flow-rf-node plexon-flow-rf-node--${kind} plexon-flow-rf-node--run-${runState}${showOutput ? ' has-output' : ''}${selected ? ' is-selected' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="plexon-flow-rf-handle"
      />

      <header className="plexon-flow-rf-node-head">
        <span className="plexon-flow-rf-node-kind">{KIND_LABEL[kind] ?? kind}</span>
        <span className="plexon-flow-rf-node-run" data-run={runState}>
          {runState === 'idle' ? '' : runState}
        </span>
        <span className="plexon-flow-rf-node-id" title={id}>
          {id}
        </span>
      </header>

      <div className="plexon-flow-rf-node-body nodrag nopan" onMouseDown={stopDrag}>
        <label className="plexon-flow-rf-field">
          <span>Name</span>
          <Input block size="sm" value={flowNode.label} onChange={onLabel} placeholder="Node name" />
        </label>

        {kind === 'start' ? (
          <label className="plexon-flow-rf-field">
            <span>urlKey</span>
            <Input
              block
              size="sm"
              value={flowNode.urlKey ?? flowNode.url ?? ''}
              onChange={onStartUrl}
              placeholder="url key or https://…"
            />
          </label>
        ) : null}

        {kind === 'scan' ? (
          <label className="plexon-flow-rf-field">
            <span>URL</span>
            <Input
              block
              size="sm"
              value={flowNode.url ?? ''}
              onChange={onScanUrl}
              placeholder="leer = Journey finalUrl"
            />
          </label>
        ) : null}

        {isJourneyGate ? (
          <>
            <label className="plexon-flow-rf-field">
              <span>Condition</span>
              <select
                className="plexon-flow-rf-select"
                value={(flowNode.gateCondition as string) ?? 'goal_reached'}
                onChange={onJourneyGateCondition}
              >
                {AUDION_GATE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            {(flowNode.gateCondition === 'url_match' || flowNode.gateCondition === 'title_match') && (
              <label className="plexon-flow-rf-field">
                <span>pattern</span>
                <Input block size="sm" value={flowNode.pattern ?? ''} onChange={onPattern} placeholder="regex" />
              </label>
            )}
            {gateEvaluation ? (
              <p className="plexon-flow-rf-gate-evidence">
                Live: {gateEvaluation.matched ? 'match' : '—'}
                {gateEvaluation.evidence ? ` · ${gateEvaluation.evidence}` : ''}
              </p>
            ) : null}
            {runBusy && onManualGate ? (
              <div className="plexon-flow-rf-gate-actions nodrag nopan" onMouseDown={stopDrag}>
                <Button type="button" size="sm" variant="subtle" onClick={() => onManualGate('when')}>
                  Wenn → Agent
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => onManualGate('otherwise')}>
                  Sonst → Agent
                </Button>
              </div>
            ) : null}
          </>
        ) : null}

        {kind === 'score_gate' ? (
          <label className="plexon-flow-rf-field plexon-flow-rf-field--inline">
            <span>Threshold</span>
            <Input
              size="sm"
              className="plexon-flow-rf-input--narrow"
              type="number"
              min={0}
              max={100}
              value={flowNode.threshold ?? 70}
              onChange={onThreshold}
            />
          </label>
        ) : null}

        {kind === 'issue_gate' ? (
          <>
            <label className="plexon-flow-rf-field">
              <span>Condition</span>
              <select
                className="plexon-flow-rf-select"
                value={(flowNode.gateCondition as string) ?? 'critical_issues'}
                onChange={onIssueGateCondition}
              >
                {ISSUE_GATE_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {flowNode.gateCondition === 'issue_rule_match' ? (
              <label className="plexon-flow-rf-field">
                <span>pattern</span>
                <Input block size="sm" value={flowNode.pattern ?? ''} onChange={onPattern} placeholder="ruleId regex" />
              </label>
            ) : (
              <label className="plexon-flow-rf-field plexon-flow-rf-field--inline">
                <span>Min count</span>
                <Input
                  size="sm"
                  className="plexon-flow-rf-input--narrow"
                  type="number"
                  min={1}
                  value={flowNode.minCount ?? 1}
                  onChange={onMinCount}
                />
              </label>
            )}
          </>
        ) : null}

        {kind === 'observe' ? (
          <label className="plexon-flow-rf-field plexon-flow-rf-field--inline">
            <span>Sekunden</span>
            <Input
              size="sm"
              className="plexon-flow-rf-input--narrow"
              type="number"
              min={1}
              value={flowNode.observeSeconds ?? 30}
              onChange={onSeconds}
            />
          </label>
        ) : null}

        {showText ? (
          <label className="plexon-flow-rf-field">
            <span>{kind === 'measure' ? 'Frage' : 'Text'}</span>
            <Textarea
              block
              size="sm"
              rows={kind === 'observe' ? 2 : 3}
              value={flowNode.text ?? ''}
              onChange={onText}
              placeholder="Instruction / question…"
            />
          </label>
        ) : null}

        <label className="plexon-flow-rf-field">
          <span>Note</span>
          <Textarea
            block
            size="sm"
            className="plexon-flow-rf-textarea--note"
            rows={2}
            value={flowNode.note ?? ''}
            onChange={onNote}
            onFocus={() => onOpenInspector?.()}
            placeholder="Annotation / Beobachtung…"
          />
        </label>

        {showOutput ? (
          <div className="plexon-flow-rf-output">
            <p className="plexon-flow-rf-output-label">
              Output
              {runOutput?.step != null ? ` · #${runOutput.step}` : ''}
            </p>
            {runOutput?.label ? <p className="plexon-flow-rf-output-headline">{runOutput.label}</p> : null}
            {runOutput?.text ? <pre className="plexon-flow-rf-output-text">{runOutput.text}</pre> : null}
            {runOutput?.text && onOutputToNote ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onOutputToNote()}>
                In Note übernehmen
              </Button>
            ) : null}
            {runOutput?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="plexon-flow-rf-output-img"
                src={runOutput.imageUrl}
                alt={runOutput.label ? `Screenshot: ${runOutput.label}` : 'Step screenshot'}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {isJourneyGate || isQualityGate ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="when"
            className="plexon-flow-rf-handle plexon-flow-rf-handle--when"
            style={{ top: '38%' }}
            title={isQualityGate ? 'pass' : 'wenn'}
          />
          <span className="plexon-flow-rf-port-label plexon-flow-rf-port-label--when">
            {isQualityGate ? 'pass' : 'wenn'}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="otherwise"
            className="plexon-flow-rf-handle plexon-flow-rf-handle--otherwise"
            style={{ top: '72%' }}
            title={isQualityGate ? 'fail' : 'sonst'}
          />
          <span className="plexon-flow-rf-port-label plexon-flow-rf-port-label--otherwise">
            {isQualityGate ? 'fail' : 'sonst'}
          </span>
        </>
      ) : (
        <Handle type="source" position={Position.Right} id="then" className="plexon-flow-rf-handle" />
      )}
    </div>
  )
}

export const CollectionFlowRfNode = memo(CollectionFlowRfNodeInner)
/** Back-compat alias for older imports of the single flow-node component. */
export const CollectionFlowNode = CollectionFlowRfNode
