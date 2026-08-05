'use client'

import { memo, useCallback, type ChangeEvent, type MouseEvent } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Button, FlowNodeCard, Input, Textarea } from '@msqdx/ui'
import type {
  AudionGateCondition,
  CollectionFlowGateCondition,
  CollectionFlowNode as CollectionFlowNodeModel,
  CollectionFlowNodeKind,
} from '@/lib/collection-test-flow'
import {
  AUDION_GATE_OPTIONS,
  COLLECTION_COMPARE_OP_OPTIONS,
  COLLECTION_SCAN_MODE_OPTIONS,
  COLLECTION_SCORE_KIND_OPTIONS,
  GEO_GATE_CONDITION_OPTIONS,
  ISSUE_GATE_CONDITION_OPTIONS,
  type CollectionFlowRfNodeData,
} from '@/lib/collection-flow-canvas'
import { listCatalogPathsForPicker } from '@/lib/collection-flow-run-context'

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
  domain_scan: 'Domain Scan',
  geo_job: 'GEO Job',
  compare: 'Compare',
  score_gate: 'Score Gate',
  issue_gate: 'Issue Gate',
  geo_gate: 'GEO Gate',
  quality_ok: 'Quality OK',
}

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
  const onCompanyName = (e: ChangeEvent<HTMLInputElement>) => patch({ companyName: e.target.value })
  const onScanUrl = (e: ChangeEvent<HTMLInputElement>) => patch({ url: e.target.value })
  const onScanMode = (e: ChangeEvent<HTMLSelectElement>) =>
    patch({ scanMode: e.target.value as 'single' | 'deep' })
  const onMaxPages = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    patch({ maxPages: Number.isFinite(n) ? n : undefined })
  }
  const onScoreKind = (e: ChangeEvent<HTMLSelectElement>) => patch({ scoreKind: e.target.value })
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
  const onGeoGateCondition = (e: ChangeEvent<HTMLSelectElement>) =>
    patch({ gateCondition: e.target.value as CollectionFlowGateCondition })
  const onComparePath = (e: ChangeEvent<HTMLSelectElement>) => patch({ path: e.target.value })
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
  const isQualityGate =
    kind === 'compare' || kind === 'score_gate' || kind === 'issue_gate' || kind === 'geo_gate'
  const showOutput =
    Boolean(runOutput?.text || runOutput?.imageUrl || runOutput?.label) &&
    (runState === 'active' || runState === 'done' || runState === 'error')

  const targetHandle = (
    <Handle type="target" position={Position.Left} id="in" className="msqdx-flow-rf-handle" />
  )

  const sourceHandles =
    isJourneyGate || isQualityGate ? (
      <>
        <Handle
          type="source"
          position={Position.Right}
          id="when"
          className="msqdx-flow-rf-handle msqdx-flow-rf-handle--when"
          style={{ top: '38%' }}
          title={isQualityGate ? 'pass' : 'wenn'}
        />
        <span className="msqdx-flow-rf-port-label msqdx-flow-rf-port-label--when">
          {isQualityGate ? 'pass' : 'wenn'}
        </span>
        <Handle
          type="source"
          position={Position.Right}
          id="otherwise"
          className="msqdx-flow-rf-handle msqdx-flow-rf-handle--otherwise"
          style={{ top: '72%' }}
          title={isQualityGate ? 'fail' : 'sonst'}
        />
        <span className="msqdx-flow-rf-port-label msqdx-flow-rf-port-label--otherwise">
          {isQualityGate ? 'fail' : 'sonst'}
        </span>
      </>
    ) : (
      <Handle type="source" position={Position.Right} id="then" className="msqdx-flow-rf-handle" />
    )

  const output = showOutput ? (
    <>
      <p className="msqdx-flow-rf-output-label">
        Output
        {runOutput?.step != null ? ` · #${runOutput.step}` : ''}
      </p>
      {runOutput?.label ? (
        <p className="msqdx-flow-rf-output-headline">{runOutput.label}</p>
      ) : null}
      {runOutput?.text ? <pre className="msqdx-flow-rf-output-text">{runOutput.text}</pre> : null}
      {runOutput?.text && onOutputToNote ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => onOutputToNote()}>
          In Note übernehmen
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
          Wenn → Agent
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onManualGate('otherwise')}>
          Sonst → Agent
        </Button>
      </div>
    ) : undefined

  return (
    <FlowNodeCard
      kind={kind}
      kindLabel={KIND_LABEL[kind] ?? kind}
      nodeId={id}
      selected={selected}
      runState={runState}
      hasOutput={showOutput}
      targetHandle={targetHandle}
      sourceHandles={sourceHandles}
      output={output}
      footer={footer}
    >
      <div className="nodrag nopan" onMouseDown={stopDrag}>
        <label className="msqdx-flow-rf-field">
          <span>Name</span>
          <Input block size="sm" value={flowNode.label} onChange={onLabel} placeholder="Node name" />
        </label>

        {kind === 'start' ? (
          <label className="msqdx-flow-rf-field">
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
          <>
            <label className="msqdx-flow-rf-field">
              <span>URL</span>
              <Input
                block
                size="sm"
                value={flowNode.url ?? ''}
                onChange={onScanUrl}
                placeholder="leer = Journey finalUrl"
              />
            </label>
            <label className="msqdx-flow-rf-field">
              <span>Mode</span>
              <select
                className="msqdx-flow-rf-select"
                value={flowNode.scanMode ?? 'single'}
                onChange={onScanMode}
              >
                {COLLECTION_SCAN_MODE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {kind === 'domain_scan' ? (
          <>
            <label className="msqdx-flow-rf-field">
              <span>URL</span>
              <Input
                block
                size="sm"
                value={flowNode.url ?? ''}
                onChange={onScanUrl}
                placeholder="Domain / Start-URL"
              />
            </label>
            <label className="msqdx-flow-rf-field msqdx-flow-rf-field--inline">
              <span>Max pages</span>
              <Input
                size="sm"
                className="msqdx-flow-rf-input--narrow"
                type="number"
                min={1}
                max={500}
                value={flowNode.maxPages ?? 50}
                onChange={onMaxPages}
              />
            </label>
          </>
        ) : null}

        {kind === 'geo_job' ? (
          <>
            <label className="msqdx-flow-rf-field">
              <span>URL</span>
              <Input
                block
                size="sm"
                value={flowNode.url ?? ''}
                onChange={onScanUrl}
                placeholder="leer = Journey finalUrl"
              />
            </label>
            <label className="msqdx-flow-rf-field">
              <span>Company</span>
              <Input
                block
                size="sm"
                value={flowNode.companyName ?? ''}
                onChange={onCompanyName}
                placeholder="wenn URL leer"
              />
            </label>
          </>
        ) : null}

        {isJourneyGate ? (
          <>
            <label className="msqdx-flow-rf-field">
              <span>Condition</span>
              <select
                className="msqdx-flow-rf-select"
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
              <label className="msqdx-flow-rf-field">
                <span>pattern</span>
                <Input block size="sm" value={flowNode.pattern ?? ''} onChange={onPattern} placeholder="regex" />
              </label>
            )}
            {gateEvaluation ? (
              <p className="msqdx-flow-rf-gate-evidence">
                Live: {gateEvaluation.matched ? 'match' : '—'}
                {gateEvaluation.evidence ? ` · ${gateEvaluation.evidence}` : ''}
              </p>
            ) : null}
          </>
        ) : null}

        {kind === 'compare' ? (
          <>
            <label className="msqdx-flow-rf-field">
              <span>Path</span>
              <select
                className="msqdx-flow-rf-select"
                value={flowNode.path ?? 'scan.overallScore'}
                onChange={onComparePath}
              >
                {listCatalogPathsForPicker().map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.path}
                  </option>
                ))}
              </select>
            </label>
            <label className="msqdx-flow-rf-field">
              <span>Op</span>
              <select
                className="msqdx-flow-rf-select"
                value={flowNode.op ?? 'gte'}
                onChange={onCompareOp}
              >
                {COLLECTION_COMPARE_OP_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            {flowNode.op !== 'exists' && flowNode.op !== 'not_exists' ? (
              <label className="msqdx-flow-rf-field msqdx-flow-rf-field--inline">
                <span>Value</span>
                <Input
                  size="sm"
                  className="msqdx-flow-rf-input--narrow"
                  value={flowNode.value != null ? String(flowNode.value) : '70'}
                  onChange={onCompareValue}
                />
              </label>
            ) : null}
          </>
        ) : null}

        {kind === 'score_gate' ? (
          <>
            <label className="msqdx-flow-rf-field">
              <span>Score</span>
              <select
                className="msqdx-flow-rf-select"
                value={flowNode.scoreKind ?? 'overall'}
                onChange={onScoreKind}
              >
                {COLLECTION_SCORE_KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="msqdx-flow-rf-field msqdx-flow-rf-field--inline">
              <span>Threshold</span>
              <Input
                size="sm"
                className="msqdx-flow-rf-input--narrow"
                type="number"
                min={0}
                max={100}
                value={flowNode.threshold ?? 70}
                onChange={onThreshold}
              />
            </label>
          </>
        ) : null}

        {kind === 'issue_gate' ? (
          <>
            <label className="msqdx-flow-rf-field">
              <span>Condition</span>
              <select
                className="msqdx-flow-rf-select"
                value={(flowNode.gateCondition as string) ?? 'critical_issues'}
                onChange={onIssueGateCondition}
              >
                {ISSUE_GATE_CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {flowNode.gateCondition === 'issue_rule_match' ? (
              <label className="msqdx-flow-rf-field">
                <span>pattern</span>
                <Input block size="sm" value={flowNode.pattern ?? ''} onChange={onPattern} placeholder="ruleId regex" />
              </label>
            ) : flowNode.gateCondition === 'no_critical_issues' ||
              flowNode.gateCondition === 'no_serious_issues' ||
              flowNode.gateCondition === 'no_issues' ? null : (
              <label className="msqdx-flow-rf-field msqdx-flow-rf-field--inline">
                <span>Min count</span>
                <Input
                  size="sm"
                  className="msqdx-flow-rf-input--narrow"
                  type="number"
                  min={1}
                  value={flowNode.minCount ?? 1}
                  onChange={onMinCount}
                />
              </label>
            )}
          </>
        ) : null}

        {kind === 'geo_gate' ? (
          <>
            <label className="msqdx-flow-rf-field">
              <span>Condition</span>
              <select
                className="msqdx-flow-rf-select"
                value={(flowNode.gateCondition as string) ?? 'cited_share_at_least'}
                onChange={onGeoGateCondition}
              >
                {GEO_GATE_CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="msqdx-flow-rf-field msqdx-flow-rf-field--inline">
              <span>Threshold</span>
              <Input
                size="sm"
                className="msqdx-flow-rf-input--narrow"
                type="number"
                min={0}
                max={100}
                value={flowNode.threshold ?? 70}
                onChange={onThreshold}
              />
            </label>
          </>
        ) : null}

        {kind === 'observe' ? (
          <label className="msqdx-flow-rf-field msqdx-flow-rf-field--inline">
            <span>Sekunden</span>
            <Input
              size="sm"
              className="msqdx-flow-rf-input--narrow"
              type="number"
              min={1}
              value={flowNode.observeSeconds ?? 30}
              onChange={onSeconds}
            />
          </label>
        ) : null}

        {showText ? (
          <label className="msqdx-flow-rf-field">
            <span>{kind === 'measure' ? 'Frage' : kind === 'geo_job' ? 'Queries' : 'Text'}</span>
            <Textarea
              block
              size="sm"
              rows={kind === 'observe' ? 2 : 3}
              value={flowNode.text ?? ''}
              onChange={onText}
              placeholder={
                kind === 'geo_job'
                  ? 'Eine Query pro Zeile (optional)'
                  : 'Instruction / question…'
              }
            />
          </label>
        ) : null}

        <label className="msqdx-flow-rf-field">
          <span>Note</span>
          <Textarea
            block
            size="sm"
            className="msqdx-flow-rf-textarea--note"
            rows={2}
            value={flowNode.note ?? ''}
            onChange={onNote}
            onFocus={() => onOpenInspector?.()}
            placeholder="Annotation / Beobachtung…"
          />
        </label>
      </div>
    </FlowNodeCard>
  )
}

export const CollectionFlowRfNode = memo(CollectionFlowRfNodeInner)
/** Back-compat alias for older imports of the single flow-node component. */
export const CollectionFlowNode = CollectionFlowRfNode
