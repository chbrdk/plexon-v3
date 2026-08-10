'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import {
  Button,
  ExpressionField,
  FlowNodeEditorShell,
  Input,
  SCHEMA_TREE_PATH_MIME,
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
import { COLLECTION_FLOW_KIND_LABEL as KIND_LABEL } from '@/lib/collection-flow-kind-labels'
import { COLLECTION_MEASURE_KEY_OPTIONS } from '@/lib/collection-flow-presets'
import {
  patchLabelFromUrlIfGeneric,
  summarizeFlowUrl,
} from '@/lib/collection-flow-url'
import {
  formatExpressionForPath,
  formatNodeJsonExpression,
} from '@/lib/collection-flow-expression'
import {
  nodeOutputSchema,
  nodeRefsFromRfNodes,
  relativePathForInspectorInsert,
  upstreamInputsForNode,
} from '@/lib/collection-flow-inspector-inputs'
import type {
  FlowJobRunSummary,
  FlowNodeInspectorData,
  FlowNodeInspectorStep,
  FlowNodeRunState,
} from '@/lib/collection-flow-run-progress'
import { useI18n } from '@/components/i18n/I18nProvider'

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

type InspectorFocusField = 'path' | 'value' | 'alias' | 'url' | 'text' | 'note'

function defaultFocusFieldForNode(kind: CollectionFlowNodeKind | string): InspectorFocusField {
  if (
    kind === 'prompt' ||
    kind === 'action' ||
    kind === 'message' ||
    kind === 'measure' ||
    kind === 'observe' ||
    kind === 'success' ||
    kind === 'abandon'
  ) {
    return 'text'
  }
  if (kind === 'compare') return 'path'
  if (kind === 'set') return 'alias'
  if (kind === 'start' || kind === 'scan' || kind === 'domain_scan' || kind === 'geo_job') return 'url'
  return 'path'
}

function blockSchemaPathDrop(event: DragEvent) {
  if (!Array.from(event.dataTransfer.types).includes(SCHEMA_TREE_PATH_MIME)) return
  event.preventDefault()
  event.stopPropagation()
}

function urlKindDefaultLabel(kind: CollectionFlowNodeKind | string): string | null {
  if (kind === 'start') return KIND_LABEL.start
  if (kind === 'scan') return KIND_LABEL.scan
  if (kind === 'domain_scan') return KIND_LABEL.domain_scan
  if (kind === 'geo_job') return KIND_LABEL.geo_job
  return null
}

function patchFromUrlInput(
  node: CollectionFlowNode,
  url: string
): Partial<CollectionFlowNode> {
  const defaultLabel = urlKindDefaultLabel(node.kind)
  const patch: Partial<CollectionFlowNode> =
    node.kind === 'start' ? { urlKey: url, url } : { url }
  if (defaultLabel) {
    const nextLabel = patchLabelFromUrlIfGeneric(node.label, defaultLabel, url)
    if (nextLabel) patch.label = nextLabel
  }
  return patch
}

function gateNeedsPattern(gateCondition: string | undefined): boolean {
  return gateCondition === 'url_match' || gateCondition === 'title_match'
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
  brandionCatalog,
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
  brandionCatalog?: {
    guidelines: Array<{ id: string; name: string }>
  }
  onClose: () => void
  onAppendOutputToNote?: () => void
  onUpdate?: (nodeId: string, patch: Partial<CollectionFlowNode>) => void
}) {
  const { t } = useI18n()
  const steps = inspector?.steps ?? []
  const [focusField, setFocusField] = useState<InspectorFocusField>(() =>
    defaultFocusFieldForNode(node.kind)
  )

  useEffect(() => {
    setFocusField(defaultFocusFieldForNode(node.kind))
  }, [node.id, node.kind])

  const isQualityNode =
    node.kind === 'scan' ||
    node.kind === 'domain_scan' ||
    node.kind === 'geo_job' ||
    node.kind === 'brand_measure' ||
    node.kind === 'guideline' ||
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

  const outputSchema = useMemo(
    () => nodeOutputSchema(node.id, node.kind, lastRun?.context ?? null, node.alias),
    [node.alias, node.id, node.kind, lastRun?.context]
  )

  const insertPath = useCallback(
    (path: string) => {
      if (!onUpdate) return
      const expr = formatExpressionForPath(path)

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
        onUpdate(node.id, node.kind === 'start' ? { urlKey: expr, url: expr } : { url: expr })
        return
      }
      if (focusField === 'alias' && node.kind === 'set') {
        onUpdate(node.id, { alias: path.split('.').pop() || path })
        return
      }
      // compare / set path: keep `$('id').json…` or catalog path resolvable without forcing braces
      const bare =
        path.startsWith("$('") || path.startsWith('{{')
          ? path.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim()
          : path.trim()
      onUpdate(node.id, { path: bare })
    },
    [focusField, node.id, node.kind, onUpdate]
  )

  const insertUpstreamPath = useCallback(
    (sourceNodeId: string, relativePath: string) => {
      if (!onUpdate) return
      const expr = formatNodeJsonExpression(sourceNodeId, relativePath)
      const bare = expr.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim()
      if (focusField === 'text') {
        onUpdate(node.id, { text: expr })
        return
      }
      if (focusField === 'note') {
        onUpdate(node.id, { note: expr })
        return
      }
      if (focusField === 'value') {
        onUpdate(node.id, { value: expr })
        return
      }
      if (focusField === 'url') {
        onUpdate(node.id, node.kind === 'start' ? { urlKey: expr, url: expr } : { url: expr })
        return
      }
      if (focusField === 'alias' && node.kind === 'set') {
        onUpdate(node.id, { alias: relativePath.split('.').pop() || relativePath || sourceNodeId })
        return
      }
      onUpdate(node.id, { path: bare })
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
        upstreamGroups.map((group) => {
          // Show field forest directly (skip cryptic $('id').json root wrapper).
          const treeRoot =
            group.schema.children && group.schema.children.length > 0
              ? group.schema.children
              : group.schema
          return (
            <div key={group.sourceNodeId} className="msqdx-flow-node-editor-upstream">
              <div className="msqdx-flow-node-editor-upstream-head">
                <span>{group.sourceLabel}</span>
                <span className="msqdx-flow-node-editor-upstream-kind">{group.sourceKind}</span>
                <span
                  className={`msqdx-flow-inspector-pill${group.hasRunData ? '' : ' msqdx-flow-inspector-pill--schema'}`}
                >
                  {group.hasRunData ? 'Output' : 'Schema'}
                </span>
                {group.bindPath ? (
                  <span className="msqdx-flow-inspector-pill">{group.bindPath}</span>
                ) : null}
              </div>
              <SchemaTree
                root={treeRoot}
                onSelectPath={
                  onUpdate
                    ? (path) => {
                        const rel = relativePathForInspectorInsert(path, group.sourceNodeId)
                        insertUpstreamPath(group.sourceNodeId, rel)
                      }
                    : undefined
                }
                emptyLabel="Kein Schema für diese Node."
              />
            </div>
          )
        })
      )}
    </>
  )

  const paramsColumn = (
    <>
      {onUpdate ? (
        <label
          className="msqdx-flow-rf-field"
          onDragOver={blockSchemaPathDrop}
          onDrop={blockSchemaPathDrop}
        >
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
          <span className="msqdx-flow-inspector-field-label">
            {t('projects.detail.flowZielgruppe')}
          </span>
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
            <option value="">— {t('projects.detail.flowZielgruppe')} —</option>
            {(audionCatalog?.targetGroups ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {(node.kind === 'guideline' || node.kind === 'brand_measure') && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">
            {t('projects.detail.flowGuideline')}
          </span>
          <select
            className="msqdx-flow-rf-select"
            value={node.guidelineId ?? ''}
            onChange={(e) => {
              const gid = e.target.value
              onUpdate(node.id, { guidelineId: gid || undefined })
            }}
          >
            <option value="">— {t('projects.detail.flowGuideline')} —</option>
            {(brandionCatalog?.guidelines ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {node.kind === 'brand_measure' && onUpdate ? (
        <>
          <label className="msqdx-flow-rf-field">
            <span className="msqdx-flow-inspector-field-label">
              {t('projects.detail.flowFixtureId')}
            </span>
            <Input
              block
              size="sm"
              value={node.fixtureId ?? 'demo-landing-pass'}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onUpdate(node.id, {
                  fixtureId: e.target.value.trim() || 'demo-landing-pass',
                })
              }
              placeholder="demo-landing-pass"
            />
          </label>
          <label className="msqdx-flow-rf-field">
            <span className="msqdx-flow-inspector-field-label">
              {t('projects.detail.flowAdapter')}
            </span>
            <select
              className="msqdx-flow-rf-select"
              value={node.adapter ?? 'fixture'}
              onChange={(e) => onUpdate(node.id, { adapter: e.target.value || 'fixture' })}
            >
              <option value="fixture">fixture</option>
            </select>
          </label>
        </>
      ) : null}

      {(node.kind === 'start' || node.kind === 'scan' || node.kind === 'domain_scan' || node.kind === 'geo_job') &&
      onUpdate ? (
        <ExpressionField
          label="URL"
          value={node.url ?? node.urlKey ?? ''}
          onChange={(v) => onUpdate(node.id, patchFromUrlInput(node, v))}
          onFocusField={() => setFocusField('url')}
          placeholder="https://… oder {{ journey.finalUrl }}"
        />
      ) : null}

      {node.kind === 'start' && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Max Steps</span>
          <Input
            block
            size="sm"
            type="number"
            min={1}
            max={64}
            value={node.maxSteps ?? 8}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const n = Number(e.target.value)
              onUpdate(node.id, { maxSteps: Number.isFinite(n) && n > 0 ? n : 8 })
            }}
          />
        </label>
      ) : null}

      {node.kind === 'observe' && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Beobachtungsdauer (s)</span>
          <Input
            block
            size="sm"
            type="number"
            min={1}
            max={300}
            value={node.observeSeconds ?? 30}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const n = Number(e.target.value)
              onUpdate(node.id, { observeSeconds: Number.isFinite(n) && n > 0 ? n : 30 })
            }}
          />
        </label>
      ) : null}

      {node.kind === 'measure' && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Measure Key</span>
          <select
            className="msqdx-flow-rf-select"
            value={node.measureKey ?? 'overall'}
            onChange={(e) => onUpdate(node.id, { measureKey: e.target.value })}
          >
            {COLLECTION_MEASURE_KEY_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {node.kind === 'geo_job' && onUpdate ? (
        <ExpressionField
          label="Company Name"
          value={node.companyName ?? ''}
          onChange={(v) => onUpdate(node.id, { companyName: v })}
          hint="Brand-Hinweis wenn URL leer"
        />
      ) : null}

      {node.kind === 'domain_scan' && onUpdate ? (
        <label className="msqdx-flow-rf-field">
          <span className="msqdx-flow-inspector-field-label">Max Pages</span>
          <Input
            block
            size="sm"
            type="number"
            min={1}
            max={500}
            value={node.maxPages ?? 50}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const n = Number(e.target.value)
              onUpdate(node.id, { maxPages: Number.isFinite(n) && n > 0 ? n : 50 })
            }}
          />
        </label>
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
        <>
          <label className="msqdx-flow-rf-field">
            <span className="msqdx-flow-inspector-field-label">Condition</span>
            <select
              className="msqdx-flow-rf-select"
              value={String(node.gateCondition ?? 'goal_reached')}
              onChange={(e) =>
                onUpdate(node.id, {
                  gateCondition: e.target.value as CollectionFlowNode['gateCondition'],
                })
              }
            >
              {AUDION_GATE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          {gateNeedsPattern(String(node.gateCondition ?? 'goal_reached')) ? (
            <ExpressionField
              label="Pattern"
              value={node.pattern ?? ''}
              onChange={(v) => onUpdate(node.id, { pattern: v })}
              hint="Regex für url_match / title_match"
            />
          ) : null}
        </>
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
        <SchemaTree
          root={outputSchema}
          onSelectPath={onUpdate ? insertPath : undefined}
          emptyLabel="Kein strukturierter Output."
        />
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
