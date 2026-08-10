'use client'

import { Spinner, Text } from '@msqdx/ui'
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs'
import type { stepListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof stepListPropsSchema>

function stepStatusClass(status: WorkflowStep['status']): string {
  if (status === 'running') return 'is-running'
  if (status === 'error') return 'is-error'
  if (status === 'done') return 'is-done'
  return 'is-pending'
}

export function UiStepList({ title, steps }: Props) {
  return (
    <UiBlockSurface title={title ?? 'Workflow'} eyebrow="steps">
      <ol className="plexon-assistant-steps">
        {steps.map((step, index) => {
          const status = step.status as WorkflowStep['status']
          const detailParts = [
            step.detail,
            typeof step.progress === 'number' && status === 'running' ? `${step.progress}%` : null,
          ].filter(Boolean)

          return (
            <li
              key={`${step.label}-${index}`}
              className={`plexon-assistant-step ${stepStatusClass(status)}`}
              data-status={status}
            >
              <div className="plexon-assistant-step-marker" aria-hidden>
                {status === 'running' ? <Spinner size="sm" /> : <span className="plexon-assistant-step-dot" />}
              </div>
              <div className="plexon-assistant-step-copy">
                <Text role="body" as="p" className="plexon-assistant-step-label">
                  {step.label}
                </Text>
                {detailParts.length > 0 ? (
                  <Text role="meta" as="p" className="plexon-assistant-step-detail">
                    {detailParts.join(' · ')}
                  </Text>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </UiBlockSurface>
  )
}
