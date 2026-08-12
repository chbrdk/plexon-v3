import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export type MagRankedItem = {
  label: string
  meta?: string
}

type MagRankedListProps = {
  items: MagRankedItem[]
  startIndex?: number
}

export function MagRankedList({ items, startIndex = 1 }: MagRankedListProps) {
  return (
    <View>
      {items.map((item, i) => (
        <View
          key={`${item.label}-${i}`}
          style={[magStyles.row, { marginBottom: 6, alignItems: 'flex-start' }]}
          wrap={false}
        >
          <Text style={magStyles.rankedIndex}>{String(startIndex + i).padStart(2, '0')}</Text>
          <View style={magStyles.col}>
            <Text style={magStyles.rankedLabel}>{item.label}</Text>
            {item.meta ? <Text style={magStyles.meta}>{item.meta}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  )
}
