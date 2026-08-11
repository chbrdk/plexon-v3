'use client'

import { ChatBlockPanel, ChatDataTable } from '@msqdx/ui'
import type { dataTablePropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { stripChatEmoticons } from '@/lib/assistant/format-chat-answer'
import { sanitizeUiCellText } from '@/lib/assistant/ui-blocks/sanitize-props'

type Props = z.infer<typeof dataTablePropsSchema>

/** Generative `data_table` — shared ChatDataTable chrome. */
export function UiDataTable({ title, columns, rows }: Props) {
  const cleanTitle = title ? stripChatEmoticons(title).trim() || undefined : undefined
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={cleanTitle} eyebrow="table" flush>
        <ChatDataTable
          columns={columns.map((col) => sanitizeUiCellText(col))}
          rows={rows.map((row) => row.map((cell) => sanitizeUiCellText(cell)))}
        />
      </ChatBlockPanel>
    </div>
  )
}
