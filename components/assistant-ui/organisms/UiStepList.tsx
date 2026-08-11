'use client'

import { ChatBlockPanel, ChatStepList } from '@msqdx/ui'
import type { stepListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof stepListPropsSchema>

/** Generative `step_list` — shared ChatStepList chrome. */
export function UiStepList({ title, steps }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title ?? 'Workflow'} eyebrow="steps">
        <ChatStepList steps={steps} />
      </ChatBlockPanel>
    </div>
  )
}
