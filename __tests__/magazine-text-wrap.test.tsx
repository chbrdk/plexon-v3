import { describe, expect, it } from 'vitest'
import React from 'react'
import { Document, renderToBuffer, Text } from '@react-pdf/renderer'
import {
  MagChapter,
  MagPage,
  MagRankedList,
  MagTwoColumn,
  magStyles,
  registerMagazinePdfFonts,
} from '@msqdx/ui/mag'

const LONG =
  'Sehr langer Finding-Text ohne sinnvolle Zeilenumbrüche an Leerzeichen: Markenbekanntheit und Conversion-Potenzial in regionalen Märkten mit überdurchschnittlich komplexen Wettbewerbsstrukturen und zusätzlichen SEO-Anforderungen.'

describe('magazine two-column text containment', () => {
  it('renders long labels in two columns without throwing', async () => {
    registerMagazinePdfFonts()
    const items = Array.from({ length: 8 }, (_, i) => ({
      label: `${i + 1}. ${LONG}`,
      meta: 'Zusätzliche Meta-Information die ebenfalls umbrechen muss und nicht in die Nachbarspalte laufen darf.',
    }))

    const buffer = await renderToBuffer(
      <Document>
        <MagPage footerTitle="wrap-test">
          <MagChapter eyebrow="Test" title="Zwei Spalten Wrap" index="01">
            <MagTwoColumn
              left={
                <Text style={magStyles.body}>
                  Linke Spalte mit längerem Fließtext der innerhalb der 50%-Breite bleiben muss und
                  nicht in den rechten Bereich überlappen darf. {LONG}
                </Text>
              }
              right={<MagRankedList items={items.slice(0, 4)} compact />}
            />
            <MagRankedList columns={2} items={items} />
          </MagChapter>
        </MagPage>
      </Document>,
    )
    const pdf = Buffer.from(buffer)
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(2000)
  }, 30000)

  it('resolves Mag kit from @msqdx/ui/mag', async () => {
    const mod = await import('@msqdx/ui/mag')
    expect(mod.MagChip).toBeTypeOf('function')
    expect(mod.magColors.accent).toBe('#00ca55')
  })
})
