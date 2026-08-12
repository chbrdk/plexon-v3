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
    <View style={{ width: '100%' }}>
      <View style={magStyles.tableHeader}>
        {columns.map((col) => (
          <View key={col} style={{ width, paddingRight: 4, minWidth: 0 }}>
            <Text style={magStyles.tableHeadCell}>{col}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={magStyles.tableRow} wrap={false}>
          {columns.map((_, ci) => (
            <View key={ci} style={{ width, paddingRight: 4, minWidth: 0 }}>
              <Text style={magStyles.tableCell}>
                {row[ci] == null || row[ci] === '' ? '–' : String(row[ci])}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
