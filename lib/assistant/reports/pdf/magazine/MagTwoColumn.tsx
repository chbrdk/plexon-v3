import React from 'react'
import { View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagTwoColumnProps = {
  left: React.ReactNode
  right: React.ReactNode
  gap?: number
}

/** Magazine spread — two equal columns within the content measure. */
export function MagTwoColumn({ left, right, gap = 20 }: MagTwoColumnProps) {
  return (
    <View style={[magStyles.twoColRow, { gap }]}>
      <View style={magStyles.twoColCell}>{left}</View>
      <View style={magStyles.twoColCell}>{right}</View>
    </View>
  )
}
