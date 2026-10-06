/**
 * Suite Docs & Help — Wave 0 contract tests.
 * Spec: specs/domain/suite-help-docs.md
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  API_HELP_ARTICLE,
  API_HELP_CONTEXT,
  API_HELP_INDEX,
  PATH_DOCS_PUBLIC,
  PATH_HELP,
  apiHelpArticle,
  isPublicDocsPath,
  isPublicStandalonePath,
  pathDocsArticle,
  pathHelpArticle,
} from '@/lib/constants';

const root = path.resolve(__dirname, '..');
const helpRoot = path.join(root, 'content/help');
const articlesDir = path.join(helpRoot, 'articles');

const VISIBILITY = ['public', 'authenticated', 'internal'] as const;
const AUDIENCE = ['user', 'admin', 'operator'] as const;

const LocaleMap = z.object({
  en: z.string().min(1),
  de: z.string().min(1),
});

const ArticleSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:\.[a-z0-9-]+)+$/),
  visibility: z.enum(VISIBILITY),
  products: z.array(z.string().min(1)).min(1),
  routes: z.array(z.string()).optional(),
  audience: z.enum(AUDIENCE),
  title: LocaleMap,
  task: LocaleMap,
  relatedTips: z.array(z.string()).optional(),
  relatedArticles: z.array(z.string()).optional(),
  assistantHints: z.array(z.string()).optional(),
});

const ManifestSchema = z.object({
  version: z.number().int().positive(),
  locales: z.tuple([z.literal('en'), z.literal('de')]),
  articles: z.array(ArticleSchema).min(1),
});

describe('suite help docs Wave 0', () => {
  it('documents domain spec + knowledge + paths + specs-index', () => {
    const domain = path.join(root, 'specs/domain/suite-help-docs.md');
    const knowledge = path.join(root, 'knowledge/suite-help-docs.md');
    expect(existsSync(domain)).toBe(true);
    expect(existsSync(knowledge)).toBe(true);
    const domainText = readFileSync(domain, 'utf8');
    const knowledgeText = readFileSync(knowledge, 'utf8');
    expect(domainText).toContain('PATH_DOCS_PUBLIC');
    expect(domainText).toContain('PATH_HELP');
    expect(domainText).toContain('visibility');
    expect(domainText).toContain('HelpHost');
    expect(knowledgeText).toContain('content/help/');
    expect(knowledgeText).toContain('Wave 0');

    const index = readFileSync(path.join(root, 'knowledge/specs-index.md'), 'utf8');
    expect(index).toContain('suite-help-docs.md');

    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8');
    expect(paths).toContain('PATH_DOCS_PUBLIC');
    expect(paths).toContain('PATH_HELP');
    expect(paths).toContain('API_HELP_INDEX');

    const stand = readFileSync(path.join(root, 'knowledge/suite-stand.md'), 'utf8');
    expect(stand).toContain('suite-help-docs.md');

    const assistantFlyout = readFileSync(
      path.join(root, 'knowledge/central-assistant-flyout.md'),
      'utf8',
    );
    expect(assistantFlyout).toContain('suite-help-docs.md');
  });

  it('keeps path constants canonical and admits public docs routes', () => {
    expect(PATH_DOCS_PUBLIC).toBe('/docs');
    expect(PATH_HELP).toBe('/help');
    expect(API_HELP_INDEX).toBe('/api/help/index');
    expect(API_HELP_ARTICLE).toBe('/api/help/articles');
    expect(API_HELP_CONTEXT).toBe('/api/help/context');
    expect(pathDocsArticle('plexon.collections.overview')).toBe(
      '/docs/plexon.collections.overview',
    );
    expect(pathHelpArticle('checkion.scan.wcag-quick')).toBe(
      '/help/checkion.scan.wcag-quick',
    );
    expect(apiHelpArticle('plexon.help.using-help')).toBe(
      '/api/help/articles/plexon.help.using-help',
    );
    expect(isPublicDocsPath(PATH_DOCS_PUBLIC)).toBe(true);
    expect(isPublicDocsPath('/docs/plexon.collections.overview')).toBe(true);
    expect(isPublicDocsPath(PATH_HELP)).toBe(false);
    expect(isPublicStandalonePath('/docs')).toBe(true);
    expect(isPublicStandalonePath('/docs/foo')).toBe(true);
    expect(isPublicStandalonePath('/help')).toBe(false);
  });

  it('validates manifest schema, locale pairs, and visibility gates', () => {
    const manifestPath = path.join(helpRoot, 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = ManifestSchema.parse(
      JSON.parse(readFileSync(manifestPath, 'utf8')),
    );

    const ids = new Set<string>();
    for (const article of manifest.articles) {
      expect(ids.has(article.id)).toBe(false);
      ids.add(article.id);

      for (const locale of manifest.locales) {
        const file = path.join(articlesDir, `${article.id}.${locale}.md`);
        expect(existsSync(file), `missing ${article.id}.${locale}.md`).toBe(true);
        const body = readFileSync(file, 'utf8').trim();
        expect(body.length).toBeGreaterThan(40);
      }
    }

    // relatedArticles may forward-reference; resolve after full id set
    for (const article of manifest.articles) {
      for (const related of article.relatedArticles ?? []) {
        expect(ids.has(related), `unknown relatedArticles ${related}`).toBe(true);
      }
    }

    const publicIds = manifest.articles
      .filter((a) => a.visibility === 'public')
      .map((a) => a.id);
    const authOnly = manifest.articles.filter((a) => a.visibility !== 'public');
    expect(publicIds.length).toBeGreaterThanOrEqual(3);
    expect(authOnly.some((a) => a.id === 'checkion.scan.geo-layers')).toBe(true);
    expect(publicIds).not.toContain('checkion.scan.geo-layers');

    // No orphan markdown without manifest entry
    const mdFiles = readdirSync(articlesDir).filter((f) => f.endsWith('.md'));
    for (const file of mdFiles) {
      const match = /^(.+)\.(en|de)\.md$/.exec(file);
      expect(match, `unexpected article filename ${file}`).toBeTruthy();
      if (!match) continue;
      expect(ids.has(match[1]), `orphan article file ${file}`).toBe(true);
    }
  });

  it('middleware admits public docs beside share + standalone helpers', () => {
    const middleware = readFileSync(path.join(root, 'middleware.ts'), 'utf8');
    expect(middleware).toContain("'/docs'");
    expect(middleware).toContain('isPublicDocsPath');
    expect(middleware).toContain('isPublicStandalonePath');
    // Edge-safe: do not pull heavy constants into middleware.
    expect(middleware).not.toContain("from '@/lib/constants'");
    expect(middleware).not.toContain("from '@/auth'");
  });
});
