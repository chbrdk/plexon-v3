'use client'

import { ChatAlertBlock } from '@msqdx/ui'
import type { alertPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof alertPropsSchema>

/** Generative `alert` — shared ChatAlertBlock chrome. */
export function UiAlertBlock(props: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatAlertBlock title={props.title} message={props.message} tone={props.tone} />
    </div>
  )
}
