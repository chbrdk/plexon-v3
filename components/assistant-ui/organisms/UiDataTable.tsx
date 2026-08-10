'use client'

import type { dataTablePropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof dataTablePropsSchema>

export function UiDataTable({ title, columns, rows }: Props) {
  return (
    <UiBlockSurface title={title} eyebrow="table" noPadding>
      <div className="plexon-assistant-table-wrap">
        <table className="plexon-assistant-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={`row-${ri}`}>
                {columns.map((_, ci) => (
                  <td key={`${ri}-${ci}`}>{row[ci] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </UiBlockSurface>
  )
}
