import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { MagScoreRing } from '@/lib/assistant/reports/pdf/magazine/MagScoreRing'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export type MagCoverKpi = {
  label: string
  value: string
  ringValue?: number | null
  ringMax?: number
}

type MagCoverProps = {
  eyebrow: string
  title: string
  url?: string
  meta?: string
  fazit?: string
  kpis: MagCoverKpi[]
}

export function MagCover({ eyebrow, title, url, meta, fazit, kpis }: MagCoverProps) {
  return (
    <View>
      <Text style={magStyles.eyebrow}>{eyebrow}</Text>
      <Text style={magStyles.coverHeadline}>{title}</Text>
      <View style={magStyles.accentRule} />
      {url ? <Text style={magStyles.meta}>{url}</Text> : null}
      {meta ? <Text style={[magStyles.meta, { marginBottom: 8 }]}>{meta}</Text> : null}
      {fazit ? (
        <View style={magStyles.washBox}>
          <Text style={magStyles.eyebrow}>Fazit</Text>
          <Text style={magStyles.body}>{fazit}</Text>
        </View>
      ) : null}
      {kpis.length > 0 ? (
        <View style={magStyles.kpiGrid}>
          {kpis.slice(0, 4).map((kpi) => (
            <View key={kpi.label} style={magStyles.kpiCell}>
              {kpi.ringValue != null ? (
                <MagScoreRing value={kpi.ringValue} max={kpi.ringMax ?? 100} label={kpi.label} size={78} />
              ) : (
                <View>
                  <Text style={magStyles.kpiValue}>{kpi.value}</Text>
                  <Text style={magStyles.kpiLabel}>{kpi.label}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
