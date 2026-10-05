/**
 * Suite Docs & Help path constants.
 * Spec: specs/domain/suite-help-docs.md · knowledge/suite-help-docs.md
 */

/** Public documentation site (prospects + SEO). */
export const PATH_DOCS_PUBLIC = '/docs';

/** Authenticated in-app help hub (full page). */
export const PATH_HELP = '/help';

/** Cross-app help hub embed (iframe from capability products). */
export const PATH_HELP_EMBED = '/help/embed';

/** Bilingual query param shared with suite landing pattern. */
export const HELP_LANG_QUERY = 'lang';

export const HELP_EMBED_PRODUCT_QUERY_PARAM = 'product';
export const HELP_EMBED_PATHNAME_QUERY_PARAM = 'pathname';
export const HELP_EMBED_CAPABILITY_QUERY_PARAM = 'capability';
export const HELP_EMBED_ARTICLE_QUERY_PARAM = 'article';
export const HELP_EMBED_THEME_QUERY_PARAM = 'theme';

export const API_HELP_INDEX = '/api/help/index';
export const API_HELP_ARTICLE = '/api/help/articles';
export const API_HELP_CONTEXT = '/api/help/context';
export const API_HELP_EVENTS = '/api/help/events';
export const API_HELP_WALKTHROUGHS = '/api/help/walkthroughs';

export type HelpEmbedQuery = {
  product?: string | null
  pathname?: string | null
  capability?: string | null
  articleId?: string | null
  theme?: string | null
  lang?: string | null
}

export const pathHelpEmbed = (query: HelpEmbedQuery = {}): string => {
  const params = new URLSearchParams()
  if (query.product?.trim()) params.set(HELP_EMBED_PRODUCT_QUERY_PARAM, query.product.trim())
  if (query.pathname?.trim()) params.set(HELP_EMBED_PATHNAME_QUERY_PARAM, query.pathname.trim())
  if (query.capability?.trim()) params.set(HELP_EMBED_CAPABILITY_QUERY_PARAM, query.capability.trim())
  if (query.articleId?.trim()) params.set(HELP_EMBED_ARTICLE_QUERY_PARAM, query.articleId.trim())
  if (query.theme?.trim()) params.set(HELP_EMBED_THEME_QUERY_PARAM, query.theme.trim())
  if (query.lang?.trim()) params.set(HELP_LANG_QUERY, query.lang.trim())
  const qs = params.toString()
  return qs ? `${PATH_HELP_EMBED}?${qs}` : PATH_HELP_EMBED
}

export const buildHelpEmbedUrl = (plexonPublicBase: string, query: HelpEmbedQuery = {}): string => {
  const base = plexonPublicBase.replace(/\/$/, '')
  const path = pathHelpEmbed(query)
  if (!base) return path
  return `${base}${path}`
}

export function isHelpEmbedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname === PATH_HELP_EMBED || pathname.startsWith(`${PATH_HELP_EMBED}/`)
}

export const pathDocsArticle = (articleId: string): string => {
  const id = articleId.trim();
  if (!id) return PATH_DOCS_PUBLIC;
  return `${PATH_DOCS_PUBLIC}/${encodeURIComponent(id)}`;
};

export const pathHelpArticle = (articleId: string): string => {
  const id = articleId.trim();
  if (!id) return PATH_HELP;
  return `${PATH_HELP}/${encodeURIComponent(id)}`;
};

export const pathDocsPublic = (lang?: string | null): string => {
  const locale = (lang || '').trim().toLowerCase();
  if (!locale || locale === 'de') return PATH_DOCS_PUBLIC;
  return `${PATH_DOCS_PUBLIC}?${HELP_LANG_QUERY}=${encodeURIComponent(locale)}`;
};

export const apiHelpArticle = (articleId: string): string => {
  const id = articleId.trim();
  if (!id) return API_HELP_ARTICLE;
  return `${API_HELP_ARTICLE}/${encodeURIComponent(id)}`;
};

/** Public docs index + article deep links (middleware / AppShell). */
export function isPublicDocsPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === PATH_DOCS_PUBLIC || pathname.startsWith(`${PATH_DOCS_PUBLIC}/`);
}
