import { NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth-request-user'
import { getHelpArticle, normalizeHelpLocale, resolveHelpAccess } from '@/lib/help/content'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params
  const id = decodeURIComponent(rawId || '').trim()
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  }

  const url = new URL(request.url)
  const locale = normalizeHelpLocale(url.searchParams.get('locale') ?? url.searchParams.get('lang'))
  const user = await getRequestUser(request)
  const access = resolveHelpAccess(user?.role, Boolean(user))
  const visibilityCeiling = access === 'anonymous' ? 'public' : undefined

  const article = getHelpArticle({ id, locale, access, visibilityCeiling })
  if (!article) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({
    id: article.id,
    locale: article.locale,
    visibility: article.visibility,
    products: article.products,
    routes: article.routes ?? [],
    audience: article.audience,
    title: article.titleLocalized,
    task: article.taskLocalized,
    relatedTips: article.relatedTips ?? [],
    relatedArticles: article.relatedArticles ?? [],
    body: article.body,
  })
}
