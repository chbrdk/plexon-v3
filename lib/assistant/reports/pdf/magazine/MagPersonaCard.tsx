import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import type { EventQuickCheckReportPersonaSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { humanizeTraitKey } from '@/lib/assistant/reports/format-report-text'
import { MagChip, MagChipRow } from '@/lib/assistant/reports/pdf/magazine/MagChip'
import { MagRankedList } from '@/lib/assistant/reports/pdf/magazine/MagRankedList'
import { MagTraitBars } from '@/lib/assistant/reports/pdf/magazine/MagTraitBars'
import { MagTwoColumn } from '@/lib/assistant/reports/pdf/magazine/MagTwoColumn'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagPersonaCardProps = {
  persona: EventQuickCheckReportPersonaSection
  /** Full-width card (single persona) vs half-width tile in a grid. */
  spread?: boolean
  /** Parent already applied personaCell padding/border. */
  bare?: boolean
}

export function MagPersonaCard({ persona, spread = false, bare = false }: MagPersonaCardProps) {
  const confidence = Math.round(
    persona.confidence <= 1 ? persona.confidence * 100 : persona.confidence,
  )
  const traits = persona.traits.slice(0, spread ? 6 : 4).map((t) => ({
    displayName: t.displayName || humanizeTraitKey(t.name),
    score: t.score,
  }))
  const goals = persona.goals.slice(0, spread ? 6 : 3).map((g) => ({ label: g }))
  const pains = persona.painPoints.slice(0, spread ? 6 : 3).map((g) => ({ label: g }))

  const shell = spread ? magStyles.personaSpread : bare ? { width: '100%' as const } : magStyles.personaCell

  return (
    <View style={shell}>
      <Text style={magStyles.personaName}>{persona.name}</Text>
      <MagChipRow>
        {persona.segment ? <MagChip>{persona.segment}</MagChip> : null}
        <MagChip>
          {confidence}% {EQC_REPORT_COPY.personaConfidence}
        </MagChip>
      </MagChipRow>
      {persona.bio || persona.headline ? (
        <Text style={magStyles.personaBio}>{persona.bio || persona.headline}</Text>
      ) : null}
      {traits.length > 0 ? <MagTraitBars traits={traits} compact /> : null}
      {spread && (goals.length > 0 || pains.length > 0) ? (
        <View style={{ marginTop: 14, width: '100%' }}>
          <MagTwoColumn
            left={
              goals.length > 0 ? (
                <View style={{ width: '100%' }}>
                  <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.sectionGoals}</Text>
                  <MagRankedList items={goals} compact />
                </View>
              ) : (
                <View />
              )
            }
            right={
              pains.length > 0 ? (
                <View style={{ width: '100%' }}>
                  <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.sectionPainPoints}</Text>
                  <MagRankedList items={pains} compact />
                </View>
              ) : (
                <View />
              )
            }
          />
        </View>
      ) : null}
      {!spread && goals.length > 0 ? (
        <View style={{ marginTop: 10, width: '100%' }}>
          <Text style={magStyles.subEyebrow}>{EQC_REPORT_COPY.sectionGoals}</Text>
          <MagRankedList items={goals} compact />
        </View>
      ) : null}
    </View>
  )
}
