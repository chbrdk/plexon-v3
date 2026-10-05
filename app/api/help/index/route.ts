import { NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth-request-user'
import { listHelpArticles, normalizeHelpLocale, resolveHelpAccess } from '@/lib/help/content'
import type { HelpVisibility } from '@/lib/help/types'

export const dynamic = 'force-dynamic'

function parseVisibilityCeiling(raw: string | null): HelpVisibility | undefined {
  if (raw === 'public' || raw === 'authenticated' || raw === 'internal') return raw
  return undefined
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const locale = normalizeHelpLocale(url.searchParams.get('locale') ?? url.searchParams.get('lang'))
  const product = url.searchParams.get('product')
  const user = await getRequestUser(request)
  const access = resolveHelpAccess(user?.role, Boolean(user))
  const requestedCeiling = parseVisibilityCeiling(url.searchParams.get('visibility'))
  // Unauthenticated callers always capped at public — ignore client attempts to raise.
  const visibilityCeiling =
    access === 'anonymous' ? 'public' : requestedCeiling === 'public' ? 'public' : requestedCeiling

  const articles = listHelpArticles({
    locale,
    product,
    access,
    visibilityCeiling,
  }).map((article) => ({
    id: article.id,
    visibility: article.visibility,
    products: article.products,
    routes: article.routes ?? [],
    audience: article.audience,
    title: article.titleLocalized,
    task: article.taskLocalized,
    relatedTips: article.relatedTips ?? [],
    relatedArticles: article.relatedArticles ?? [],
  }))

  return NextResponse.json({
    locale,
    access,
    count: articles.length,
    articles,
  })
}
