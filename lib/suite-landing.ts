import { PATH_LOGIN, PATH_REGISTER, PATH_SUITE_LANDING } from '@/lib/constants'
import { runtimeEnv } from '@/lib/runtime-env'

export const SUITE_LANDING_SPIRION_CAPTURE_IDS = [
  'cap_1350292d44c14ed8b7278e325030e78b',
  'cap_24ba63753b384682be07981b4da317eb',
] as const

export type SuiteLandingLang = 'de' | 'en'

export const SUITE_LANDING_LANG_QUERY = 'lang'
export const SUITE_LANDING_DEFAULT_LANG: SuiteLandingLang = 'de'

export type SuiteProductRole = 'hub' | 'capability' | 'companion' | 'roadmap'

export type SuiteSequenceStep = {
  id: string
  index: string
  name: string
  role: SuiteProductRole
  verb: string
  title: string
  body: string
  tone: 'ground' | 'paper' | 'invert'
}

export type SuiteProduct = {
  id: string
  index: string
  name: string
  role: SuiteProductRole
  line: string
}

export type SuiteHubFunction = {
  id: string
  name: string
  line: string
}

export type SuiteHeroTitleLine =
  | { kind: 'plain'; text: string }
  | { kind: 'mixed'; before: string; em: string }

export type SuiteLandingCopy = {
  lang: SuiteLandingLang
  htmlLang: SuiteLandingLang
  meta: {
    title: string
    description: string
  }
  skipLink: string
  wordmarkAria: string
  issueMeta: [string, string]
  navAria: string
  nav: ReadonlyArray<{ href: string; label: string }>
  langSwitchAria: string
  langSwitch: { de: string; en: string }
  staveAria: string
  eyebrow: string
  heroTitle: ReadonlyArray<SuiteHeroTitleLine>
  heroFoot: string
  folio: string
  thesisIndex: string
  thesisWatermark: string
  thesisTitleLines: ReadonlyArray<string>
  thesisBody: string
  sequenceIndex: string
  sequenceTitle: string
  sequenceLead: string
  directoryIndex: string
  directoryTitle: string
  hubWatermark: string
  hubIndex: string
  hubTitle: string
  closeIndex: string
  closeTitle: { before: string; em: string }
  footerBlurb: [string, string]
  footerNavAria: string
  footerTop: string
  footerCopy: string
  enter: {
    registerHref: string
    loginHref: string
    registerLabel: string
    loginLabel: string
  }
  roleLabel: Record<SuiteProductRole, string>
  sequence: SuiteSequenceStep[]
  products: SuiteProduct[]
  hubFunctions: SuiteHubFunction[]
}

export const SUITE_LANDING_TICKER = [
  'Collection',
  'Assistant',
  'Flows',
  'Knowledge',
  'ECHON',
  'AUDION',
  'CHECKION',
  'BRANDION',
  'SPIRION',
  'CREATION',
  'VIDEON',
] as const

export function parseSuiteLandingLang(raw: unknown): SuiteLandingLang | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'de' || normalized === 'en') return normalized
  return null
}

/** Explicit `?lang=` wins; otherwise fall back to cookie / Accept-Language. */
export function resolveSuiteLandingLang(
  queryLang: unknown,
  fallback: SuiteLandingLang = SUITE_LANDING_DEFAULT_LANG,
): SuiteLandingLang {
  return parseSuiteLandingLang(queryLang) ?? fallback
}

export function pathSuiteLanding(lang: SuiteLandingLang = SUITE_LANDING_DEFAULT_LANG): string {
  if (lang === SUITE_LANDING_DEFAULT_LANG) return PATH_SUITE_LANDING
  return `${PATH_SUITE_LANDING}?${SUITE_LANDING_LANG_QUERY}=${lang}`
}

export function suiteLandingAbsoluteUrl(lang: SuiteLandingLang): string {
  const base = (runtimeEnv('NEXTAUTH_URL') || runtimeEnv('PUBLIC_APP_URL')).replace(/\/$/, '')
  const path = pathSuiteLanding(lang)
  return base ? `${base}${path}` : path
}

const DE: SuiteLandingCopy = {
  lang: 'de',
  htmlLang: 'de',
  meta: {
    title: 'PLEXON — Die Collection der MSQ DX Suite',
    description:
      'Ein Projekt, alle Disziplinen. PLEXON hält Collection, Assistant, Flows und die Fähigkeiten CHECKION, AUDION, BRANDION, CREATION und SPIRION in einem Arbeitsraum.',
  },
  skipLink: 'Zum Ablauf springen',
  wordmarkAria: 'PLEXON Start',
  issueMeta: ['Suite Issue 01', 'Collection operating system'],
  navAria: 'Seitenabschnitte',
  nav: [
    { href: '#sequence', label: 'Ablauf' },
    { href: '#products', label: 'Produkte' },
    { href: '#hub', label: 'PLEXON' },
  ],
  langSwitchAria: 'Sprache',
  langSwitch: { de: 'DE', en: 'EN' },
  staveAria: 'Produktindex',
  eyebrow: 'Ein Arbeitsraum · keine Tool-Inseln',
  heroTitle: [
    { kind: 'plain', text: 'Ein' },
    { kind: 'plain', text: 'Projekt.' },
    { kind: 'mixed', before: 'Alle ', em: 'Disziplinen.' },
  ],
  heroFoot:
    'PLEXON ist die Collection der MSQ DX Suite. Qualität, Marke, Audience, Design und Recherche teilen denselben Kontext — und denselben Assistant.',
  folio: '01 / Collection first',
  thesisIndex: 'These / 00',
  thesisWatermark: 'WARUM',
  thesisTitleLines: ['Sieben Spezialisten', 'ohne gemeinsame Akte', 'sind kein System.'],
  thesisBody:
    'Die Suite verkauft keine lose Sammlung von Apps. Eine Collection ist das Projekt. Fähigkeiten öffnen sich im richtigen Kontext. Was geprüft, gehört, gehalten und gebaut wird, bleibt auffindbar — und als Flow wiederholbar.',
  sequenceIndex: 'Ablauf / 01–07',
  sequenceTitle: 'Die Arbeit hat eine Richtung.',
  sequenceLead:
    'Nicht Feature-Kacheln. Eine Partitur: vom Signal zur Fläche, von der Marke zum gemachten Ding — gehalten in PLEXON.',
  directoryIndex: 'Register / Produkte',
  directoryTitle: 'Jedes Produkt hat eine Rolle. Keines ist ein zweites Projekt.',
  hubWatermark: 'HUB',
  hubIndex: 'PLEXON / Kern',
  hubTitle: 'Vier Funktionen, die die Suite zusammenhalten.',
  closeIndex: 'Neue Collection · 2026',
  closeTitle: { before: 'Anfangen,\nwo die Arbeit\n', em: 'zusammenbleibt.' },
  footerBlurb: ['Collection hub', 'Capabilities · Companion · Roadmap'],
  footerNavAria: 'Fußnavigation',
  footerTop: 'Nach oben ↑',
  footerCopy: '© 2026 MSQ DX — PLEXON v3',
  enter: {
    registerHref: PATH_REGISTER,
    loginHref: PATH_LOGIN,
    registerLabel: 'Collection öffnen',
    loginLabel: 'Anmelden',
  },
  roleLabel: {
    hub: 'Hub',
    capability: 'Capability',
    companion: 'Companion',
    roadmap: 'Roadmap',
  },
  sequence: [
    {
      id: 'echon',
      index: '01',
      name: 'ECHON',
      role: 'companion',
      verb: 'Lesen',
      title: 'Was sich bewegt.',
      body: 'Markt- und Newssignale werden zu Wellen, Watchlists und zitierten Briefings. Die Suite beginnt nicht bei der Seite — sie beginnt bei der Bewegung.',
      tone: 'ground',
    },
    {
      id: 'audion',
      index: '02',
      name: 'AUDION',
      role: 'capability',
      verb: 'Hören',
      title: 'Für wen das ist.',
      body: 'Zielgruppen, Personas und Journeys als lebende Assets: befragen, in Studien schicken, in Flows wiederverwenden. Audience bleibt nicht in einem Deck.',
      tone: 'paper',
    },
    {
      id: 'checkion',
      index: '03',
      name: 'CHECKION',
      role: 'capability',
      verb: 'Prüfen',
      title: 'Wie die Fläche wirkt.',
      body: 'Seiten und Domains auf Barrierefreiheit, SEO-Signale und generative Sichtbarkeit. Magazin für Stakeholder, Report-Tiefe für Spezialisten — in derselben Collection.',
      tone: 'invert',
    },
    {
      id: 'brandion',
      index: '04',
      name: 'BRANDION',
      role: 'capability',
      verb: 'Halten',
      title: 'Was die Marke darf.',
      body: 'Guidelines und Tokens als einzige Wahrheit. Assets werden gemessen, nicht diskutiert. CREATION konsumiert das active pack — kein zweites Tokensystem.',
      tone: 'paper',
    },
    {
      id: 'spirion',
      index: '05',
      name: 'SPIRION',
      role: 'capability',
      verb: 'Sehen',
      title: 'Wovon Craft lernt.',
      body: 'Echte UI-Captures und Prompt-Packs statt erfundener Moodboards. Dichte, Rhythmus, Typeskala — referenziert, nicht 1:1 geklont.',
      tone: 'ground',
    },
    {
      id: 'creation',
      index: '06',
      name: 'CREATION',
      role: 'capability',
      verb: 'Machen',
      title: 'Was gebaut wird.',
      body: 'Seiten und Magazine als gültiger, reviewbarer Code. Brandion liefert die Sprache, SPIRION die Craft-Hinweise, die Collection den Kontext.',
      tone: 'paper',
    },
    {
      id: 'plexon',
      index: '07',
      name: 'PLEXON',
      role: 'hub',
      verb: 'Binden',
      title: 'Wo der Kontext bleibt.',
      body: 'Die Collection ist das einzige nutzersichtbare Projekt. Assistant, Flows und Knowledge Packs halten Übergaben fest, damit keine Disziplin neu von vorn beginnt.',
      tone: 'invert',
    },
  ],
  products: [
    {
      id: 'plexon',
      index: '00',
      name: 'PLEXON',
      role: 'hub',
      line: 'Shared workspace. Eine Collection, ein Login, ein Gedächtnis.',
    },
    {
      id: 'echon',
      index: '01',
      name: 'ECHON',
      role: 'companion',
      line: 'Foresight-Begleiter: Signale, Wellen, zitierte Recherche.',
    },
    {
      id: 'audion',
      index: '02',
      name: 'AUDION',
      role: 'capability',
      line: 'Personas, Journeys, synthetische Audience-Arbeit.',
    },
    {
      id: 'checkion',
      index: '03',
      name: 'CHECKION',
      role: 'capability',
      line: 'Webqualität, SEO-Signale, GEO-Sichtbarkeit.',
    },
    {
      id: 'brandion',
      index: '04',
      name: 'BRANDION',
      role: 'capability',
      line: 'Guidelines, Tokens, Brand-Maß — SSOT für CREATION.',
    },
    {
      id: 'spirion',
      index: '05',
      name: 'SPIRION',
      role: 'capability',
      line: 'Design-Referenzen und Capture-Packs für Craft.',
    },
    {
      id: 'creation',
      index: '06',
      name: 'CREATION',
      role: 'capability',
      line: 'Komposition als Code, gebunden an das active pack.',
    },
    {
      id: 'videon',
      index: '07',
      name: 'VIDEON',
      role: 'roadmap',
      line: 'Video durchsuchbar machen. Suite-Integration auf der Roadmap.',
    },
  ],
  hubFunctions: [
    {
      id: 'collection',
      name: 'Collection',
      line: 'Das einzige Projekt, das Nutzer sehen. Fähigkeiten spiegeln sich hinein — sie werden keine zweiten Projekte.',
    },
    {
      id: 'assistant',
      name: 'Assistant',
      line: 'Orchestriert die Suite im Kontext der Collection. Rezepte lassen sich als Flows behalten.',
    },
    {
      id: 'flows',
      name: 'Flows',
      line: 'Wiederholbare Ketten: Scan, Journey, Brand-Maß, Übergabe. Kein Prozess jedes Mal neu.',
    },
    {
      id: 'knowledge',
      name: 'Knowledge',
      line: 'Packs und Facetten, die Ergebnisse binden — damit Insight nicht in einem Chat verschwindet.',
    },
  ],
}

const EN: SuiteLandingCopy = {
  lang: 'en',
  htmlLang: 'en',
  meta: {
    title: 'PLEXON — The Collection hub of the MSQ DX suite',
    description:
      'One project, every discipline. PLEXON keeps Collection, Assistant, Flows, and the CHECKION, AUDION, BRANDION, CREATION, and SPIRION capabilities in one workspace.',
  },
  skipLink: 'Skip to the sequence',
  wordmarkAria: 'PLEXON home',
  issueMeta: ['Suite Issue 01', 'Collection operating system'],
  navAria: 'Page sections',
  nav: [
    { href: '#sequence', label: 'Sequence' },
    { href: '#products', label: 'Products' },
    { href: '#hub', label: 'PLEXON' },
  ],
  langSwitchAria: 'Language',
  langSwitch: { de: 'DE', en: 'EN' },
  staveAria: 'Product index',
  eyebrow: 'One workspace · no tool islands',
  heroTitle: [
    { kind: 'plain', text: 'One' },
    { kind: 'plain', text: 'project.' },
    { kind: 'mixed', before: 'Every ', em: 'discipline.' },
  ],
  heroFoot:
    'PLEXON is the Collection of the MSQ DX suite. Quality, brand, audience, design, and research share the same context — and the same Assistant.',
  folio: '01 / Collection first',
  thesisIndex: 'Thesis / 00',
  thesisWatermark: 'WHY',
  thesisTitleLines: ['Seven specialists', 'without a shared file', 'are not a system.'],
  thesisBody:
    'The suite is not a loose bag of apps. A Collection is the project. Capabilities open in the right context. What gets checked, heard, held, and built stays findable — and repeatable as a Flow.',
  sequenceIndex: 'Sequence / 01–07',
  sequenceTitle: 'The work has a direction.',
  sequenceLead:
    'Not feature tiles. A score: from signal to surface, from brand to made thing — held in PLEXON.',
  directoryIndex: 'Register / Products',
  directoryTitle: 'Every product has a role. None is a second project.',
  hubWatermark: 'HUB',
  hubIndex: 'PLEXON / Core',
  hubTitle: 'Four functions that hold the suite together.',
  closeIndex: 'New Collection · 2026',
  closeTitle: { before: 'Start\nwhere the work\n', em: 'stays together.' },
  footerBlurb: ['Collection hub', 'Capabilities · Companion · Roadmap'],
  footerNavAria: 'Footer',
  footerTop: 'Back to top ↑',
  footerCopy: '© 2026 MSQ DX — PLEXON v3',
  enter: {
    registerHref: PATH_REGISTER,
    loginHref: PATH_LOGIN,
    registerLabel: 'Open a Collection',
    loginLabel: 'Sign in',
  },
  roleLabel: {
    hub: 'Hub',
    capability: 'Capability',
    companion: 'Companion',
    roadmap: 'Roadmap',
  },
  sequence: [
    {
      id: 'echon',
      index: '01',
      name: 'ECHON',
      role: 'companion',
      verb: 'Read',
      title: 'What is moving.',
      body: 'Market and news signals become waves, watchlists, and cited briefings. The suite does not start at the page — it starts at the motion.',
      tone: 'ground',
    },
    {
      id: 'audion',
      index: '02',
      name: 'AUDION',
      role: 'capability',
      verb: 'Listen',
      title: 'Who it is for.',
      body: 'Audiences, personas, and journeys as living assets: interview them, send them into studies, reuse them in Flows. Audience does not stay trapped in a deck.',
      tone: 'paper',
    },
    {
      id: 'checkion',
      index: '03',
      name: 'CHECKION',
      role: 'capability',
      verb: 'Check',
      title: 'How the surface performs.',
      body: 'Pages and domains on accessibility, SEO signals, and generative visibility. Magazine for stakeholders, report depth for specialists — in the same Collection.',
      tone: 'invert',
    },
    {
      id: 'brandion',
      index: '04',
      name: 'BRANDION',
      role: 'capability',
      verb: 'Hold',
      title: 'What the brand allows.',
      body: 'Guidelines and tokens as the single source of truth. Assets are measured, not argued. CREATION consumes the active pack — no second token system.',
      tone: 'paper',
    },
    {
      id: 'spirion',
      index: '05',
      name: 'SPIRION',
      role: 'capability',
      verb: 'See',
      title: 'What craft learns from.',
      body: 'Real UI captures and prompt packs instead of invented moodboards. Density, rhythm, type scale — referenced, never cloned 1:1.',
      tone: 'ground',
    },
    {
      id: 'creation',
      index: '06',
      name: 'CREATION',
      role: 'capability',
      verb: 'Make',
      title: 'What gets built.',
      body: 'Pages and magazines as valid, reviewable code. Brandion supplies the language, SPIRION the craft cues, the Collection the context.',
      tone: 'paper',
    },
    {
      id: 'plexon',
      index: '07',
      name: 'PLEXON',
      role: 'hub',
      verb: 'Bind',
      title: 'Where context stays.',
      body: 'The Collection is the only user-facing project. Assistant, Flows, and Knowledge Packs hold handoffs so no discipline starts from zero again.',
      tone: 'invert',
    },
  ],
  products: [
    {
      id: 'plexon',
      index: '00',
      name: 'PLEXON',
      role: 'hub',
      line: 'Shared workspace. One Collection, one login, one memory.',
    },
    {
      id: 'echon',
      index: '01',
      name: 'ECHON',
      role: 'companion',
      line: 'Foresight companion: signals, waves, cited research.',
    },
    {
      id: 'audion',
      index: '02',
      name: 'AUDION',
      role: 'capability',
      line: 'Personas, journeys, synthetic audience work.',
    },
    {
      id: 'checkion',
      index: '03',
      name: 'CHECKION',
      role: 'capability',
      line: 'Web quality, SEO signals, GEO visibility.',
    },
    {
      id: 'brandion',
      index: '04',
      name: 'BRANDION',
      role: 'capability',
      line: 'Guidelines, tokens, brand measure — SSOT for CREATION.',
    },
    {
      id: 'spirion',
      index: '05',
      name: 'SPIRION',
      role: 'capability',
      line: 'Design references and capture packs for craft.',
    },
    {
      id: 'creation',
      index: '06',
      name: 'CREATION',
      role: 'capability',
      line: 'Composition as code, bound to the active pack.',
    },
    {
      id: 'videon',
      index: '07',
      name: 'VIDEON',
      role: 'roadmap',
      line: 'Make video searchable. Suite integration is on the roadmap.',
    },
  ],
  hubFunctions: [
    {
      id: 'collection',
      name: 'Collection',
      line: 'The only project users see. Capabilities mirror into it — they never become second projects.',
    },
    {
      id: 'assistant',
      name: 'Assistant',
      line: 'Orchestrates the suite in Collection context. Recipes can be kept as Flows.',
    },
    {
      id: 'flows',
      name: 'Flows',
      line: 'Repeatable chains: scan, journey, brand measure, handoff. No process reinvented each time.',
    },
    {
      id: 'knowledge',
      name: 'Knowledge',
      line: 'Packs and facets that bind results — so insight does not vanish inside a chat.',
    },
  ],
}

const BY_LANG: Record<SuiteLandingLang, SuiteLandingCopy> = {
  de: DE,
  en: EN,
}

export function getSuiteLandingCopy(lang: SuiteLandingLang): SuiteLandingCopy {
  return BY_LANG[lang]
}
