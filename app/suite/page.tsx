import type { Metadata } from 'next'
import styles from './suite.module.css'
import { getServerLocale } from '@/lib/i18n/server'
import {
  getSuiteLandingCopy,
  pathSuiteLanding,
  resolveSuiteLandingLang,
  suiteLandingAbsoluteUrl,
  SUITE_LANDING_TICKER,
  type SuiteHeroTitleLine,
  type SuiteLandingLang,
} from '@/lib/suite-landing'

type SuitePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: SuitePageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {}
  const fallback = await getServerLocale()
  const lang = resolveSuiteLandingLang(params.lang, fallback)
  const copy = getSuiteLandingCopy(lang)
  const canonical = suiteLandingAbsoluteUrl(lang)
  const deUrl = suiteLandingAbsoluteUrl('de')
  const enUrl = suiteLandingAbsoluteUrl('en')

  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: {
      canonical,
      languages: {
        de: deUrl,
        en: enUrl,
        'x-default': deUrl,
      },
    },
    openGraph: {
      title: copy.meta.title,
      description: copy.meta.description,
      url: canonical,
      type: 'website',
      locale: lang === 'de' ? 'de_DE' : 'en_US',
      alternateLocale: lang === 'de' ? ['en_US'] : ['de_DE'],
      siteName: 'PLEXON',
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.meta.title,
      description: copy.meta.description,
    },
  }
}

function HeroTitleLine({ line, late }: { line: SuiteHeroTitleLine; late?: boolean }) {
  return (
    <span className={late ? `${styles.reveal} ${styles.revealLate}` : styles.reveal}>
      <span>
        {line.kind === 'plain' ? (
          line.text
        ) : (
          <>
            {line.before}
            <em>{line.em}</em>
          </>
        )}
      </span>
    </span>
  )
}

function LangSwitch({ lang }: { lang: SuiteLandingLang }) {
  const copy = getSuiteLandingCopy(lang)
  return (
    <div className={styles.langSwitch} role="group" aria-label={copy.langSwitchAria}>
      <a
        href={pathSuiteLanding('de')}
        hrefLang="de"
        aria-current={lang === 'de' ? 'page' : undefined}
        className={lang === 'de' ? styles.langActive : undefined}
      >
        {copy.langSwitch.de}
      </a>
      <span aria-hidden="true">/</span>
      <a
        href={pathSuiteLanding('en')}
        hrefLang="en"
        aria-current={lang === 'en' ? 'page' : undefined}
        className={lang === 'en' ? styles.langActive : undefined}
      >
        {copy.langSwitch.en}
      </a>
    </div>
  )
}

export default async function SuiteLandingPage({ searchParams }: SuitePageProps) {
  const params = (await searchParams) ?? {}
  const fallback = await getServerLocale()
  const lang = resolveSuiteLandingLang(params.lang, fallback)
  const copy = getSuiteLandingCopy(lang)
  const closeParts = copy.closeTitle.before.split('\n')

  return (
    <main className={styles.page} lang={copy.htmlLang} id="top">
      <a className={styles.skipLink} href="#sequence">
        {copy.skipLink}
      </a>

      <section className={styles.hero} aria-labelledby="suite-hero-title">
        <header className={styles.masthead}>
          <a className={styles.wordmark} href="#top" aria-label={copy.wordmarkAria}>
            PLEXON<span> / MSQ DX</span>
          </a>
          <p className={styles.issueMeta}>
            {copy.issueMeta[0]}
            <br />
            {copy.issueMeta[1]}
          </p>
          <nav className={styles.nav} aria-label={copy.navAria}>
            {copy.nav.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <LangSwitch lang={lang} />
            <a className={styles.cta} href={copy.enter.registerHref}>
              <span>{copy.enter.registerLabel}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </header>

        <div className={styles.heroStage}>
          <p className={styles.ghost} aria-hidden="true">
            COLLECTION
          </p>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.live} aria-hidden="true" />
              {copy.eyebrow}
            </p>
            <h1 className={styles.heroTitle} id="suite-hero-title">
              {copy.heroTitle.map((line, index) => (
                <HeroTitleLine key={`${line.kind}-${index}`} line={line} late={index === 2} />
              ))}
            </h1>
          </div>
          <aside className={styles.stave} aria-label={copy.staveAria}>
            {copy.products.map((product) => (
              <a key={product.id} href={`#product-${product.id}`}>
                <span>{product.index}</span>
                <strong>{product.name}</strong>
              </a>
            ))}
          </aside>
        </div>

        <div className={styles.heroFoot}>
          <p>{copy.heroFoot}</p>
          <div className={styles.heroActions}>
            <a className={styles.cta} href={copy.enter.registerHref}>
              <span>{copy.enter.registerLabel}</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a className={styles.textLink} href={copy.enter.loginHref}>
              {copy.enter.loginLabel} →
            </a>
          </div>
          <p className={styles.folio}>{copy.folio}</p>
        </div>
      </section>

      <div className={styles.ticker} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {[0, 1].map((dup) => (
            <span key={dup}>
              {SUITE_LANDING_TICKER.map((item) => (
                <span key={`${dup}-${item}`}>
                  {item}
                  <i>∗</i>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <section className={styles.thesis} aria-labelledby="thesis-title">
        <p className={styles.sectionIndex}>{copy.thesisIndex}</p>
        <p className={styles.watermark} aria-hidden="true">
          {copy.thesisWatermark}
        </p>
        <div className={styles.thesisGrid}>
          <h2 id="thesis-title">
            {copy.thesisTitleLines.map((line, index) => (
              <span key={line}>
                {line}
                {index < copy.thesisTitleLines.length - 1 ? <br /> : null}
              </span>
            ))}
          </h2>
          <p>{copy.thesisBody}</p>
        </div>
      </section>

      <section className={styles.sequence} id="sequence" aria-labelledby="sequence-title">
        <header className={styles.sequenceHead}>
          <p className={styles.sectionIndex}>{copy.sequenceIndex}</p>
          <h2 id="sequence-title">{copy.sequenceTitle}</h2>
          <p>{copy.sequenceLead}</p>
        </header>

        <ol className={styles.score}>
          {copy.sequence.map((step) => (
            <li
              key={step.id}
              id={`score-${step.id}`}
              className={styles.beat}
              data-tone={step.tone}
            >
              <div className={styles.beatIndex}>
                <span>{step.index}</span>
                <b aria-hidden="true" />
              </div>
              <div className={styles.beatBody}>
                <p className={styles.beatMeta}>
                  <span>{step.name}</span>
                  <span>{copy.roleLabel[step.role]}</span>
                  <span>{step.verb}</span>
                </p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.directory} id="products" aria-labelledby="products-title">
        <header className={styles.directoryHead}>
          <p className={styles.sectionIndex}>{copy.directoryIndex}</p>
          <h2 id="products-title">{copy.directoryTitle}</h2>
        </header>
        <ul className={styles.directoryList}>
          {copy.products.map((product) => (
            <li key={product.id} id={`product-${product.id}`}>
              <a
                href={
                  copy.sequence.some((step) => step.id === product.id)
                    ? `#score-${product.id}`
                    : `#product-${product.id}`
                }
              >
                <span className={styles.dirIndex}>{product.index}</span>
                <strong>{product.name}</strong>
                <em>{copy.roleLabel[product.role]}</em>
                <span className={styles.dirLine}>{product.line}</span>
                <span className={styles.dirArrow} aria-hidden="true">
                  ↘
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.hub} id="hub" aria-labelledby="hub-title">
        <p className={styles.watermark} aria-hidden="true">
          {copy.hubWatermark}
        </p>
        <div className={styles.hubLead}>
          <p className={styles.sectionIndex}>{copy.hubIndex}</p>
          <h2 id="hub-title">{copy.hubTitle}</h2>
        </div>
        <ul className={styles.hubList}>
          {copy.hubFunctions.map((fn, i) => (
            <li key={fn.id} data-featured={fn.id === 'collection' ? 'true' : undefined}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <h3>{fn.name}</h3>
              <p>{fn.line}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.close} aria-labelledby="close-title">
        <p className={styles.sectionIndex}>{copy.closeIndex}</p>
        <h2 id="close-title">
          {closeParts.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < closeParts.length - 1 ? <br /> : null}
            </span>
          ))}
          <em>{copy.closeTitle.em}</em>
        </h2>
        <div className={styles.closeActions}>
          <a className={styles.cta} href={copy.enter.registerHref}>
            <span>{copy.enter.registerLabel}</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a className={styles.textLink} href={copy.enter.loginHref}>
            {copy.enter.loginLabel} →
          </a>
        </div>
        <footer className={styles.footer}>
          <a className={styles.wordmark} href="#top">
            PLEXON<span> / MSQ DX</span>
          </a>
          <p>
            {copy.footerBlurb[0]}
            <br />
            {copy.footerBlurb[1]}
          </p>
          <nav aria-label={copy.footerNavAria}>
            {copy.nav.map((item) => (
              <a key={`footer-${item.href}`} href={item.href}>
                {item.label}
              </a>
            ))}
            <a href="#top">{copy.footerTop}</a>
          </nav>
          <small>{copy.footerCopy}</small>
        </footer>
      </section>
    </main>
  )
}
