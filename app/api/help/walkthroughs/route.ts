import { NextResponse } from 'next/server'
import { listHelpWalkthroughs, getHelpWalkthrough } from '@/lib/help/walkthroughs'
import { normalizeHelpLocale } from '@/lib/help/content'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const locale = normalizeHelpLocale(url.searchParams.get('locale') ?? url.searchParams.get('lang'))
  const product = url.searchParams.get('product')
  const pathname = url.searchParams.get('pathname')
  const id = url.searchParams.get('id')?.trim()

  if (id) {
    const walkthrough = getHelpWalkthrough(id, locale)
    if (!walkthrough) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json({ locale, walkthrough })
  }

  const walkthroughs = listHelpWalkthroughs({ locale, product, pathname })
  return NextResponse.json({ locale, count: walkthroughs.length, walkthroughs })
}
