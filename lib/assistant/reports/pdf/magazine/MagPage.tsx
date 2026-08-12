import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { MsqdxLogoPdf } from '@/lib/assistant/reports/pdf/msqdx/MsqdxLogoPdf'
import { magColors, magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagPageProps = {
  children: React.ReactNode
  footerTitle?: string
  showLogo?: boolean
}

export function MagPage({ children, footerTitle, showLogo = false }: MagPageProps) {
  return (
    <Page size="A4" style={magStyles.page} wrap>
      <View style={magStyles.columnShell}>
        <View style={magStyles.column}>
          {showLogo ? (
            <View style={{ marginBottom: 36 }}>
              <MsqdxLogoPdf width={52} height={12} color={magColors.ink} />
            </View>
          ) : null}
          {children}
        </View>
      </View>
      <View style={magStyles.footer} fixed>
        <View style={magStyles.footerRule} />
        <View style={magStyles.footerRow}>
          <Text style={magStyles.footerMeta}>{footerTitle ?? 'Quick Check'}</Text>
          <Text
            style={magStyles.footerMeta}
            render={({ pageNumber, totalPages }) => `${pageNumber} — ${totalPages}`}
          />
        </View>
      </View>
    </Page>
  )
}
