import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export type MagTrait = {
  displayName: string
  score: number
}

export function MagTraitBars({ traits, compact = false }: { traits: MagTrait[]; compact?: boolean }) {
  if (!traits.length) return null
  return (
    <View style={{ marginTop: compact ? 4 : 8, width: '100%' }}>
      {traits.map((t) => {
        const pct = Math.round(t.score <= 1 ? t.score * 100 : t.score)
        return (
          <View key={t.displayName} wrap={false} style={{ marginBottom: compact ? 4 : 6, width: '100%' }}>
            <View style={magStyles.row}>
              <Text style={magStyles.traitName}>{t.displayName}</Text>
              <Text style={magStyles.traitPct}>{pct}%</Text>
            </View>
            <View style={compact ? magStyles.traitTrackCompact : magStyles.traitTrack}>
              <View style={[magStyles.traitFill, { width: `${Math.max(2, Math.min(100, pct))}%` }]} />
            </View>
          </View>
        )
      })}
    </View>
  )
}
