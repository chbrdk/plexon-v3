'use client'

import { Button, Panel, Text } from '@msqdx/ui'
import type { UiBlock } from '@/lib/assistant/ui-blocks/types'
import { ASSISTANT_PANEL_MIN_WIDTH } from '@/lib/assistant/ui-constants'
import { AssistantMessageBlocks } from '@/components/assistant-ui/AssistantBlockRenderer'
import { useI18n } from '@/components/i18n/I18nProvider'

type AssistantPanelProps = {
  title?: string
  blocks: UiBlock[]
  onClose: () => void
}

export function AssistantPanel({ title, blocks, onClose }: AssistantPanelProps) {
  const { t } = useI18n()
  if (blocks.length === 0) return null

  return (
    <aside
      className="plexon-assistant-side-panel"
      style={{ ['--plexon-assistant-panel-min' as string]: `${ASSISTANT_PANEL_MIN_WIDTH}px` }}
      data-plexon-assistant-ui
    >
      <Panel variant="default" className="plexon-assistant-side-panel-card">
        <header className="plexon-assistant-side-panel-head">
          <Text role="title" as="h2" className="plexon-assistant-side-panel-title">
            {title ?? t('assistant.ui.panelDefaultTitle')}
          </Text>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={t('assistant.ui.panelClose')}
            onClick={onClose}
          >
            ×
          </Button>
        </header>
        <div className="plexon-assistant-side-panel-body">
          <AssistantMessageBlocks blocks={blocks} inset={false} />
        </div>
      </Panel>
    </aside>
  )
}
