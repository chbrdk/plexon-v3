'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, Chip, Text } from '@msqdx/ui'
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
import { IconClose } from './collection-flow-icons'

/**
 * Simplified inspector dock for a selected Collection Flow node — design fields, run steps,
 * gate section, and (for quality nodes) score/issues rolled up from the flow verdict (Wave 5–6).
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
  score_gate: 'Score Gate',
  issue_gate: 'Issue Gate',
  quality_ok: 'Quality OK',
}

const RUN_STATE_LABEL: Record<FlowNodeRunState, string> = {
  idle: 'idle',
  active: 'running',
  done: 'done',
  skipped: 'skipped',
  error: 'error',
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
    <div className={`plexon-flow-inspector-field plexon-flow-inspector-field--${tone}`}>
      <span className="plexon-flow-inspector-field-label">{label}</span>
      <div
        className={`plexon-flow-inspector-field-value${mono ? ' plexon-flow-inspector-field-value--mono' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}

function InspectorSection({
  title,
  tone = 'meta',
  defaultOpen = true,
  children,
  meta,
}: {
  title: string
  tone?: 'meta' | 'gate' | 'design' | 'run' | 'quality'
  defaultOpen?: boolean
  children: ReactNode
  meta?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`plexon-flow-inspector-section plexon-flow-inspector-section--${tone}`}>
      <button
        type="button"
        className="plexon-flow-inspector-section-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="plexon-flow-inspector-section-title">{title}</span>
        {meta ? <span className="plexon-flow-inspector-section-meta">{meta}</span> : null}
        <span className="plexon-flow-inspector-chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? <div className="plexon-flow-inspector-section-body">{children}</div> : null}
    </section>
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
    <li className={`plexon-flow-inspector-step-item${isLast ? ' is-latest' : ''}`}>
      <article className="plexon-flow-inspector-step">
        <button
          type="button"
          className="plexon-flow-inspector-step-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="plexon-flow-inspector-step-num">#{step.step ?? index + 1}</span>
          <span className="plexon-flow-inspector-action-badge">{actionLabel}</span>
          <span className="plexon-flow-inspector-step-summary" title={summary}>
            {summary}
          </span>
          <span className="plexon-flow-inspector-chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </button>

        {open ? (
          <div className="plexon-flow-inspector-step-body">
            <div className="plexon-flow-inspector-step-meta-row">
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
                <pre className="plexon-flow-inspector-pre">{step.result}</pre>
              </InspectorField>
            ) : null}
            {step.reasoning ? (
              <InspectorField label="Reasoning" tone="reasoning">
                <pre className="plexon-flow-inspector-pre">{step.reasoning}</pre>
              </InspectorField>
            ) : null}
            {step.imageUrl ? (
              <InspectorField label="Screenshot" tone="meta">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="plexon-flow-inspector-shot"
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
    node.kind === 'scan' || node.kind === 'score_gate' || node.kind === 'issue_gate' || node.kind === 'quality_ok'

  const gateBranchLabel = useMemo(() => {
    if (!verdict) return null
    if (node.kind === 'score_gate') return verdict.scorePassed ? 'pass' : 'fail'
    if (node.kind === 'issue_gate') return verdict.issueGatePassed ? 'pass' : 'fail'
    return null
  }, [node.kind, verdict])

  return (
    <div
      className={`plexon-flow-inspector-body plexon-flow-inspector-body--${node.kind}`}
      aria-label="Node Inspector"
    >
      <header className="plexon-flow-inspector-head">
        <div className="plexon-flow-inspector-head-main">
          <div className="plexon-flow-inspector-badges">
            <Chip size="sm" static className={`plexon-flow-inspector-kind plexon-flow-inspector-kind--${node.kind}`}>
              {KIND_LABEL[node.kind] ?? node.kind}
            </Chip>
            {!isQualityNode ? (
              <Chip size="sm" static className={`plexon-flow-inspector-run plexon-flow-inspector-run--${runState}`}>
                {RUN_STATE_LABEL[runState]}
              </Chip>
            ) : null}
          </div>
          <Text role="headline" as="h2" className="plexon-flow-inspector-title">
            {node.label || node.id}
          </Text>
          <p className="plexon-flow-inspector-id">{node.id}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="plexon-flow-toolbar-btn"
          aria-label="Inspector schließen"
          title="Schließen"
          icon={<IconClose />}
          onClick={onClose}
        />
      </header>

      {node.text || node.note ? (
        <InspectorSection title="Design" tone="design" defaultOpen={false}>
          {node.text ? (
            <InspectorField label="Text" tone="meta">
              <pre className="plexon-flow-inspector-pre">{node.text}</pre>
            </InspectorField>
          ) : null}
          {node.note ? (
            <InspectorField label="Note" tone="meta">
              <pre className="plexon-flow-inspector-pre">{node.note}</pre>
            </InspectorField>
          ) : null}
          {node.kind === 'start' && (node.urlKey || node.url) ? (
            <InspectorField label="urlKey" tone="target" mono>
              {node.urlKey || node.url}
            </InspectorField>
          ) : null}
          {node.kind === 'scan' && node.url ? (
            <InspectorField label="URL" tone="target" mono>
              {node.url}
            </InspectorField>
          ) : null}
        </InspectorSection>
      ) : null}

      {isQualityNode ? (
        <InspectorSection
          title="Quality"
          tone="quality"
          defaultOpen
          meta={
            gateBranchLabel ? (
              <span className={`plexon-flow-inspector-pill plexon-flow-inspector-pill--${gateBranchLabel}`}>
                {gateBranchLabel}
              </span>
            ) : null
          }
        >
          {node.kind === 'score_gate' ? (
            <div className="plexon-flow-inspector-stats">
              <div className="plexon-flow-inspector-stat">
                <span>Score</span>
                <strong>{verdict?.overallScore ?? '—'}</strong>
              </div>
              <div className="plexon-flow-inspector-stat">
                <span>Threshold</span>
                <strong>{node.threshold ?? verdict?.threshold ?? '—'}</strong>
              </div>
              <div className="plexon-flow-inspector-stat">
                <span>Pass</span>
                <strong>{verdict ? (verdict.scorePassed ? 'ja' : 'nein') : '—'}</strong>
              </div>
            </div>
          ) : null}
          {node.kind === 'issue_gate' ? (
            <div className="plexon-flow-inspector-stats">
              <div className="plexon-flow-inspector-stat">
                <span>Condition</span>
                <strong>{node.gateCondition ?? 'critical_issues'}</strong>
              </div>
              <div className="plexon-flow-inspector-stat">
                <span>Critical</span>
                <strong>{verdict?.criticalCount ?? '—'}</strong>
              </div>
              <div className="plexon-flow-inspector-stat">
                <span>Issues</span>
                <strong>{verdict?.issueCount ?? '—'}</strong>
              </div>
              <div className="plexon-flow-inspector-stat">
                <span>Pass</span>
                <strong>{verdict ? (verdict.issueGatePassed ? 'ja' : 'nein') : '—'}</strong>
              </div>
            </div>
          ) : null}
          {node.kind === 'scan' ? (
            <div className="plexon-flow-inspector-stats">
              <div className="plexon-flow-inspector-stat">
                <span>Score</span>
                <strong>{verdict?.overallScore ?? '—'}</strong>
              </div>
              <div className="plexon-flow-inspector-stat">
                <span>Evidence</span>
                <strong>{verdict ? (verdict.pageEvidenceValid ? 'valid' : 'invalid') : '—'}</strong>
              </div>
            </div>
          ) : null}
          {node.kind === 'quality_ok' ? (
            <p className="plexon-flow-inspector-empty">
              {verdict?.terminalKind === 'quality_ok'
                ? 'Erreicht — Collection-Kriterien im letzten Run erfüllt.'
                : 'Noch nicht erreicht.'}
            </p>
          ) : null}
        </InspectorSection>
      ) : null}

      {jobSummary ? (
        <InspectorSection
          title="Run"
          tone="run"
          defaultOpen
          meta={
            <span className="plexon-flow-inspector-pill">
              {jobSummary.status ?? '—'} · {formatSec(jobSummary.elapsedSeconds)}
            </span>
          }
        >
          <div className="plexon-flow-inspector-stats">
            <div className="plexon-flow-inspector-stat">
              <span>Status</span>
              <strong>{jobSummary.status ?? '—'}</strong>
            </div>
            <div className="plexon-flow-inspector-stat">
              <span>Steps</span>
              <strong>{jobSummary.stepCount}</strong>
            </div>
            <div className="plexon-flow-inspector-stat">
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
        </InspectorSection>
      ) : null}

      {!isQualityNode ? (
        steps.length ? (
          <InspectorSection
            title="Execution"
            tone="meta"
            defaultOpen
            meta={<span className="plexon-flow-inspector-pill">{steps.length} steps</span>}
          >
            {canAppend ? (
              <Button type="button" size="sm" variant="subtle" onClick={onAppendOutputToNote}>
                Letzten Output → Note
              </Button>
            ) : null}
            <ol className="plexon-flow-inspector-steps">
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
          </InspectorSection>
        ) : (
          <InspectorSection title="Execution" tone="meta" defaultOpen>
            <p className="plexon-flow-inspector-empty">
              Noch keine Steps auf dieser Node — Testen starten.
            </p>
          </InspectorSection>
        )
      ) : null}

      {node.kind === 'gate' && inspector?.gateEvaluation ? (
        <InspectorSection title="Gate" tone="gate" defaultOpen>
          <div
            className={`plexon-flow-inspector-gate-card${
              inspector.gateEvaluation.matched ? ' is-match' : ' is-miss'
            }`}
          >
            <span className="plexon-flow-inspector-gate-verdict">
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
        </InspectorSection>
      ) : null}
    </div>
  )
}
