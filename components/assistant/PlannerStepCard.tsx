'use client'

import { useState } from 'react'
import { Button, Panel, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'

export type PlannerMetadata = {
  intent?: string
  mode?: string
  toolFamilies?: string[]
  maxToolRounds?: number
  skipTools?: boolean
  toolsOffered?: number
  source?: string
  reasoning?: string
  retrievalHits?: number
  retrievalVectorHits?: number
  retrievalTerms?: string[]
}

const INTENT_I18N: Record<string, string> = {
  project_knowledge: 'assistant.plannerIntentKnowledge',
  checkion_scan: 'assistant.plannerIntentScan',
  checkion_seo_geo: 'assistant.plannerIntentGeo',
  audion_persona: 'assistant.plannerIntentPersona',
  audion_knowledge: 'assistant.plannerIntentKnowledge',
  action_write: 'assistant.plannerIntentAction',
  general_chat: 'assistant.plannerIntentGeneral',
}

const MODE_I18N: Record<string, string> = {
  embedded_context: 'assistant.plannerModeEmbedded',
  hybrid: 'assistant.plannerModeHybrid',
  tools: 'assistant.plannerModeTools',
}

type PlannerStepCardProps = {
  planner: PlannerMetadata
}

export function PlannerStepCard({ planner }: PlannerStepCardProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const intentKey = planner.intent ? INTENT_I18N[planner.intent] : undefined
  const modeKey = planner.mode ? MODE_I18N[planner.mode] : undefined
  const intentLabel = intentKey ? t(intentKey) : planner.intent ?? '—'
  const modeLabel = modeKey ? t(modeKey) : planner.mode ?? '—'

  return (
    <Panel className="plexon-assistant-planner" data-msqdx-surface="light">
      <div className="plexon-assistant-planner-head">
        <Text role="label" as="span" className="plexon-assistant-planner-kicker">
          {t('assistant.plannerTitle')}
        </Text>
        <Text role="body" as="span" className="plexon-assistant-planner-summary">
          {intentLabel} · {modeLabel}
          {typeof planner.toolsOffered === 'number' && planner.toolsOffered > 0
            ? ` · ${planner.toolsOffered} ${t('assistant.plannerTools')}`
            : ''}
          {typeof planner.retrievalHits === 'number' && planner.retrievalHits > 0
            ? ` · ${planner.retrievalHits} ${t('assistant.plannerSources')}`
            : ''}
          {typeof planner.retrievalVectorHits === 'number' && planner.retrievalVectorHits > 0
            ? ` · ${planner.retrievalVectorHits} vector`
            : ''}
        </Text>
        <Button size="sm" variant="link" onClick={() => setOpen((v) => !v)}>
          {open ? t('assistant.plannerHide') : t('assistant.plannerDetails')}
        </Button>
      </div>
      {open ? (
        <div className="plexon-assistant-planner-details">
          {planner.reasoning ? (
            <Text role="body" as="p">
              {planner.reasoning}
            </Text>
          ) : null}
          {planner.toolFamilies && planner.toolFamilies.length > 0 ? (
            <Text role="meta" as="p">
              {t('assistant.plannerFamilies')}: {planner.toolFamilies.join(', ')}
            </Text>
          ) : null}
          {planner.retrievalTerms && planner.retrievalTerms.length > 0 ? (
            <Text role="meta" as="p">
              {t('assistant.plannerSearchTerms')}: {planner.retrievalTerms.join(', ')}
            </Text>
          ) : null}
          {planner.source ? (
            <Text role="meta" as="p">
              {t('assistant.plannerSource')}: {planner.source}
            </Text>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}
