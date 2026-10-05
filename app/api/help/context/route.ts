import { NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth-request-user'
import {
  normalizeHelpLocale,
  rankHelpContext,
  resolveHelpAccess,
} from '@/lib/help/content'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const locale = normalizeHelpLocale(url.searchParams.get('locale') ?? url.searchParams.get('lang'))
  const pathname = url.searchParams.get('pathname')
  const capability = url.searchParams.get('capability')
  const product = url.searchParams.get('product')
  const limitRaw = Number(url.searchParams.get('limit') || '3')
  const limit = Number.isFinite(limitRaw) ? limitRaw : 3

  const user = await getRequestUser(request)
  const access = resolveHelpAccess(user?.role, Boolean(user))
  // Context ranking for anonymous is public-only (docs marketing widget later).
  const articles = rankHelpContext({
    pathname,
    capability,
    locale,
    product,
    access,
    limit,
  })
    .filter((article) => access !== 'anonymous' || article.visibility === 'public')
    .map((article) => ({
      id: article.id,
      visibility: article.visibility,
      products: article.products,
      routes: article.routes ?? [],
      title: article.titleLocalized,
      task: article.taskLocalized,
    }))

  return NextResponse.json({
    locale,
    pathname: pathname || null,
    capability: capability || null,
    access,
    articles,
  })
}
