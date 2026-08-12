import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export type MagRankedItem = {
  label: string
  meta?: string
}

type MagRankedListProps = {
  items: MagRankedItem[]
  startIndex?: number
  /** Magazine two-column flow within the content measure. */
  columns?: 1 | 2
  /** Tighter rows for persona tiles and nested lists. */
  compact?: boolean
}

function splitColumns(items: MagRankedItem[]): [MagRankedItem[], MagRankedItem[]] {
  const mid = Math.ceil(items.length / 2)
  return [items.slice(0, mid), items.slice(mid)]
}

function RankedColumn({
  items,
  startIndex,
  compact,
}: {
  items: MagRankedItem[]
  startIndex: number
  compact: boolean
}) {
  return (
    <View style={{ width: '100%' }}>
      {items.map((item, i) => (
        <View
          key={`${item.label}-${i}`}
          style={compact ? magStyles.rankedRowCompact : magStyles.rankedRow}
          wrap={false}
        >
          <Text style={compact ? magStyles.rankedIndexCompact : magStyles.rankedIndex}>
            {String(startIndex + i).padStart(2, '0')}
          </Text>
          <View style={magStyles.rankedTextCol}>
            <Text style={compact ? magStyles.rankedLabelCompact : magStyles.rankedLabel}>
              {item.label}
            </Text>
            {item.meta ? (
              <Text
                style={
                  compact
                    ? [magStyles.meta, magStyles.rankedMetaCompact, { marginTop: 3 }]
                    : [magStyles.meta, { marginTop: 3 }]
                }
              >
                {item.meta}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

export function MagRankedList({
  items,
  startIndex = 1,
  columns = 1,
  compact = false,
}: MagRankedListProps) {
  if (!items.length) return null

  if (columns === 2 && items.length > 1) {
    const [left, right] = splitColumns(items)
    const pad = 12
    return (
      <View style={[magStyles.twoColRow, { marginTop: compact ? 2 : 6 }]}>
        <View style={[magStyles.twoColCell, { paddingRight: pad }]}>
          <RankedColumn items={left} startIndex={startIndex} compact={compact} />
        </View>
        <View style={[magStyles.twoColCell, { paddingLeft: pad }]}>
          <RankedColumn items={right} startIndex={startIndex + left.length} compact={compact} />
        </View>
      </View>
    )
  }

  return (
    <View style={{ marginTop: compact ? 2 : 6, width: '100%' }}>
      <RankedColumn items={items} startIndex={startIndex} compact={compact} />
    </View>
  )
}
