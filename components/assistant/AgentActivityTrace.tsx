'use client'

import { useEffect, useState } from 'react'
import { Button, Panel, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { PlannerStepCard, type PlannerMetadata } from '@/components/assistant/PlannerStepCard'

export type AgentToolTraceItem = {
  id: string
  name: string
  status: 'running' | 'done'
  preview?: string
}

export type AgentActivityTraceState = {
  phase: string | null
  phaseDetail?: string | null
  plan: PlannerMetadata | null
  retrievalHits?: number
  retrievalVectorHits?: number
  retrievalTerms?: string[]
  thinking: string
  thinkingLive: boolean
  tools: AgentToolTraceItem[]
}

const PHASE_LABELS: Record<string, string> = {
  planning: 'assistant.phasePlanning',
  retrieval: 'assistant.phaseRetrieval',
  executing: 'assistant.phaseExecuting',
  tools: 'assistant.phaseTools',
  workflow: 'assistant.phaseWorkflow',
  done: 'assistant.phaseDone',
}

type AgentActivityTraceProps = {
  trace: AgentActivityTraceState
  active: boolean
}

export function AgentActivityTrace({ trace, active }: AgentActivityTraceProps) {
  const { t } = useI18n()
  const [thinkingOpen, setThinkingOpen] = useState(true)

  useEffect(() => {
    if (!trace.thinkingLive && trace.thinking.length > 0) {
      setThinkingOpen(false)
    }
  }, [trace.thinkingLive, trace.thinking.length])

  if (!active) return null

  const phaseKey = trace.phase ? PHASE_LABELS[trace.phase] : undefined
  const phaseLabel = phaseKey ? t(phaseKey) : t('assistant.thinking')
  const showThinkingPanel = trace.thinking.length > 0
  const phaseBusy = Boolean(trace.phase && trace.phase !== 'done')

  const plannerForCard: PlannerMetadata | null = trace.plan
    ? {
        ...trace.plan,
        retrievalHits: trace.retrievalHits,
        retrievalVectorHits: trace.retrievalVectorHits,
        retrievalTerms: trace.retrievalTerms,
      }
    : null

  return (
    <Panel className="plexon-assistant-activity" data-msqdx-surface="light">
      <div className="plexon-assistant-activity-head">
        <div className="plexon-assistant-activity-phase">
          <Text role="label" as="span">
            {t('assistant.activityTitle')}
          </Text>
          {phaseBusy ? <Spinner size="sm" /> : null}
        </div>
        <Text role="meta" as="p">
          {phaseLabel}
          {trace.phaseDetail ? ` — ${trace.phaseDetail}` : ''}
        </Text>
      </div>

      {plannerForCard?.intent ? (
        <div className="plexon-assistant-activity-section">
          <PlannerStepCard planner={plannerForCard} />
        </div>
      ) : null}

      {typeof trace.retrievalHits === 'number' && trace.retrievalHits > 0 ? (
        <div className="plexon-assistant-activity-section">
          <Text role="meta" as="p">
            {t('assistant.activityRetrieval', {
              hits: String(trace.retrievalHits),
              vector: trace.retrievalVectorHits ? ` · ${trace.retrievalVectorHits} vector` : '',
            })}
            {trace.retrievalTerms?.length ? ` — ${trace.retrievalTerms.join(', ')}` : ''}
          </Text>
        </div>
      ) : null}

      {trace.tools.length > 0 ? (
        <ul className="plexon-assistant-activity-tools">
          {trace.tools.map((tool) => (
            <li key={tool.id} className="plexon-assistant-activity-tool" data-status={tool.status}>
              <Text role="label" as="span">
                {tool.status === 'running' ? '…' : '✓'} {tool.name}
                {tool.status === 'running'
                  ? ` — ${t('assistant.toolRunning')}`
                  : ` — ${t('assistant.toolDone')}`}
              </Text>
              {tool.preview && tool.status === 'done' ? (
                <Text role="mono" as="pre" className="plexon-assistant-activity-preview">
                  {tool.preview}
                </Text>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {showThinkingPanel ? (
        <div className="plexon-assistant-activity-thinking">
          <div className="plexon-assistant-activity-thinking-head">
            <Text role="label" as="span">
              {t('assistant.thinkingTitle')}
              {trace.thinkingLive ? ` (${t('assistant.thinkingLive')})` : ''}
            </Text>
            {!trace.thinkingLive ? (
              <Button size="sm" variant="link" onClick={() => setThinkingOpen((v) => !v)}>
                {thinkingOpen ? t('assistant.thinkingHide') : t('assistant.thinkingShow')}
              </Button>
            ) : null}
          </div>
          {thinkingOpen ? (
            <pre className="plexon-assistant-activity-thinking-body">{trace.thinking}</pre>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}

export const emptyAgentActivityTrace = (): AgentActivityTraceState => ({
  phase: null,
  phaseDetail: null,
  plan: null,
  thinking: '',
  thinkingLive: false,
  tools: [],
})
