'use client'

import type { ReactNode } from 'react'
import type { UiBlock } from '@/lib/assistant/ui-blocks/types'
import { parseUiBlockProps } from '@/lib/assistant/ui-blocks/validate'
import { isUiBlockPinnable } from '@/lib/assistant/reports/pin-eligibility'
import { pinKey } from '@/lib/assistant/reports/block-pin-label'
import { ReportPinButton } from '@/components/assistant/ReportPinButton'
import { useI18n } from '@/components/i18n/I18nProvider'
import { UiAlertBlock } from '@/components/assistant-ui/organisms/UiAlertBlock'
import { UiDataTable } from '@/components/assistant-ui/organisms/UiDataTable'
import { UiKeyValueList } from '@/components/assistant-ui/organisms/UiKeyValueList'
import { UiLinkList } from '@/components/assistant-ui/organisms/UiLinkList'
import { UiMarkdownBlock } from '@/components/assistant-ui/organisms/UiMarkdownBlock'
import { UiMetricGrid } from '@/components/assistant-ui/organisms/UiMetricGrid'
import { UiChartBlock } from '@/components/assistant-ui/organisms/UiChartBlock'
import { UiCornerTabSectionBlock } from '@/components/assistant-ui/organisms/UiCornerTabSectionBlock'
import { UiPersonaCardBlock } from '@/components/assistant-ui/organisms/UiPersonaCardBlock'
import { UiStepList } from '@/components/assistant-ui/organisms/UiStepList'
import { UiSummaryCard } from '@/components/assistant-ui/organisms/UiSummaryCard'
import { UiTargetGroupCardBlock } from '@/components/assistant-ui/organisms/UiTargetGroupCardBlock'
import { UiCollapsibleBlock } from '@/components/assistant-ui/organisms/UiCollapsibleBlock'
import { UiFindingList } from '@/components/assistant-ui/organisms/UiFindingList'
import { UiRecommendationList } from '@/components/assistant-ui/organisms/UiRecommendationList'
import { UiEventQuickCheckReviewGateBlock } from '@/components/assistant-ui/organisms/UiEventQuickCheckReviewGateBlock'
import { EventQuickCheckReportView } from '@/components/assistant/reports/EventQuickCheckReportView'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'

type AssistantBlockRendererProps = {
  block: UiBlock
}

export function AssistantBlockRenderer({ block }: AssistantBlockRendererProps) {
  const parsed = parseUiBlockProps(block.type, block.props)
  if (!parsed.ok) {
    return null
  }
  const props = parsed.props

  switch (block.type) {
    case 'metric_grid':
      return <UiMetricGrid {...(props as Parameters<typeof UiMetricGrid>[0])} />
    case 'alert':
      return <UiAlertBlock {...(props as Parameters<typeof UiAlertBlock>[0])} />
    case 'key_value_list':
      return <UiKeyValueList {...(props as Parameters<typeof UiKeyValueList>[0])} />
    case 'data_table':
      return <UiDataTable {...(props as Parameters<typeof UiDataTable>[0])} />
    case 'link_list':
      return <UiLinkList {...(props as Parameters<typeof UiLinkList>[0])} />
    case 'text':
      return <UiMarkdownBlock markdown={String((props as { markdown: string }).markdown)} />
    case 'persona_card':
      return <UiPersonaCardBlock {...(props as Parameters<typeof UiPersonaCardBlock>[0])} />
    case 'step_list':
      return <UiStepList {...(props as Parameters<typeof UiStepList>[0])} />
    case 'summary_card':
      return <UiSummaryCard {...(props as Parameters<typeof UiSummaryCard>[0])} />
    case 'corner_tab_section':
      return <UiCornerTabSectionBlock {...(props as Parameters<typeof UiCornerTabSectionBlock>[0])} />
    case 'target_group_card':
      return <UiTargetGroupCardBlock {...(props as Parameters<typeof UiTargetGroupCardBlock>[0])} />
    case 'chart':
      return <UiChartBlock {...(props as Parameters<typeof UiChartBlock>[0])} />
    case 'collapsible':
      return <UiCollapsibleBlock {...(props as Parameters<typeof UiCollapsibleBlock>[0])} />
    case 'finding_list':
      return <UiFindingList {...(props as Parameters<typeof UiFindingList>[0])} />
    case 'recommendation_list':
      return <UiRecommendationList {...(props as Parameters<typeof UiRecommendationList>[0])} />
    case 'event_quick_check_report': {
      const report = (props as { report: EventQuickCheckReportModel }).report
      return <EventQuickCheckReportView report={report} />
    }
    case 'event_quick_check_review_gate':
      return (
        <UiEventQuickCheckReviewGateBlock
          {...(props as Parameters<typeof UiEventQuickCheckReviewGateBlock>[0])}
        />
      )
    default:
      return null
  }
}

type AssistantMessageBlocksProps = {
  blocks: UiBlock[]
  inset?: boolean
  messageId?: string
  streaming?: boolean
  pinnedKeys?: Set<string>
  onPinToggle?: (messageId: string, block: UiBlock) => void
}

function PinnableBlockShell({
  block,
  messageId,
  streaming,
  pinnedKeys,
  onPinToggle,
  children,
}: {
  block: UiBlock
  messageId?: string
  streaming?: boolean
  pinnedKeys?: Set<string>
  onPinToggle?: (messageId: string, block: UiBlock) => void
  children: ReactNode
}) {
  const { t } = useI18n()
  const showPin = Boolean(messageId && onPinToggle && !streaming)
  const eligibility = isUiBlockPinnable(block, { streaming })
  const pinned = messageId && pinnedKeys ? pinnedKeys.has(pinKey(messageId, block.id)) : false

  const disabledReason = !eligibility.pinnable
    ? eligibility.reason === 'step_list_in_progress'
      ? t('assistant.report.pinDisabledSteps')
      : eligibility.reason === 'streaming'
        ? t('assistant.report.pinDisabledStreaming')
        : undefined
    : undefined

  return (
    <div className="plexon-assistant-block">
      <div className="plexon-assistant-block-main">{children}</div>
      {showPin ? (
        <div className="plexon-assistant-block-pin">
          <ReportPinButton
            pinned={pinned}
            disabled={!eligibility.pinnable}
            disabledReason={disabledReason}
            onToggle={() => onPinToggle!(messageId!, block)}
          />
        </div>
      ) : null}
    </div>
  )
}

export function AssistantMessageBlocks({
  blocks,
  inset = true,
  messageId,
  streaming,
  pinnedKeys,
  onPinToggle,
}: AssistantMessageBlocksProps) {
  if (blocks.length === 0) return null
  return (
    <div className={`plexon-assistant-blocks${inset ? ' is-inset' : ''}`}>
      {blocks.map((block) => (
        <PinnableBlockShell
          key={block.id}
          block={block}
          messageId={messageId}
          streaming={streaming}
          pinnedKeys={pinnedKeys}
          onPinToggle={onPinToggle}
        >
          <AssistantBlockRenderer block={block} />
        </PinnableBlockShell>
      ))}
    </div>
  )
}
