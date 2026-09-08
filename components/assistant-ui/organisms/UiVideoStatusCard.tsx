'use client'

import {
  Button,
  ChatBlockPanel,
  ChatKeyValueList,
  ChatStepList,
  Text,
} from '@msqdx/ui'
import type { videoStatusCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof videoStatusCardPropsSchema>

function mapStepStatus(
  status: NonNullable<Props['steps']>[number]['status'],
): 'pending' | 'running' | 'done' | 'error' {
  if (status === 'done') return 'done'
  if (status === 'running') return 'running'
  if (status === 'failed') return 'error'
  return 'pending'
}

/**
 * Generative `video_status_card` — compact VIDEON media / analysis status.
 * Spec: assistant-videon-mcp.md
 */
export function UiVideoStatusCard({ title, href, rows, steps }: Props) {
  return (
    <div data-plexon-assistant-ui className="plexon-video-status-card">
      <ChatBlockPanel title={title ?? 'VIDEON Status'} eyebrow="videon">
        <ChatKeyValueList items={rows} />
        {steps && steps.length > 0 ? (
          <ChatStepList
            className="plexon-video-status-steps"
            steps={steps.map((s) => ({
              id: s.id,
              label: s.label,
              status: mapStepStatus(s.status),
            }))}
          />
        ) : null}
        {href ? (
          <div className="plexon-video-status-actions">
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
            >
              In VIDEON öffnen
            </Button>
          </div>
        ) : (
          <Text role="meta">Kein Deep-Link</Text>
        )}
      </ChatBlockPanel>
    </div>
  )
}
