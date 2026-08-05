'use client'

import { memo, useCallback, type ChangeEvent, type MouseEvent, type ReactNode } from 'react'
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
  CATALOG_BIND_PATH_HANDLE,
  COLLECTION_COMPARE_OP_OPTIONS,
  COLLECTION_SCAN_MODE_OPTIONS,
  COLLECTION_SCORE_KIND_OPTIONS,
  GEO_GATE_CONDITION_OPTIONS,
  ISSUE_GATE_CONDITION_OPTIONS,
  type CollectionFlowRfNodeData,
} from '@/lib/collection-flow-canvas'
import { listCatalogPathsForPicker } from '@/lib/collection-flow-run-context'
import {
  catalogOutputSlotsForKind,
  nodeIoSchemaForKind,
  type NodePortSlot,
} from '@/lib/collection-flow-node-ports'
import { COLLECTION_MEASURE_KEY_OPTIONS } from '@/lib/collection-flow-presets'

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
  const showOutput =
    Boolean(runOutput?.text || runOutput?.imageUrl || runOutput?.label) &&
    (runState === 'active' || runState === 'done' || runState === 'error')

  const inputZone =
    io.inputs.length > 0 ? (
      <div className="msqdx-flow-io msqdx-flow-io--input" aria-label="INPUT">
        <p className="msqdx-flow-io-title">INPUT</p>
        {io.inputs.map((slot) => {
          const isData = slot.handleId === CATALOG_BIND_PATH_HANDLE
          return (
            <div
              key={slot.handleId}
              className={`msqdx-flow-io-row msqdx-flow-io-row--in${isData && flowNode.path ? ' is-bound' : ''}`}
              title={slot.hint ?? slot.label}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={slot.handleId}
                className={handleClassForSlot(slot, 'in')}
              />
              <div className="msqdx-flow-io-copy">
                <span className="msqdx-flow-io-label">{slot.label}</span>
                {slot.hint && !isData ? (
                  <span className="msqdx-flow-io-hint">{slot.hint}</span>
                ) : null}
              </div>
              {isData ? (
                <select
                  className="msqdx-flow-rf-select msqdx-flow-io-select"
                  value={flowNode.path ?? 'scan.overallScore'}
                  onChange={onComparePath}
                >
                  {listCatalogPathsForPicker().map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.path}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          )
        })}
      </div>
    ) : null

  let parameters: ReactNode = (
    <>
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

      {kind === 'persona' ? (
        <label className="msqdx-flow-rf-field">
          <span>Persona</span>
          <select
            className="msqdx-flow-rf-select"
            value={flowNode.personaId ?? ''}
            onChange={(e) => {
              const id = e.target.value
              const hit = audionCatalog?.personas.find((p) => p.id === id)
              patch({
                personaId: id || undefined,
                personaName: hit?.name,
              })
            }}
          >
            <option value="">— aus Collection wählen —</option>
            {(audionCatalog?.personas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!audionCatalog?.personas?.length ? (
            <span className="msqdx-flow-io-hint">Keine Personas geladen (Audion-Binding?)</span>
          ) : null}
        </label>
      ) : null}

      {kind === 'zielgruppe' ? (
        <label className="msqdx-flow-rf-field">
          <span>Zielgruppe</span>
          <select
            className="msqdx-flow-rf-select"
            value={flowNode.targetGroupId ?? ''}
            onChange={(e) => {
              const id = e.target.value
              const hit = audionCatalog?.targetGroups.find((t) => t.id === id)
              patch({
                targetGroupId: id || undefined,
                targetGroupName: hit?.name,
                segment: hit?.segment || undefined,
              })
            }}
          >
            <option value="">— aus Collection wählen —</option>
            {(audionCatalog?.targetGroups ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.segment ? ` (${t.segment})` : ''}
              </option>
            ))}
          </select>
          {!audionCatalog?.targetGroups?.length ? (
            <span className="msqdx-flow-io-hint">Keine Zielgruppen geladen (Audion-Binding?)</span>
          ) : null}
        </label>
      ) : null}

      {kind === 'measure' ? (
        <label className="msqdx-flow-rf-field">
          <span>Soft-Q Key</span>
          <select
            className="msqdx-flow-rf-select"
            value={flowNode.measureKey ?? 'overall'}
            onChange={(e) => patch({ measureKey: e.target.value })}
          >
            {COLLECTION_MEASURE_KEY_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
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
            <span>Vergleich</span>
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
              <span>Schwelle</span>
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
              kind === 'geo_job' ? 'Eine Query pro Zeile (optional)' : 'Instruction / question…'
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
    </>
  )

  const hasAnyOutput = io.controlOutputs.length > 0 || catalogOutPorts.length > 0
  const outputZone = hasAnyOutput ? (
    <div className="msqdx-flow-io msqdx-flow-io--output" aria-label="OUTPUT">
      <p className="msqdx-flow-io-title">OUTPUT</p>
      {io.controlOutputs.map((slot) => (
        <div
          key={slot.handleId}
          className="msqdx-flow-io-row msqdx-flow-io-row--out"
          title={slot.hint ?? slot.label}
        >
          <div className="msqdx-flow-io-copy">
            <span className="msqdx-flow-io-label">{slot.label}</span>
            {slot.hint ? <span className="msqdx-flow-io-hint">{slot.hint}</span> : null}
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id={slot.handleId}
            className={handleClassForSlot(slot, 'out')}
          />
        </div>
      ))}
      {catalogOutPorts.length > 0 ? (
        <div className="msqdx-flow-io-catalog">
          <p className="msqdx-flow-io-subtitle">Felder</p>
          {catalogOutPorts.map((port) => (
            <div key={port.path} className="msqdx-flow-io-row msqdx-flow-io-row--out" title={port.path}>
              <span className="msqdx-flow-io-label msqdx-flow-io-label--field">{port.label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.handleId}
                className="msqdx-flow-rf-handle msqdx-flow-rf-handle--io-out msqdx-flow-rf-handle--bind"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  ) : null

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
      className="msqdx-flow-rf-node--io"
      output={runOutputPanel}
      footer={footer}
    >
      <div className="nodrag nopan msqdx-flow-io-stack" onMouseDown={stopDrag}>
        {inputZone}
        <div className="msqdx-flow-io msqdx-flow-io--params">
          <p className="msqdx-flow-io-title">Parameters</p>
          {parameters}
        </div>
        {outputZone}
      </div>
    </FlowNodeCard>
  )
}

export const CollectionFlowRfNode = memo(CollectionFlowRfNodeInner)
/** Back-compat alias for older imports of the single flow-node component. */
export const CollectionFlowNode = CollectionFlowRfNode
