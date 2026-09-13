import fs from 'node:fs'
import path from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SuiteLandingPage, { generateMetadata } from '@/app/suite/page'
import {
  FONT_URL_SUITE_LANDING,
  PATH_LOGIN,
  PATH_REGISTER,
  PATH_SUITE_LANDING,
  isPublicStandalonePath,
} from '@/lib/constants'
import {
  getSuiteLandingCopy,
  pathSuiteLanding,
  resolveSuiteLandingLang,
  SUITE_LANDING_SPIRION_CAPTURE_IDS,
} from '@/lib/suite-landing'

vi.mock('@/lib/i18n/server', () => ({
  getServerLocale: async () => 'de' as const,
}))

describe('PLEXON suite landing', () => {
  afterEach(cleanup)

  it('keeps the public route and font URL canonical', () => {
    expect(PATH_SUITE_LANDING).toBe('/suite')
    expect(isPublicStandalonePath(PATH_SUITE_LANDING)).toBe(true)
    expect(isPublicStandalonePath('/')).toBe(false)
    expect(FONT_URL_SUITE_LANDING).toContain('Fraunces')
    expect(FONT_URL_SUITE_LANDING).toContain('Syne')
    expect(pathSuiteLanding('de')).toBe('/suite')
    expect(pathSuiteLanding('en')).toBe('/suite?lang=en')
  })

  it('grounds craft in live Spirion captures without cloning them as the route', () => {
    expect(SUITE_LANDING_SPIRION_CAPTURE_IDS).toEqual([
      'cap_1350292d44c14ed8b7278e325030e78b',
      'cap_24ba63753b384682be07981b4da317eb',
    ])
  })

  it('resolves explicit lang over fallback and ships bilingual copy', () => {
    expect(resolveSuiteLandingLang('en', 'de')).toBe('en')
    expect(resolveSuiteLandingLang(undefined, 'en')).toBe('en')
    expect(resolveSuiteLandingLang('fr', 'de')).toBe('de')

    const de = getSuiteLandingCopy('de')
    const en = getSuiteLandingCopy('en')
    expect(de.sequence.map((step) => step.name)).toEqual([
      'ECHON',
      'AUDION',
      'CHECKION',
      'BRANDION',
      'SPIRION',
      'CREATION',
      'PLEXON',
    ])
    expect(en.sequence.map((step) => step.name)).toEqual(de.sequence.map((step) => step.name))
    expect(de.products.find((product) => product.id === 'videon')?.role).toBe('roadmap')
    expect(en.products.find((product) => product.id === 'echon')?.role).toBe('companion')
    expect(de.hubFunctions.map((fn) => fn.name)).toEqual([
      'Collection',
      'Assistant',
      'Flows',
      'Knowledge',
    ])
    expect(en.heroTitle[0]).toEqual({ kind: 'plain', text: 'One' })
    expect(de.enter.registerLabel).not.toEqual(en.enter.registerLabel)
  })

  it('renders German conversion chrome by default', async () => {
    const ui = await SuiteLandingPage({ searchParams: Promise.resolve({}) })
    render(ui)
    const de = getSuiteLandingCopy('de')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('EinProjekt.Alle Disziplinen.')
    expect(screen.getByRole('heading', { name: de.sequenceTitle })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: de.directoryTitle })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: de.hubTitle })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: de.skipLink })).toHaveAttribute('href', '#sequence')
    expect(screen.getAllByRole('link', { name: de.enter.registerLabel })[0]).toHaveAttribute(
      'href',
      PATH_REGISTER,
    )
    expect(screen.getAllByRole('link', { name: `${de.enter.loginLabel} →` })[0]).toHaveAttribute(
      'href',
      PATH_LOGIN,
    )
    expect(screen.getByRole('link', { name: 'EN' })).toHaveAttribute('href', '/suite?lang=en')
  })

  it('renders English copy when lang=en', async () => {
    const ui = await SuiteLandingPage({ searchParams: Promise.resolve({ lang: 'en' }) })
    render(ui)
    const en = getSuiteLandingCopy('en')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Oneproject.Every discipline.')
    expect(screen.getByRole('heading', { name: en.sequenceTitle })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en.skipLink })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: en.enter.registerLabel })[0]).toHaveAttribute(
      'href',
      PATH_REGISTER,
    )
    expect(screen.getByRole('link', { name: 'DE' })).toHaveAttribute('href', '/suite')
  })

  it('emits locale-aware metadata and Open Graph', async () => {
    const deMeta = await generateMetadata({ searchParams: Promise.resolve({ lang: 'de' }) })
    const enMeta = await generateMetadata({ searchParams: Promise.resolve({ lang: 'en' }) })
    expect(deMeta.title).toBe(getSuiteLandingCopy('de').meta.title)
    expect(enMeta.title).toBe(getSuiteLandingCopy('en').meta.title)
    expect(deMeta.openGraph?.locale).toBe('de_DE')
    expect(enMeta.openGraph?.locale).toBe('en_US')
    expect(deMeta.alternates?.languages).toMatchObject({
      de: expect.stringContaining('/suite'),
      en: expect.stringContaining('lang=en'),
    })
  })

  it('keeps the public-path contract, hero budget, and reduced-motion in craft CSS', () => {
    const middleware = fs.readFileSync(path.join(process.cwd(), 'middleware.ts'), 'utf8')
    const css = fs.readFileSync(path.join(process.cwd(), 'app/suite/suite.module.css'), 'utf8')
    expect(middleware).toContain('isPublicStandalonePath')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('Hero budget')
    expect(css).not.toContain('glass')
    expect(css).not.toContain('linear-gradient')
  })
})
