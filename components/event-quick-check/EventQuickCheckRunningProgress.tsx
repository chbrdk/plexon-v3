'use client'

import { Spinner, Text } from '@msqdx/ui'
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs'
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy'
import { eqcLiveProgressSummary } from '@/lib/assistant/event-quick-check/eqc-running-progress'

type Props = {
  steps: WorkflowStep[]
}

export function EventQuickCheckRunningProgress({ steps }: Props) {
  const summary = eqcLiveProgressSummary(steps)
  const active = summary.active
  const activeDetail =
    active?.status === 'running' && typeof active.progress === 'number'
      ? [active.detail, `${active.progress}%`].filter(Boolean).join(' · ')
      : active?.detail

  return (
    <div className="plexon-eqc-running" data-section="eqc-running-progress">
      <div className="plexon-eqc-running__hero">
        <Spinner size="sm" />
        <div className="plexon-eqc-running__copy">
          <Text role="title" as="h2">
            {active?.label ?? EQC_PAGE_COPY.runningTitle}
          </Text>
          <Text role="hint" as="p">
            {activeDetail || EQC_PAGE_COPY.runningHint}
          </Text>
          {summary.total > 0 ? (
            <p className="plexon-eqc-running__count">
              <Text role="meta" as="span">
                {EQC_PAGE_COPY.runningProgress(summary.doneCount, summary.total)}
              </Text>
            </p>
          ) : null}
        </div>
      </div>

      {summary.rows.length > 0 ? (
        <ol className="plexon-eqc-running__rail" aria-label={EQC_PAGE_COPY.runningRailLabel}>
          {summary.rows.map((row, index) => {
            const state =
              row.status === 'done'
                ? 'done'
                : row.status === 'error'
                  ? 'error'
                  : index === summary.activeIndex
                    ? 'active'
                    : 'pending'
            return (
              <li
                key={row.id}
                className="plexon-eqc-running__chip"
                data-state={state}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                <span className="plexon-eqc-running__dot" aria-hidden />
                <span className="plexon-eqc-running__chip-label">{row.label}</span>
              </li>
            )
          })}
        </ol>
      ) : null}
    </div>
  )
}
