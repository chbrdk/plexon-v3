import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export type MagTrait = {
  displayName: string
  score: number
}

export function MagTraitBars({ traits }: { traits: MagTrait[] }) {
  if (!traits.length) return null
  return (
    <View style={{ marginTop: 6 }}>
      {traits.map((t) => {
        const pct = Math.round(t.score <= 1 ? t.score * 100 : t.score)
        return (
          <View key={t.displayName} wrap={false}>
            <View style={[magStyles.row, { justifyContent: 'space-between' }]}>
              <Text style={magStyles.meta}>{t.displayName}</Text>
              <Text style={magStyles.meta}>{pct}%</Text>
            </View>
            <View style={magStyles.traitTrack}>
              <View style={[magStyles.traitFill, { width: `${Math.max(2, Math.min(100, pct))}%` }]} />
            </View>
          </View>
        )
      })}
    </View>
  )
}
