/**
 * Suite Docs & Help — Wave 1 surface / host contracts.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')

describe('suite help Wave 1 surfaces', () => {
  it('ships docs + help routes, HelpHost, APIs, and Dockerfile content copy', () => {
    const required = [
      'app/docs/page.tsx',
      'app/docs/[id]/page.tsx',
      'app/help/page.tsx',
      'app/help/[id]/page.tsx',
      'app/api/help/index/route.ts',
      'app/api/help/articles/[id]/route.ts',
      'app/api/help/context/route.ts',
      'components/help/HelpHost.tsx',
      'components/help/HelpDocsChrome.tsx',
      'components/help/HelpAuthViews.tsx',
      'lib/help/content.ts',
      'lib/help/assistant-corpus.ts',
    ]
    for (const rel of required) {
      expect(existsSync(path.join(root, rel)), rel).toBe(true)
    }

    const shell = readFileSync(path.join(root, 'components/AppShell.tsx'), 'utf8')
    expect(shell).toContain('HelpHost')
    expect(shell).toContain('PATH_HELP')

    const settings = readFileSync(path.join(root, 'app/settings/page.tsx'), 'utf8')
    expect(settings).toContain('settings.helpDocs')
    expect(settings).toContain('PATH_HELP')
    expect(settings).toContain('PATH_DOCS_PUBLIC')

    const assistantHost = readFileSync(
      path.join(root, 'components/PlatformAssistantHost.tsx'),
      'utf8',
    )
    expect(assistantHost).toContain('ASSISTANT_OPEN_FROM_HELP_EVENT')
    expect(assistantHost).toContain('composerSeed')

    const systemPrompt = readFileSync(path.join(root, 'lib/assistant/system-prompt.ts'), 'utf8')
    expect(systemPrompt).toContain('buildHelpCorpusPromptBlock')

    const dockerfile = readFileSync(path.join(root, 'Dockerfile'), 'utf8')
    expect(dockerfile).toContain('content ./content')

    const landing = readFileSync(path.join(root, 'lib/suite-landing.ts'), 'utf8')
    expect(landing).toContain('PATH_DOCS_PUBLIC')
    expect(landing).toContain('Dokumentation')

    const en = readFileSync(path.join(root, 'locales/en.json'), 'utf8')
    const de = readFileSync(path.join(root, 'locales/de.json'), 'utf8')
    expect(en).toContain('"help"')
    expect(de).toContain('"help"')
    expect(en).toContain('helpDocs')
    expect(de).toContain('helpDocs')
  })

  it('documents Wave 1 in knowledge + domain spec', () => {
    const knowledge = readFileSync(path.join(root, 'knowledge/suite-help-docs.md'), 'utf8')
    const domain = readFileSync(path.join(root, 'specs/domain/suite-help-docs.md'), 'utf8')
    expect(knowledge).toContain('Wave 1')
    expect(domain).toContain('HelpHost')
    expect(domain).toContain('API_HELP_INDEX')
  })
})
