import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagPullQuoteProps = {
  label?: string
  body: string
}

/** Editorial pull — accent bar + body, no filled card. */
export function MagPullQuote({ label, body }: MagPullQuoteProps) {
  return (
    <View style={magStyles.pullQuote} wrap={false}>
      <View style={magStyles.pullQuoteBar} />
      <View style={magStyles.pullQuoteBody}>
        {label ? <Text style={magStyles.subEyebrow}>{label}</Text> : null}
        <Text style={[magStyles.body, { marginBottom: 0, lineHeight: 1.55 }]}>{body}</Text>
      </View>
    </View>
  )
}
