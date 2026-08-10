'use client'

import { Panel, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'

const PHASE_LABELS: Record<string, string> = {
  planning: 'assistant.phasePlanning',
  retrieval: 'assistant.phaseRetrieval',
  executing: 'assistant.phaseExecuting',
  tools: 'assistant.phaseTools',
  workflow: 'assistant.phaseWorkflow',
  done: 'assistant.phaseDone',
}

type AgentPhaseIndicatorProps = {
  phase: string | null
  detail?: string | null
}

/** Compact phase row — same density as AgentActivityTrace head. */
export function AgentPhaseIndicator({ phase, detail }: AgentPhaseIndicatorProps) {
  const { t } = useI18n()
  if (!phase || phase === 'done') return null

  const labelKey = PHASE_LABELS[phase] ?? 'assistant.thinking'
  return (
    <Panel variant="flush" className="plexon-assistant-phase" data-phase={phase}>
      <div className="plexon-assistant-phase-row">
        <Spinner size="sm" />
        <Text role="meta" as="p" className="plexon-assistant-phase-label">
          {t(labelKey)}
          {detail ? ` — ${detail}` : ''}
        </Text>
      </div>
    </Panel>
  )
}
