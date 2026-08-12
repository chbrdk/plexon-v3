import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magColors, magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export type MagLedgerItem = {
  label: string
  score: number
  detail?: string
}

type MagLedgerProps = {
  items: MagLedgerItem[]
  max?: number
}

export function MagLedger({ items, max = 100 }: MagLedgerProps) {
  const sorted = [...items].sort((a, b) => a.score - b.score)
  return (
    <View style={{ width: '100%' }}>
      {sorted.map((item, i) => {
        const tone =
          item.score < max * 0.4
            ? magColors.neg
            : item.score < max * 0.7
              ? magColors.warn
              : magColors.accentInk
        return (
          <View key={`${item.label}-${i}`} style={magStyles.ledgerRow} wrap={false}>
            <Text style={magStyles.rankedIndex}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={[magStyles.ledgerScore, { color: tone }]}>{Math.round(item.score)}</Text>
            <View style={magStyles.rankedTextCol}>
              <Text style={magStyles.rankedLabel}>{item.label}</Text>
              {item.detail ? <Text style={magStyles.meta}>{item.detail}</Text> : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}
