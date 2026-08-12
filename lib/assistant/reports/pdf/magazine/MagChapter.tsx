import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagChapterProps = {
  eyebrow: string
  title: string
  lede?: string
  /** Print folio index, e.g. "02" */
  index?: string
  children?: React.ReactNode
  break?: boolean
}

export function MagChapter({
  eyebrow,
  title,
  lede,
  index,
  children,
  break: pageBreak,
}: MagChapterProps) {
  return (
    <View style={magStyles.chapterGap} break={pageBreak}>
      {index ? <Text style={magStyles.chapterIndex}>{index}</Text> : null}
      <Text style={magStyles.eyebrow}>{eyebrow}</Text>
      <Text style={magStyles.headline}>{title}</Text>
      <View style={magStyles.accentRule} />
      {lede ? <Text style={magStyles.lede}>{lede}</Text> : null}
      {children}
    </View>
  )
}
