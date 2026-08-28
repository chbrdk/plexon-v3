import styles from './agency.module.css'

const projects = [
  {
    number: '01',
    name: 'NOVA',
    discipline: 'Strategy · Identity · Digital',
    note: 'A new signal for urban movement.',
    visual: styles.visualNova,
    mark: 'N',
  },
  {
    number: '02',
    name: 'COMMON EARTH',
    discipline: 'Positioning · Campaign · Motion',
    note: 'Climate action made impossible to ignore.',
    visual: styles.visualEarth,
    mark: 'CE',
  },
  {
    number: '03',
    name: 'FUTURE / FM',
    discipline: 'Naming · Identity · Experience',
    note: 'A cultural frequency for the next generation.',
    visual: styles.visualFuture,
    mark: 'F/',
  },
]

const services = [
  ['01', 'Brand direction', 'Positioning, naming, voice, and the sharp idea that holds everything together.'],
  ['02', 'Identity systems', 'Distinctive identities designed to flex across every physical and digital touchpoint.'],
  ['03', 'Digital experiences', 'Websites and products with editorial clarity, precise interaction, and real character.'],
  ['04', 'Motion & launch', 'Motion languages, campaigns, and launch systems engineered to build momentum.'],
]

export default function AgencyLandingPage() {
  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#work">
        Skip to selected work
      </a>

      <section className={styles.hero} aria-labelledby="agency-hero-title">
        <header className={styles.header}>
          <a className={styles.wordmark} href="#top" aria-label="OFF/GRID home">
            OFF<span>/</span>GRID<sup>®</sup>
          </a>
          <p className={styles.headerMeta}>
            Independent design practice
            <br />
            Berlin · Working everywhere
          </p>
          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#contact">Start a project ↗</a>
          </nav>
        </header>

        <div className={styles.heroContent} id="top">
          <p className={styles.eyebrow}>Strategy · Identity · Digital · Motion</p>
          <h1 className={styles.heroTitle} id="agency-hero-title">
            <span className={styles.revealLine}><span>MAKE</span></span>
            <span className={`${styles.revealLine} ${styles.lineOffset}`}><span>IT</span></span>
            <span className={styles.revealLine}><span>UNMISS<span className={styles.outline}>ABLE.</span></span></span>
          </h1>
          <div className={styles.heroFoot}>
            <p>
              We turn brave ideas into brands people
              <br />
              notice, remember, and choose.
            </p>
            <a className={styles.roundLink} href="#work" aria-label="Explore selected work">
              <span>Explore work</span>
              <span aria-hidden="true">↘</span>
            </a>
            <span className={styles.issue}>Selected work / 2026</span>
          </div>
        </div>
      </section>

      <div className={styles.ticker} aria-label="Agency capabilities">
        <div className={styles.tickerTrack}>
          <span>Strategy</span><i>✳</i><span>Identity</span><i>✳</i><span>Digital</span><i>✳</i><span>Motion</span><i>✳</i>
          <span aria-hidden="true">Strategy</span><i aria-hidden="true">✳</i><span aria-hidden="true">Identity</span><i aria-hidden="true">✳</i><span aria-hidden="true">Digital</span><i aria-hidden="true">✳</i><span aria-hidden="true">Motion</span><i aria-hidden="true">✳</i>
        </div>
      </div>

      <section className={styles.intro} aria-labelledby="intro-title">
        <p className={styles.sectionLabel}>Why OFF/GRID</p>
        <h2 id="intro-title">
          Safe gets scrolled past.
          <br />
          <span>We design for the double take.</span>
        </h2>
        <p className={styles.introBody}>
          OFF/GRID is an independent design practice for organizations at a turning point. We
          combine sharp strategy with expressive craft to make change visible.
        </p>
      </section>

      <section className={styles.work} id="work" aria-labelledby="work-title">
        <div className={styles.sectionHead}>
          <p className={styles.sectionLabel}>Selected work</p>
          <h2 id="work-title">Built to be seen.</h2>
          <p>(03 projects)</p>
        </div>

        <div className={styles.projectList}>
          {projects.map((project) => (
            <article className={styles.project} key={project.name}>
              <a href="#contact" className={styles.projectLink} aria-label={`${project.name}: ${project.note}`}>
                <div className={`${styles.projectVisual} ${project.visual}`} aria-hidden="true">
                  <span className={styles.projectMark}>{project.mark}</span>
                  <span className={styles.visualIndex}>{project.number} / 03</span>
                  <span className={styles.visualArrow}>↗</span>
                </div>
                <div className={styles.projectMeta}>
                  <span>{project.number}</span>
                  <h3>{project.name}</h3>
                  <p>{project.note}</p>
                  <span className={styles.discipline}>{project.discipline}</span>
                </div>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.manifesto} aria-label="Agency point of view">
        <p className={styles.sectionLabel}>Our point of view</p>
        <p className={styles.manifestoType}>
          BE BOLD
          <span>OR BE</span>
          INVISIBLE.
        </p>
        <div className={styles.manifestoNote}>
          <span>Clarity over clutter.</span>
          <span>Character over convention.</span>
          <span>Impact over decoration.</span>
        </div>
      </section>

      <section className={styles.services} id="services" aria-labelledby="services-title">
        <div className={styles.servicesIntro}>
          <p className={styles.sectionLabel}>What we do</p>
          <h2 id="services-title">From first thought to full force.</h2>
          <p>
            We build small senior teams around each challenge. Strategy and making happen in one
            room, from day one.
          </p>
        </div>
        <ol className={styles.serviceList}>
          {services.map(([number, title, description]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className={styles.serviceArrow} aria-hidden="true">↗</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.principles} aria-label="How we work">
        <p className={styles.sectionLabel}>The model</p>
        <div>
          <strong>SMALL</strong>
          <span>Senior teams. No hand-offs.</span>
        </div>
        <div>
          <strong>SHARP</strong>
          <span>One clear idea. No design theatre.</span>
        </div>
        <div>
          <strong>FAST</strong>
          <span>Momentum from the very first week.</span>
        </div>
      </section>

      <section className={styles.contact} id="contact" aria-labelledby="contact-title">
        <p className={styles.sectionLabel}>New business · 2026</p>
        <h2 id="contact-title">
          HAVE SOMETHING
          <br />
          WORTH <span>NOTICING?</span>
        </h2>
        <a href="mailto:hello@offgrid.example" className={styles.contactLink}>
          <span>Tell us everything</span>
          <span aria-hidden="true">↗</span>
        </a>
        <footer className={styles.footer}>
          <a className={styles.wordmark} href="#top">OFF<span>/</span>GRID<sup>®</sup></a>
          <p>Independent design practice<br />Berlin · Working everywhere</p>
          <div>
            <a href="#work">Instagram</a>
            <a href="#work">LinkedIn</a>
            <a href="#top">Back to top ↑</a>
          </div>
          <small>© 2026 OFF/GRID — Concept site</small>
        </footer>
      </section>
    </main>
  )
}
