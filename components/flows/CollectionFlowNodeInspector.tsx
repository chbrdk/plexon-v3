'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  Button,
  ExpressionField,
  FlowNodeEditorShell,
  Input,
  SchemaTree,
} from '@msqdx/ui'
import type {
  CollectionFlowLastRun,
  CollectionFlowNode,
  CollectionFlowNodeKind,
  CollectionVerdict,
} from '@/lib/collection-test-flow'
import {
  AUDION_GATE_OPTIONS,
  COLLECTION_COMPARE_OP_OPTIONS,
  COLLECTION_SCAN_MODE_OPTIONS,
  type CollectionFlowRfEdge,
  type CollectionFlowRfNode,
} from '@/lib/collection-flow-canvas'
import {
  formatExpressionForPath,
  formatNodeJsonExpression,
} from '@/lib/collection-flow-expression'
import {
  globalContextSchemaForest,
  nodeOutputSchema,
  nodeRefsFromRfNodes,
  upstreamInputsForNode,
} from '@/lib/collection-flow-inspector-inputs'
import type {
  FlowJobRunSummary,
  FlowNodeInspectorData,
  FlowNodeInspectorStep,
  FlowNodeRunState,
} from '@/lib/collection-flow-run-progress'

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

function formatSec(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  if (sec < 60) return `${sec.toFixed(1)}s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

function InspectorField({
  label,
  tone,
  children,
  mono,
}: {
  label: string
  tone: 'action' | 'target' | 'result' | 'reasoning' | 'meta' | 'error'
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className={`msqdx-flow-inspector-field msqdx-flow-inspector-field--${tone}`}>
      <span className="msqdx-flow-inspector-field-label">{label}</span>
      <div
        className={`msqdx-flow-inspector-field-value${mono ? ' msqdx-flow-inspector-field-value--mono' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}

function InspectorStepCard({
  step,
  index,
  isLast,
  defaultOpen,
}: {
  step: FlowNodeInspectorStep
  index: number
  isLast: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const actionLabel = step.action ?? 'step'
  const summary = step.target?.trim() || step.result?.trim()?.slice(0, 48) || '—'

  return (
    <li className={`msqdx-flow-inspector-step-item${isLast ? ' is-latest' : ''}`}>
      <article className="msqdx-flow-inspector-step">
        <button
          type="button"
          className="msqdx-flow-inspector-step-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="msqdx-flow-inspector-step-num">#{step.step ?? index + 1}</span>
          <span className="msqdx-flow-inspector-action-badge">{actionLabel}</span>
          <span className="msqdx-flow-inspector-step-summary" title={summary}>
            {summary}
          </span>
          <span className="msqdx-flow-inspector-chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </button>
        {open ? (
          <div className="msqdx-flow-inspector-step-body">
            {step.result ? (
              <InspectorField label="Result" tone="result">
                <pre className="msqdx-flow-inspector-pre">{step.result}</pre>
              </InspectorField>
            ) : null}
            {step.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="msqdx-flow-inspector-shot"
                src={step.imageUrl}
                alt={`Screenshot step ${step.step ?? ''}`}
              />
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  )
}

export function CollectionFlowNodeInspector({
  open,
  node,
  runState,
  inspector,
  jobSummary,
  verdict,
  lastRun,
  bindSourceLabel,
  edges = [],
  rfNodes = [],
  audionCatalog,
  onClose,
  onAppendOutputToNote,
  onUpdate,
}: {
  open: boolean
  node: CollectionFlowNode
  runState: FlowNodeRunState
  inspector?: FlowNodeInspectorData | null
  jobSummary?: FlowJobRunSummary | null
  verdict?: CollectionVerdict | null
  lastRun?: CollectionFlowLastRun | null
  bindSourceLabel?: string | null
  edges?: CollectionFlowRfEdge[]
  rfNodes?: CollectionFlowRfNode[]
  audionCatalog?: {
    personas: Array<{ id: string; name: string }>
    targetGroups: Array<{ id: string; name: string; segment?: string }>
  }
  onClose: () => void
  onAppendOutputToNote?: () => void
  onUpdate?: (nodeId: string, patch: Partial<CollectionFlowNode>) => void
}) {
  const steps = inspector?.steps ?? []
  const [focusField, setFocusField] = useState<'path' | 'value' | 'alias' | 'url' | 'text' | 'note'>(
    'path'
  )

  useEffect(() => {
    setFocusField('path')
  }, [node.id])

  const isQualityNode =
    node.kind === 'scan' ||
    node.kind === 'domain_scan' ||
    node.kind === 'geo_job' ||
    node.kind === 'compare' ||
    node.kind === 'set' ||
    node.kind === 'score_gate' ||
    node.kind === 'issue_gate' ||
    node.kind === 'geo_gate' ||
    node.kind === 'quality_ok'

  const nodeById = useMemo(() => nodeRefsFromRfNodes(rfNodes), [rfNodes])

  const upstreamGroups = useMemo(
    () => upstreamInputsForNode(node.id, edges, nodeById, lastRun?.context ?? null),
    [node.id, edges, nodeById, lastRun?.context]
  )

  const globalContextSchema = useMemo(
    () => globalContextSchemaForest(lastRun?.context ?? null),
    [lastRun?.context]
  )

  const outputSchema = useMemo(
    () => nodeOutputSchema(node.id, node.kind, lastRun?.context ?? null, node.alias),
    [node.alias, node.id, node.kind, lastRun?.context]
  )

  const insertPath = useCallback(
    (path: string) => {
      if (!onUpdate) return
      const expr = path.includes("$('")
        ? formatExpressionForPath(path)
        : formatExpressionForPath(path)

      if (focusField === 'text') {
        onUpdate(node.id, { text: expr })
        return
      }
      if (focusField === 'note') {
        onUpdate(node.id, { note: expr })
        return
      }
      if (focusField === 'value' && (node.kind === 'compare' || node.kind === 'set')) {
        onUpdate(node.id, { value: expr })
        return
      }
      if (focusField === 'url' && (node.kind === 'start' || node.kind === 'scan' || node.kind === 'domain_scan' || node.kind === 'geo_job')) {
        onUpdate(node.id, { url: expr })
        return
      }
      if (focusField === 'alias' && node.kind === 'set') {
        onUpdate(node.id, { alias: path.split('.').pop() || path })
        return
      }
      onUpdate(node.id, { path: expr })
    },
    [focusField, node.id, node.kind, onUpdate]
  )

  const insertUpstreamPath = useCallback(
    (sourceNodeId: string, relativePath: string) => {
      if (!onUpdate) return
      const expr = formatNodeJsonExpression(sourceNodeId, relativePath)
      if (focusField === 'value') {
        onUpdate(node.id, { value: expr })
        return
      }
      if (focusField === 'url') {
        onUpdate(node.id, { url: expr })
        return
      }
      onUpdate(node.id, { path: expr })
    },
    [focusField, node.id, node.kind, onUpdate]
  )

  const inputColumn = (
    <>
      {upstreamGroups.length === 0 ? (
        <p className="msqdx-flow-inspector-empty">
          Keine eingehenden Kanten — verbinde einen vorherigen Schritt.
        </p>
      ) : (
        upstreamGroups.map((group) => (
          <div key={group.sourceNodeId} className="msqdx-flow-node-editor-upstream">
            <div className="msqdx-flow-node-editor-upstream-head">
              <span>{group.sourceLabel}</span>
              <span className="msqdx-flow-node-editor-upstream-kind">{group.sourceKind}</span>
              <span
                className={`msqdx-flow-inspector-pill${group.hasRunData ? '' : ' msqdx-flow-inspector-pill--schema'}`}
              >
                {group.hasRunData ? 'Run' : 'Schema'}
              </span>
              {group.bindPath ? (
                <span className="msqdx-flow-inspector-pill">{group.bindPath}</span>
              ) : null}
            </div>
            <SchemaTree
              root={group.schema}
              onSelectPath={
                onUpdate
                  ? (path) => {
                      if (path.startsWith("$('")) {
                        insertPath(path)
                        return
                      }
                      insertUpstreamPath(group.sourceNodeId, path.replace(/^[^.]+\./, ''))
                    }
                  : undefined
              }
              emptyLabel="Kein Schema für diese Node."
            />
          </div>
        ))
      )}
      {globalContextSchema.length > 0 ? (
        <>
          <p className="msqdx-flow-inspector-field-label">
            {lastRun?.context?.outputs ? 'Gesamter Kontext' : 'Katalog (Schema)'}
          </p>
          <SchemaTree
            root={globalContextSchema}
            onSelectPath={onUpdate ? insertPath : undefined}
            emptyLabel="Kein Katalog verfügbar."
          />
        </>
      ) : null}
    </>
  )

  const paramsColumn = (
    <>
      {onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Name</span>
          <Input
            block
            size="sm"
            value={node.label}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate(node.id, { label: e.target.value })}
          />
        </label>
      ) : (
        <InspectorField label="Name" tone="meta">
          {node.label}
        </InspectorField>
      )}

      {(node.kind === 'prompt' ||
        node.kind === 'action' ||
        node.kind === 'message' ||
        node.kind === 'measure' ||
        node.kind === 'observe' ||
        node.kind === 'success' ||
        node.kind === 'abandon' ||
        node.kind === 'geo_job') &&
      onUpdate ? (
        <>
          <ExpressionField
            label={node.kind === 'geo_job' ? 'Queries' : 'Text'}
            value={node.text ?? ''}
            onChange={(v) => onUpdate(node.id, { text: v })}
            onFocusField={() => setFocusField('text')}
            hint="Aufgabe / Prompt — Literal oder {{ expression }}"
          />
          <ExpressionField
            label="Note"
            value={node.note ?? ''}
            onChange={(v) => onUpdate(node.id, { note: v })}
            onFocusField={() => setFocusField('note')}
            hint="Interne Notiz"
          />
        </>
      ) : node.text || node.note ? (
        <>
          {node.text ? (
            <InspectorField label="Text" tone="meta">
              <pre className="msqdx-flow-inspector-pre">{node.text}</pre>
            </InspectorField>
          ) : null}
          {node.note ? (
            <InspectorField label="Note" tone="meta">
              <pre className="msqdx-flow-inspector-pre">{node.note}</pre>
            </InspectorField>
          ) : null}
        </>
      ) : null}

      {node.kind === 'persona' && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Persona</span>
          <select
            className="msqdx-flow-rf-select"
            value={node.personaId ?? ''}
            onChange={(e) => {
              const pid = e.target.value
              const hit = audionCatalog?.personas.find((p) => p.id === pid)
              onUpdate(node.id, { personaId: pid || undefined, personaName: hit?.name })
            }}
          >
            <option value="">— Persona —</option>
            {(audionCatalog?.personas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {node.kind === 'zielgruppe' && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Zielgruppe</span>
          <select
            className="msqdx-flow-rf-select"
            value={node.targetGroupId ?? ''}
            onChange={(e) => {
              const tid = e.target.value
              const hit = audionCatalog?.targetGroups.find((t) => t.id === tid)
              onUpdate(node.id, {
                targetGroupId: tid || undefined,
                targetGroupName: hit?.name,
                segment: hit?.segment || undefined,
              })
            }}
          >
            <option value="">— Zielgruppe —</option>
            {(audionCatalog?.targetGroups ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {(node.kind === 'start' || node.kind === 'scan' || node.kind === 'domain_scan' || node.kind === 'geo_job') &&
      onUpdate ? (
        <ExpressionField
          label="URL"
          value={node.url ?? node.urlKey ?? ''}
          onChange={(v) =>
            onUpdate(node.id, node.kind === 'start' ? { urlKey: v, url: v } : { url: v })
          }
          onFocusField={() => setFocusField('url')}
          placeholder="https://… oder {{ journey.finalUrl }}"
        />
      ) : null}

      {node.kind === 'scan' && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Scan-Modus</span>
          <select
            className="msqdx-flow-rf-select"
            value={node.scanMode ?? 'single'}
            onChange={(e) => onUpdate(node.id, { scanMode: e.target.value as 'single' | 'deep' })}
          >
            {COLLECTION_SCAN_MODE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {node.kind === 'compare' && onUpdate ? (
        <>
          <ExpressionField
            label="Path"
            value={node.path ?? ''}
            onChange={(v) => onUpdate(node.id, { path: v })}
            onFocusField={() => setFocusField('path')}
            hint="Catalog path oder {{ expression }}"
          />
          <label className="msqdx-flow-rf-field">
            <span className="msqdx-flow-inspector-field-label">Op</span>
            <select
              className="msqdx-flow-rf-select"
              value={node.op ?? 'gte'}
              onChange={(e) => onUpdate(node.id, { op: e.target.value as CollectionFlowNode['op'] })}
            >
              {COLLECTION_COMPARE_OP_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <ExpressionField
            label="Value"
            value={node.value != null ? String(node.value) : ''}
            onChange={(v) => {
              const n = Number(v)
              onUpdate(node.id, {
                value:
                  v.trim() === ''
                    ? null
                    : Number.isFinite(n) && v.trim() !== '' && !v.includes('{')
                      ? n
                      : v,
              })
            }}
            onFocusField={() => setFocusField('value')}
          />
          {bindSourceLabel ? (
            <InspectorField label="Bind from" tone="meta">
              {bindSourceLabel}
            </InspectorField>
          ) : null}
        </>
      ) : null}

      {node.kind === 'set' && onUpdate ? (
        <>
          <ExpressionField
            label="Alias"
            value={node.alias ?? ''}
            onChange={(v) => onUpdate(node.id, { alias: v })}
            onFocusField={() => setFocusField('alias')}
          />
          <ExpressionField
            label="Source"
            value={node.path ?? ''}
            onChange={(v) => onUpdate(node.id, { path: v })}
            onFocusField={() => setFocusField('path')}
          />
        </>
      ) : null}

      {node.kind === 'gate' && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Condition</span>
          <select
            className="msqdx-flow-rf-select"
            value={String(node.gateCondition ?? 'goal_reached')}
            onChange={(e) => onUpdate(node.id, { gateCondition: e.target.value as CollectionFlowNode['gateCondition'] })}
          >
            {AUDION_GATE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {node.presetId ? (
        <InspectorField label="Preset" tone="meta">
          {node.presetId}
        </InspectorField>
      ) : null}
    </>
  )

  const outputColumn = (
    <>
      {outputSchema ? (
        <SchemaTree root={outputSchema} emptyLabel="Kein strukturierter Output." />
      ) : (
        <p className="msqdx-flow-inspector-empty">Kein Output-Schema für diese Node.</p>
      )}

      {node.kind === 'compare' && verdict ? (
        <div className="msqdx-flow-inspector-stats">
          <div className="msqdx-flow-inspector-stat">
            <span>Actual</span>
            <strong>
              {verdict.compareResults?.find((r) => r.nodeId === node.id)?.actual ?? '—'}
            </strong>
          </div>
          <div className="msqdx-flow-inspector-stat">
            <span>Pass</span>
            <strong>
              {verdict.compareResults?.find((r) => r.nodeId === node.id)?.passed ? 'ja' : 'nein'}
            </strong>
          </div>
        </div>
      ) : null}

      {!isQualityNode && steps.length > 0 ? (
        <>
          {onAppendOutputToNote ? (
            <Button type="button" size="sm" variant="subtle" onClick={onAppendOutputToNote}>
              Letzten Output → Note
            </Button>
          ) : null}
          <ol className="msqdx-flow-inspector-steps">
            {steps.map((s, i) => (
              <InspectorStepCard
                key={`${s.step ?? i}-${s.timestamp ?? i}`}
                step={s}
                index={i}
                isLast={i === steps.length - 1}
                defaultOpen={i === steps.length - 1}
              />
            ))}
          </ol>
        </>
      ) : null}

      {node.kind === 'gate' && inspector?.gateEvaluation ? (
        <div
          className={`msqdx-flow-inspector-gate-card${
            inspector.gateEvaluation.matched ? ' is-match' : ' is-miss'
          }`}
        >
          <span className="msqdx-flow-inspector-gate-verdict">
            {inspector.gateEvaluation.matched ? 'Match' : 'Kein Match'}
          </span>
          {inspector.gateEvaluation.evidence ? (
            <InspectorField label="Evidence" tone="result">
              {inspector.gateEvaluation.evidence}
            </InspectorField>
          ) : null}
        </div>
      ) : null}

      {jobSummary ? (
        <div className="msqdx-flow-inspector-stats">
          <div className="msqdx-flow-inspector-stat">
            <span>Run</span>
            <strong>{jobSummary.status ?? '—'}</strong>
          </div>
          <div className="msqdx-flow-inspector-stat">
            <span>Dauer</span>
            <strong>{formatSec(jobSummary.elapsedSeconds)}</strong>
          </div>
        </div>
      ) : null}
    </>
  )

  return (
    <FlowNodeEditorShell
      key={node.id}
      open={open}
      onClose={onClose}
      kind={node.kind}
      kindLabel={KIND_LABEL[node.kind] ?? node.kind}
      title={node.label || node.id}
      nodeId={node.id}
      runState={isQualityNode ? 'idle' : runState}
      input={inputColumn}
      params={paramsColumn}
      output={outputColumn}
    />
  )
}
