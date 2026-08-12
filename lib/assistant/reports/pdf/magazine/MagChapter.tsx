import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagChapterProps = {
  eyebrow: string
  title: string
  lede?: string
  children?: React.ReactNode
  break?: boolean
}

export function MagChapter({ eyebrow, title, lede, children, break: pageBreak }: MagChapterProps) {
  return (
    <View style={magStyles.chapterGap} break={pageBreak}>
      <Text style={magStyles.eyebrow}>{eyebrow}</Text>
      <Text style={magStyles.headline}>{title}</Text>
      <View style={magStyles.accentRule} />
      {lede ? <Text style={magStyles.lede}>{lede}</Text> : null}
      {children}
    </View>
  )
}
