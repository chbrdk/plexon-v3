import path from 'node:path'
import { Font } from '@react-pdf/renderer'

/** DS stack twin — Noto Sans (latin subset) for Magazin-PDF. */
export const MAG_FONT_FAMILY = 'NotoSans'

let registered = false

export function registerMagazinePdfFonts(): void {
  if (registered) return
  const dir = path.join(
    process.cwd(),
    'lib/assistant/reports/pdf/magazine/fonts',
  )
  Font.register({
    family: MAG_FONT_FAMILY,
    fonts: [
      { src: path.join(dir, 'NotoSans-Regular.ttf'), fontWeight: 400 },
      { src: path.join(dir, 'NotoSans-Bold.ttf'), fontWeight: 700 },
    ],
  })
  registered = true
}
