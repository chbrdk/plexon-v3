import React from 'react'
import { View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagTwoColumnProps = {
  left: React.ReactNode
  right: React.ReactNode
  /** Inner gutter in pt — applied as padding, never as flex gap. */
  gap?: number
}

/** Magazine spread — two equal 50% columns within the content measure. */
export function MagTwoColumn({ left, right, gap = 24 }: MagTwoColumnProps) {
  const pad = Math.max(0, gap / 2)
  return (
    <View style={magStyles.twoColRow}>
      <View style={[magStyles.twoColCell, { paddingRight: pad }]}>{left}</View>
      <View style={[magStyles.twoColCell, { paddingLeft: pad }]}>{right}</View>
    </View>
  )
}
