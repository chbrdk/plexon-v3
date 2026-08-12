import React from 'react'
import { View } from '@react-pdf/renderer'
import type { EventQuickCheckReportPersonaSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import { MagPersonaCard } from '@/lib/assistant/reports/pdf/magazine/MagPersonaCard'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export function MagPersonaGrid({ personas }: { personas: EventQuickCheckReportPersonaSection[] }) {
  if (personas.length === 1) {
    return <MagPersonaCard persona={personas[0]!} spread />
  }

  const rows: EventQuickCheckReportPersonaSection[][] = []
  for (let i = 0; i < personas.length; i += 2) {
    rows.push(personas.slice(i, i + 2))
  }

  return (
    <View style={{ width: '100%' }}>
      {rows.map((pair, rowIndex) => (
        <View
          key={rowIndex}
          style={[magStyles.personaRow, rowIndex > 0 ? { marginTop: 22 } : null]}
        >
          {pair.map((persona, i) => (
            <View
              key={persona.id || persona.name}
              style={i === 0 ? magStyles.personaCell : magStyles.personaCellLast}
            >
              <MagPersonaCard persona={persona} bare />
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
