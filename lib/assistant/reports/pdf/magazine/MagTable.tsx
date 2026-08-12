import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagTableProps = {
  columns: string[]
  rows: Array<Array<string | number | null>>
}

export function MagTable({ columns, rows }: MagTableProps) {
  const width = `${100 / Math.max(columns.length, 1)}%`
  return (
    <View>
      <View style={magStyles.tableHeader}>
        {columns.map((col) => (
          <Text key={col} style={[magStyles.tableHeadCell, { width }]}>
            {col}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={magStyles.tableRow} wrap={false}>
          {columns.map((_, ci) => (
            <Text key={ci} style={[magStyles.tableCell, { width }]}>
              {row[ci] == null || row[ci] === '' ? '–' : String(row[ci])}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}
