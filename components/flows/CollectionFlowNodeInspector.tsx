'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, FlowInspectorShell, type FlowInspectorSection } from '@msqdx/ui'
import type {
  CollectionFlowNode,
  CollectionFlowNodeKind,
  CollectionVerdict,
} from '@/lib/collection-test-flow'
import type {
  FlowJobRunSummary,
  FlowNodeInspectorData,
  FlowNodeInspectorStep,
  FlowNodeRunState,
} from '@/lib/collection-flow-run-progress'

/**
 * Collection Flow node inspector — domain sections inside DS FlowInspectorShell.
 * @see specs/domain/collection-test-flow.md — Wave 5–7 implementation notes
 */

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
  score_gate: 'Score Gate',
  issue_gate: 'Issue Gate',
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
            <div className="msqdx-flow-inspector-step-meta-row">
              <span>{step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : '—'}</span>
            </div>
            {step.action ? (
              <InspectorField label="Action" tone="action">
                {step.action}
              </InspectorField>
            ) : null}
            {step.target ? (
              <InspectorField label="Target" tone="target" mono>
                {step.target}
              </InspectorField>
            ) : null}
            {step.result ? (
              <InspectorField label="Result" tone="result">
                <pre className="msqdx-flow-inspector-pre">{step.result}</pre>
              </InspectorField>
            ) : null}
            {step.reasoning ? (
              <InspectorField label="Reasoning" tone="reasoning">
                <pre className="msqdx-flow-inspector-pre">{step.reasoning}</pre>
              </InspectorField>
            ) : null}
            {step.imageUrl ? (
              <InspectorField label="Screenshot" tone="meta">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="msqdx-flow-inspector-shot"
                  src={step.imageUrl}
                  alt={`Screenshot step ${step.step ?? ''}`}
                />
              </InspectorField>
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  )
}

export function CollectionFlowNodeInspector({
  node,
  runState,
  inspector,
  jobSummary,
  verdict,
  onClose,
  onAppendOutputToNote,
}: {
  node: CollectionFlowNode
  runState: FlowNodeRunState
  inspector?: FlowNodeInspectorData | null
  jobSummary?: FlowJobRunSummary | null
  verdict?: CollectionVerdict | null
  onClose: () => void
  onAppendOutputToNote?: () => void
}) {
  const steps = inspector?.steps ?? []
  const [expandedLatest, setExpandedLatest] = useState(true)

  useEffect(() => {
    setExpandedLatest(true)
  }, [node.id, steps.length])

  const lastStep = steps.length ? steps[steps.length - 1] : null
  const canAppend = Boolean(onAppendOutputToNote) && Boolean(lastStep?.result || lastStep?.reasoning)
  const isQualityNode =
    node.kind === 'scan' ||
    node.kind === 'domain_scan' ||
    node.kind === 'score_gate' ||
    node.kind === 'issue_gate' ||
    node.kind === 'quality_ok'

  const gateBranchLabel = useMemo(() => {
    if (!verdict) return null
    if (node.kind === 'score_gate') return verdict.scorePassed ? 'pass' : 'fail'
    if (node.kind === 'issue_gate') return verdict.issueGatePassed ? 'pass' : 'fail'
    return null
  }, [node.kind, verdict])

  const sections = useMemo((): FlowInspectorSection[] => {
    const out: FlowInspectorSection[] = []

    if (
      node.text ||
      node.note ||
      node.kind === 'start' ||
      node.kind === 'scan' ||
      node.kind === 'domain_scan'
    ) {
      out.push({
        id: 'design',
        title: 'Design',
        defaultOpen: false,
        children: (
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
            {node.kind === 'start' && (node.urlKey || node.url) ? (
              <InspectorField label="urlKey" tone="target" mono>
                {node.urlKey || node.url}
              </InspectorField>
            ) : null}
            {node.kind === 'scan' || node.kind === 'domain_scan' ? (
              <>
                {node.url ? (
                  <InspectorField label="URL" tone="target" mono>
                    {node.url}
                  </InspectorField>
                ) : null}
                {node.kind === 'scan' ? (
                  <InspectorField label="Mode" tone="meta" mono>
                    {node.scanMode ?? 'single'}
                  </InspectorField>
                ) : null}
                {node.kind === 'domain_scan' && node.maxPages != null ? (
                  <InspectorField label="Max pages" tone="meta" mono>
                    {node.maxPages}
                  </InspectorField>
                ) : null}
              </>
            ) : null}
          </>
        ),
      })
    }

    if (isQualityNode) {
      out.push({
        id: 'quality',
        title: 'Quality',
        defaultOpen: true,
        meta: gateBranchLabel ? (
          <span className={`msqdx-flow-inspector-pill msqdx-flow-inspector-pill--${gateBranchLabel}`}>
            {gateBranchLabel}
          </span>
        ) : undefined,
        children: (
          <>
            {node.kind === 'score_gate' ? (
              <div className="msqdx-flow-inspector-stats">
                <div className="msqdx-flow-inspector-stat">
                  <span>Kind</span>
                  <strong>{node.scoreKind ?? 'overall'}</strong>
                </div>
                <div className="msqdx-flow-inspector-stat">
                  <span>Score</span>
                  <strong>{verdict?.overallScore ?? '—'}</strong>
                </div>
                <div className="msqdx-flow-inspector-stat">
                  <span>Threshold</span>
                  <strong>{node.threshold ?? verdict?.threshold ?? '—'}</strong>
                </div>
                <div className="msqdx-flow-inspector-stat">
                  <span>Pass</span>
                  <strong>{verdict ? (verdict.scorePassed ? 'ja' : 'nein') : '—'}</strong>
                </div>
              </div>
            ) : null}
            {node.kind === 'issue_gate' ? (
              <div className="msqdx-flow-inspector-stats">
                <div className="msqdx-flow-inspector-stat">
                  <span>Condition</span>
                  <strong>{node.gateCondition ?? 'critical_issues'}</strong>
                </div>
                <div className="msqdx-flow-inspector-stat">
                  <span>Critical</span>
                  <strong>{verdict?.criticalCount ?? '—'}</strong>
                </div>
                <div className="msqdx-flow-inspector-stat">
                  <span>Issues</span>
                  <strong>{verdict?.issueCount ?? '—'}</strong>
                </div>
                <div className="msqdx-flow-inspector-stat">
                  <span>Pass</span>
                  <strong>{verdict ? (verdict.issueGatePassed ? 'ja' : 'nein') : '—'}</strong>
                </div>
              </div>
            ) : null}
            {node.kind === 'scan' ? (
              <div className="msqdx-flow-inspector-stats">
                <div className="msqdx-flow-inspector-stat">
                  <span>Score</span>
                  <strong>{verdict?.overallScore ?? '—'}</strong>
                </div>
                <div className="msqdx-flow-inspector-stat">
                  <span>Evidence</span>
                  <strong>{verdict ? (verdict.pageEvidenceValid ? 'valid' : 'invalid') : '—'}</strong>
                </div>
              </div>
            ) : null}
            {node.kind === 'quality_ok' ? (
              <p className="msqdx-flow-inspector-empty">
                {verdict?.terminalKind === 'quality_ok'
                  ? 'Erreicht — Collection-Kriterien im letzten Run erfüllt.'
                  : 'Noch nicht erreicht.'}
              </p>
            ) : null}
          </>
        ),
      })
    }

    if (jobSummary) {
      out.push({
        id: 'run',
        title: 'Run',
        defaultOpen: true,
        meta: (
          <span className="msqdx-flow-inspector-pill">
            {jobSummary.status ?? '—'} · {formatSec(jobSummary.elapsedSeconds)}
          </span>
        ),
        children: (
          <>
            <div className="msqdx-flow-inspector-stats">
              <div className="msqdx-flow-inspector-stat">
                <span>Status</span>
                <strong>{jobSummary.status ?? '—'}</strong>
              </div>
              <div className="msqdx-flow-inspector-stat">
                <span>Steps</span>
                <strong>{jobSummary.stepCount}</strong>
              </div>
              <div className="msqdx-flow-inspector-stat">
                <span>Dauer</span>
                <strong>{formatSec(jobSummary.elapsedSeconds)}</strong>
              </div>
            </div>
            {jobSummary.jobId ? (
              <InspectorField label="Job ID" tone="meta" mono>
                {jobSummary.jobId}
              </InspectorField>
            ) : null}
            {jobSummary.finalUrl ? (
              <InspectorField label="Final URL" tone="target" mono>
                {jobSummary.finalUrl}
              </InspectorField>
            ) : null}
            {jobSummary.error ? (
              <InspectorField label="Error" tone="error">
                {jobSummary.error}
              </InspectorField>
            ) : null}
          </>
        ),
      })
    }

    if (!isQualityNode) {
      out.push({
        id: 'execution',
        title: 'Execution',
        defaultOpen: true,
        meta: steps.length ? (
          <span className="msqdx-flow-inspector-pill">{steps.length} steps</span>
        ) : undefined,
        children: steps.length ? (
          <>
            {canAppend ? (
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
                  defaultOpen={i === steps.length - 1 && expandedLatest}
                />
              ))}
            </ol>
          </>
        ) : (
          <p className="msqdx-flow-inspector-empty">
            Noch keine Steps auf dieser Node — Testen starten.
          </p>
        ),
      })
    }

    if (node.kind === 'gate' && inspector?.gateEvaluation) {
      out.push({
        id: 'gate',
        title: 'Gate',
        defaultOpen: true,
        children: (
          <div
            className={`msqdx-flow-inspector-gate-card${
              inspector.gateEvaluation.matched ? ' is-match' : ' is-miss'
            }`}
          >
            <span className="msqdx-flow-inspector-gate-verdict">
              {inspector.gateEvaluation.matched ? 'Match' : 'Kein Match'}
            </span>
            {inspector.gateEvaluation.condition ? (
              <InspectorField label="Condition" tone="meta" mono>
                {inspector.gateEvaluation.condition}
              </InspectorField>
            ) : null}
            {inspector.gateEvaluation.evidence ? (
              <InspectorField label="Evidence" tone="result">
                {inspector.gateEvaluation.evidence}
              </InspectorField>
            ) : null}
          </div>
        ),
      })
    }

    return out
  }, [
    canAppend,
    expandedLatest,
    gateBranchLabel,
    inspector?.gateEvaluation,
    isQualityNode,
    jobSummary,
    node,
    onAppendOutputToNote,
    steps,
    verdict,
  ])

  return (
    <FlowInspectorShell
      key={node.id}
      kind={node.kind}
      kindLabel={KIND_LABEL[node.kind] ?? node.kind}
      title={node.label || node.id}
      nodeId={node.id}
      runState={isQualityNode ? 'idle' : runState}
      onClose={onClose}
      sections={sections}
      aria-label="Node Inspector"
    />
  )
}
