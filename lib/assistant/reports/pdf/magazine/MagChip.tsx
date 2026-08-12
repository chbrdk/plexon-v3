import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export function MagChip({ children }: { children: React.ReactNode }) {
  return <Text style={magStyles.chip}>{children}</Text>
}

export function MagChipRow({ children }: { children: React.ReactNode }) {
  return <View style={magStyles.chipRow}>{children}</View>
}
