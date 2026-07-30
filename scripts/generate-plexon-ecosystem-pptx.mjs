/**
 * Generate PLEXON ecosystem enablement PowerPoint.
 * Sources: knowledge/plexon-ecosystem-pptx.md + product one-pagers / ECHON docs.
 *
 * Usage: node scripts/generate-plexon-ecosystem-pptx.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PptxGenJS from 'pptxgenjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const ECOSYSTEM_PPTX_DIR = 'assets/presentations';
const ECOSYSTEM_PPTX_FILENAME = 'plexon-oekosystem.pptx';

/** MSQDX print brand (aligned with pdf-print-tokens) */
const C = {
  brand: '00CA55',
  ink: '111111',
  muted: '555555',
  soft: 'F3F4F6',
  white: 'FFFFFF',
  line: 'E5E7EB',
  cardBg: 'FAFAFA',
};

const FONT = 'Arial';
const TOTAL = 12;

let _pptx;
function pptxShapeRect() {
  return _pptx.ShapeType.rect;
}

function addFooter(slide, page) {
  slide.addText('PLEXON · MSQDX', {
    x: 0.55,
    y: 7.05,
    w: 8,
    h: 0.28,
    fontSize: 10,
    fontFace: FONT,
    color: C.muted,
  });
  slide.addText(`${page} / ${TOTAL}`, {
    x: 11.2,
    y: 7.05,
    w: 1.5,
    h: 0.28,
    fontSize: 10,
    fontFace: FONT,
    color: C.muted,
    align: 'right',
  });
}

function addAccentBar(slide) {
  slide.addShape(pptxShapeRect(), {
    x: 0,
    y: 0,
    w: 0.12,
    h: 7.5,
    fill: { color: C.brand },
    line: { color: C.brand },
  });
}

function addSlideTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.55,
    y: 0.28,
    w: 12.2,
    h: 0.5,
    fontSize: 24,
    fontFace: FONT,
    bold: true,
    color: C.ink,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55,
      y: 0.78,
      w: 12.2,
      h: 0.38,
      fontSize: 12,
      fontFace: FONT,
      color: C.muted,
    });
  }
}

function addThreeColumnProductSlide(slide, { title, subtitle, lead, cols }) {
  addAccentBar(slide);
  addSlideTitle(slide, title, subtitle);
  slide.addText(lead, {
    x: 0.55,
    y: 1.22,
    w: 12.2,
    h: 0.55,
    fontSize: 12,
    fontFace: FONT,
    color: C.muted,
  });
  cols.forEach((col, i) => {
    const x = 0.55 + i * 4.15;
    slide.addShape(pptxShapeRect(), {
      x,
      y: 1.9,
      w: 3.95,
      h: 4.7,
      fill: { color: C.cardBg },
      line: { color: C.line },
    });
    slide.addText(col.h, {
      x: x + 0.18,
      y: 2.1,
      w: 3.55,
      h: 0.35,
      fontSize: 14,
      fontFace: FONT,
      bold: true,
      color: C.brand,
    });
    slide.addText(
      col.items.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      {
        x: x + 0.18,
        y: 2.55,
        w: 3.55,
        h: 3.85,
        fontSize: 11,
        fontFace: FONT,
        color: C.ink,
        valign: 'top',
      }
    );
  });
}

/**
 * @returns {Promise<{ absolutePath: string, slideCount: number, buffer: Buffer }>}
 */
export async function generatePlexonEcosystemPptx(options = {}) {
  const outDir = options.outDir
    ? path.resolve(options.outDir)
    : path.join(REPO_ROOT, ECOSYSTEM_PPTX_DIR);
  const outFile = path.join(outDir, options.filename || ECOSYSTEM_PPTX_FILENAME);

  const pptx = new PptxGenJS();
  _pptx = pptx;
  pptx.defineLayout({ name: 'WIDE_16x9', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE_16x9';
  pptx.author = 'PLEXON';
  pptx.company = 'MSQDX';
  pptx.title = 'PLEXON Ökosystem – AUDION, CHECKION, BRANDION, VIDEON, ECHON';
  pptx.subject = 'Enablement: Funktionen, Mehrwert, Zusammenspiel';

  // —— 1 Title ——
  {
    const s = pptx.addSlide();
    s.addShape(pptxShapeRect(), {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: C.ink },
      line: { color: C.ink },
    });
    s.addShape(pptxShapeRect(), {
      x: 0,
      y: 0,
      w: 0.18,
      h: 7.5,
      fill: { color: C.brand },
      line: { color: C.brand },
    });
    s.addText('PLEXON', {
      x: 0.8,
      y: 1.7,
      w: 11.5,
      h: 0.65,
      fontSize: 40,
      fontFace: FONT,
      bold: true,
      color: C.white,
    });
    s.addText('Ökosystem für digitale Evidenz', {
      x: 0.8,
      y: 2.4,
      w: 11.5,
      h: 0.4,
      fontSize: 18,
      fontFace: FONT,
      color: C.brand,
    });
    s.addText('AUDION · CHECKION · BRANDION · VIDEON · ECHON', {
      x: 0.8,
      y: 3.0,
      w: 11.5,
      h: 0.4,
      fontSize: 16,
      fontFace: FONT,
      color: 'CCCCCC',
    });
    s.addText(
      'Fünf Produkte, eine Steuerungslogik: Web-Qualität, Zielgruppe, Marke, Video und Marktsignale —\nverbunden über Identität, Usage und Orchestrierung in PLEXON.',
      {
        x: 0.8,
        y: 3.7,
        w: 11,
        h: 0.9,
        fontSize: 13,
        fontFace: FONT,
        color: 'AAAAAA',
      }
    );
    s.addText('Enablement · MSQDX · Juli 2026', {
      x: 0.8,
      y: 6.6,
      w: 11,
      h: 0.3,
      fontSize: 11,
      fontFace: FONT,
      color: '888888',
    });
  }

  // —— 2 Agenda ——
  {
    const s = pptx.addSlide();
    addAccentBar(s);
    addSlideTitle(s, 'Agenda', 'Vom Warum über die Produkte bis zum Zusammenspiel');
    const items = [
      { n: '01', t: 'Warum dieses Ökosystem?', d: 'Problem, Versprechen, gemeinsame Logik' },
      { n: '02', t: 'PLEXON als Hub', d: 'Was zentral ist — und was bewusst produktlokal bleibt' },
      { n: '03', t: 'Fünf Linsen', d: 'Welche Frage jedes Produkt beantwortet' },
      { n: '04', t: 'Produkte im Detail', d: 'AUDION, CHECKION, BRANDION, VIDEON, ECHON' },
      { n: '05', t: 'Zusammenspiel', d: 'Synergien und ein Kampagnen-Beispiel end-to-end' },
    ];
    items.forEach((it, i) => {
      const y = 1.35 + i * 0.95;
      s.addText(it.n, {
        x: 0.7,
        y,
        w: 1.0,
        h: 0.45,
        fontSize: 20,
        fontFace: FONT,
        bold: true,
        color: C.brand,
      });
      s.addText(it.t, {
        x: 1.85,
        y,
        w: 10,
        h: 0.32,
        fontSize: 16,
        fontFace: FONT,
        bold: true,
        color: C.ink,
      });
      s.addText(it.d, {
        x: 1.85,
        y: y + 0.32,
        w: 10,
        h: 0.28,
        fontSize: 12,
        fontFace: FONT,
        color: C.muted,
      });
    });
    addFooter(s, 2);
  }

  // —— 3 Warum ——
  {
    const s = pptx.addSlide();
    addAccentBar(s);
    addSlideTitle(
      s,
      'Warum dieses Ökosystem?',
      'Statt isolierter Tools: eine gemeinsame Evidenzbasis für Entscheidungen'
    );
    s.addText(
      'Organisationen arbeiten oft mit parallelen Wahrheiten: ein Audit-PDF, ein Persona-Workshop, ein Brand-Handbuch, Videoordner und Newsfeeds — ohne gemeinsamen Bezug. PLEXON und die föderierten Produkte schließen diese Lücke.',
      {
        x: 0.55,
        y: 1.25,
        w: 12.2,
        h: 0.7,
        fontSize: 12,
        fontFace: FONT,
        color: C.muted,
      }
    );
    const boxes = [
      {
        h: 'Das Problem',
        items: [
          'Stichtags-Audits veralten schnell',
          'Zielgruppen bleiben statische PDFs',
          'Markenregeln vs. reale Assets driftet',
          'Video und Marktnews sind schwer nutzbar',
          'Teams sprechen über unterschiedliche „Stand heute“-Stories',
        ],
      },
      {
        h: 'Das Versprechen',
        items: [
          'Wiederholbare Messung statt Einmal-Gutachten',
          'Befragbare Personas statt Annahmen',
          'Messbare Guidelines statt Handbuch allein',
          'Mediathek & Marktsignale mit Struktur',
          'Eine Steuerungslogik über PLEXON',
        ],
      },
      {
        h: 'Wie es zusammenhält',
        items: [
          'Ein Login, Profil und Usage',
          'Plattform-Projekte mit Sync',
          'Assistent / Board orchestriert MCP',
          'Jedes Produkt behält seine Fachtiefe',
          'Führung sieht eine zusammenhängende Story',
        ],
      },
    ];
    boxes.forEach((col, i) => {
      const x = 0.55 + i * 4.15;
      s.addShape(pptxShapeRect(), {
        x,
        y: 2.1,
        w: 3.95,
        h: 4.4,
        fill: { color: C.cardBg },
        line: { color: C.line },
      });
      s.addText(col.h, {
        x: x + 0.18,
        y: 2.3,
        w: 3.55,
        h: 0.35,
        fontSize: 14,
        fontFace: FONT,
        bold: true,
        color: C.brand,
      });
      s.addText(
        col.items.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        {
          x: x + 0.18,
          y: 2.8,
          w: 3.55,
          h: 3.5,
          fontSize: 12,
          fontFace: FONT,
          color: C.ink,
          valign: 'top',
        }
      );
    });
    addFooter(s, 3);
  }

  // —— 4 PLEXON Hub ——
  {
    const s = pptx.addSlide();
    addAccentBar(s);
    addSlideTitle(
      s,
      'PLEXON — die Control Plane',
      'Zentral nur das Übergreifende; Fachworkflows bleiben in den Produkten'
    );
    s.addText(
      'PLEXON ist keine zweite Vollkopie von CHECKION oder AUDION. Es besitzt Identity, Registry, Usage und Orchestrierung — und öffnet die Produkte über Deep Links, Sync und MCP.',
      {
        x: 0.55,
        y: 1.2,
        w: 12.2,
        h: 0.55,
        fontSize: 12,
        fontFace: FONT,
        color: C.muted,
      }
    );
    const left = [
      'Ein Login & Profil für alle Dienste',
      'Usage / Token-Transparenz & Entitlements',
      'Produkt-Registry & Health / Deep Links',
      'Assistent & Board: CHECKION + AUDION + ECHON',
      'Plattform-Projekte mit Sync in die Produkte',
      'Quick Checks & Playbooks über Produktgrenzen',
    ];
    const right = [
      'CHECKION: Scans, GEO, Projekte, MCP',
      'AUDION: Personas, Journeys, Chat',
      'BRANDION: Guidelines & PDF-Checks',
      'VIDEON: Video-Analyse & Export',
      'ECHON: Signals, Waves, Markt-Research',
      'Tiefe Fach-UI bleibt bewusst produktlokal',
    ];
    s.addShape(pptxShapeRect(), {
      x: 0.55,
      y: 1.9,
      w: 5.9,
      h: 4.6,
      fill: { color: C.cardBg },
      line: { color: C.line },
    });
    s.addText('In PLEXON', {
      x: 0.75,
      y: 2.1,
      w: 5.4,
      h: 0.35,
      fontSize: 15,
      fontFace: FONT,
      bold: true,
      color: C.brand,
    });
    s.addText(
      left.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      {
        x: 0.75,
        y: 2.55,
        w: 5.4,
        h: 3.7,
        fontSize: 12,
        fontFace: FONT,
        color: C.ink,
        valign: 'top',
      }
    );
    s.addShape(pptxShapeRect(), {
      x: 6.85,
      y: 1.9,
      w: 5.9,
      h: 4.6,
      fill: { color: C.cardBg },
      line: { color: C.line },
    });
    s.addText('In den Produkten', {
      x: 7.05,
      y: 2.1,
      w: 5.4,
      h: 0.35,
      fontSize: 15,
      fontFace: FONT,
      bold: true,
      color: C.brand,
    });
    s.addText(
      right.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      {
        x: 7.05,
        y: 2.55,
        w: 5.4,
        h: 3.7,
        fontSize: 12,
        fontFace: FONT,
        color: C.ink,
        valign: 'top',
      }
    );
    addFooter(s, 4);
  }

  // —— 5 Five lenses ——
  {
    const s = pptx.addSlide();
    addAccentBar(s);
    addSlideTitle(
      s,
      'Fünf Linsen — eine Geschichte',
      'Jedes Produkt beantwortet eine andere Frage; zusammen entsteht ein vollständiges Lagebild'
    );
    const lenses = [
      { name: 'CHECKION', q: 'Wie steht unsere Site?', hint: 'technisch · barrierefrei · GEO' },
      { name: 'AUDION', q: 'Wie reagiert die Zielgruppe?', hint: 'Personas · Dialog · Journeys' },
      { name: 'BRANDION', q: 'Passt das Material zur Marke?', hint: 'Guidelines · PDF · Freigabe' },
      { name: 'VIDEON', q: 'Was steckt im Video?', hint: 'Szenen · Suche · Export' },
      { name: 'ECHON', q: 'Was bewegt den Markt?', hint: 'Signals · Waves · Research' },
    ];
    lenses.forEach((L, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const w = 3.95;
      const h = 2.15;
      const x = 0.55 + col * 4.15;
      const y = 1.35 + row * 2.5;
      s.addShape(pptxShapeRect(), {
        x,
        y,
        w,
        h,
        fill: { color: C.cardBg },
        line: { color: C.line },
      });
      s.addShape(pptxShapeRect(), {
        x,
        y,
        w,
        h: 0.08,
        fill: { color: C.brand },
        line: { color: C.brand },
      });
      s.addText(L.name, {
        x: x + 0.2,
        y: y + 0.25,
        w: w - 0.4,
        h: 0.35,
        fontSize: 16,
        fontFace: FONT,
        bold: true,
        color: C.ink,
      });
      s.addText(L.q, {
        x: x + 0.2,
        y: y + 0.7,
        w: w - 0.4,
        h: 0.55,
        fontSize: 13,
        fontFace: FONT,
        italic: true,
        color: C.muted,
      });
      s.addText(L.hint, {
        x: x + 0.2,
        y: y + 1.4,
        w: w - 0.4,
        h: 0.4,
        fontSize: 12,
        fontFace: FONT,
        color: C.ink,
      });
    });
    addFooter(s, 5);
  }

  // —— 6 AUDION ——
  {
    const s = pptx.addSlide();
    addThreeColumnProductSlide(s, {
      title: 'AUDION — Persona Intelligence',
      subtitle: 'Die Zielgruppe wird vom Archiv-PDF zum Gesprächspartner',
      lead:
        'AUDION macht aus Research befragbare Personas und Journeys. Teams validieren Messaging, Designs und Annahmen am Artefakt — in Web, Figma, PowerPoint oder im PLEXON-Board — statt nur in Workshops.',
      cols: [
        {
          h: 'Funktionen',
          items: [
            'Projekte & parallele Target Groups',
            'KI-Personas aus Research / Ingestion',
            'Chat multimodal: Text, Voice, Video',
            'Customer Journey Maps & Fit-Scores',
            'Plugins: Figma, PowerPoint, MCP',
            'Moodboards, Sharing, AI Assist',
          ],
        },
        {
          h: 'Mehrwert',
          items: [
            'Lebende Modelle statt toter PDFs',
            'Mehr Iteration, weniger Panel-Kosten',
            'Vergleich über Segmente (z. B. Buying Committee)',
            'Validierung dort, wo Teams arbeiten',
            'Gemeinsames mentales Modell im Team',
          ],
        },
        {
          h: 'Im Ökosystem',
          items: [
            'CHECKION speist Site-Themen ein',
            'ECHON liefert Markt-/Audience-Kontext',
            'PLEXON: Login, Usage, Board + MCP',
            'Personas für GEO-Fragen & Messaging',
            'Playbook „Markt → Zielgruppen“',
          ],
        },
      ],
    });
    addFooter(s, 6);
  }

  // —— 7 CHECKION ——
  {
    const s = pptx.addSlide();
    addThreeColumnProductSlide(s, {
      title: 'CHECKION — Web-Qualität & GEO',
      subtitle: 'Wiederholbare Messlage statt einmaligem Audit im Schrank',
      lead:
        'CHECKION beantwortet: Wo stehen wir mit unserem Auftritt — inhaltlich, technisch, barrierefrei und in einer Welt, in der KI über uns antwortet? Messpunkte passen zum Release-Takt und lassen sich teilen.',
      cols: [
        {
          h: 'Funktionen',
          items: [
            'Single- & Deep-Domain-Scans',
            'WCAG, PageSpeed, SSL, Tools',
            'GEO / E-E-A-T & Wettbewerb',
            'UX Journey Agent, Rank Tracking',
            'Projekte, Research, Shares',
            'MCP-Server für Agenten / Boards',
          ],
        },
        {
          h: 'Mehrwert',
          items: [
            'Evidenz statt Bauchgefühl',
            'Regressionsschutz nach Deploys',
            'Eine Wahrheit für Marketing, IT, Compliance',
            'Klarere Prioritäten im Backlog',
            'Skalierung über Domains & Marken',
          ],
        },
        {
          h: 'Im Ökosystem',
          items: [
            'Speist AUDION-Personas & Topics',
            'PLEXON Quick Check / Assistent',
            'Messung + Persona in einer Session',
            'Landing-Qualität neben Brand/Video',
            'Kontext für ECHON-Market-Flows',
          ],
        },
      ],
    });
    addFooter(s, 7);
  }

  // —— 8 BRANDION ——
  {
    const s = pptx.addSlide();
    addThreeColumnProductSlide(s, {
      title: 'BRANDION — Marken-Compliance',
      subtitle: 'Von „wir haben Richtlinien“ zu „wir können belegen, dass dieses Asset passt“',
      lead:
        'BRANDION macht Guidelines strukturiert, aktivierbar und gegen konkrete PDFs/Lieferobjekte prüfbar — wiederholbar nach Re-Brand, Template-Wechsel oder Kampagnenwelle, nicht nur vor dem ersten Launch.',
      cols: [
        {
          h: 'Funktionen',
          items: [
            'Guidelines versionieren & aktivieren',
            'Analyzer: Farbe, Font, Layout, Vision',
            'Logo-, Imagery- und Spacing-Regeln',
            'Import / Export / Multi-Brand',
            'API & Automation in Freigabe-Flows',
            'Jobs mit nachvollziehbaren Findings',
          ],
        },
        {
          h: 'Mehrwert',
          items: [
            'Weniger falsche Farben/Fonts/Logos',
            'Tempo: weniger Handabgleich mit PDFs',
            'Eine aktive Guideline für alle Rollen',
            'Klare Lieferkriterien für Agenturen',
            'Objektive visuelle Compliance-Schicht',
          ],
        },
        {
          h: 'Im Ökosystem',
          items: [
            '+ CHECKION: Offline-Asset & Online-Site',
            '+ AUDION: regelkonform und zielgruppenpassend',
            '+ VIDEON: Kampagnen-Asset neben Video',
            'Broschüre + Landing + Botschaft als Story',
          ],
        },
      ],
    });
    addFooter(s, 8);
  }

  // —— 9 VIDEON ——
  {
    const s = pptx.addSlide();
    addThreeColumnProductSlide(s, {
      title: 'VIDEON — Video-Intelligenz',
      subtitle: 'Aus Ordnern wird eine Mediathek mit Bedeutung — schnittfertig und durchsuchbar',
      lead:
        'VIDEON erschließt Videobestände: Szenen, Transkript, Vision, Audio-Stems und Saliency — mit Export und Adobe-Plugins. Jedes neue Upload durchläuft dieselbe Pipeline; Wissen bleibt nicht im Kopf einzelner Editor:innen.',
      cols: [
        {
          h: 'Funktionen',
          items: [
            'Szenen- & Objekterkennung',
            'Transkription & Stem-Separation',
            'Saliency / Reframing-Support',
            'Semantische Suche & Projekte',
            'AI Creator für Rough-Cuts',
            'Export Premiere / FCP / AE-Plugins',
          ],
        },
        {
          h: 'Mehrwert',
          items: [
            'Weniger Scrubben und Suchen',
            'Archiv wird strategisch wiederverwendbar',
            'Konsistente Metadaten pro Asset',
            'ROI auf bestehendem Footage',
            'L&D: lange Videos navigierbar',
          ],
        },
        {
          h: 'Im Ökosystem',
          items: [
            'Hero-Video neben Landing (CHECKION)',
            'Marke (BRANDION) + Zielgruppe (AUDION)',
            'Marktstory aus ECHON in Motion setzen',
            'Wiederkehrende Qualität neuer Uploads',
          ],
        },
      ],
    });
    addFooter(s, 9);
  }

  // —— 10 ECHON ——
  {
    const s = pptx.addSlide();
    addThreeColumnProductSlide(s, {
      title: 'ECHON — Event & Market Intelligence',
      subtitle: 'Event Contextualization and Horizon Observation Network — Signale werden zu Themenlinien',
      lead:
        'ECHON strukturiert Nachrichten und Events (v. a. RSS), wertet sie mit LLM und Embeddings aus und bündelt ähnliche Meldungen zu Waves. Statt Feed-Lärm: Muster, Priorität und Research mit zitierbarer Evidenz — angebunden an PLEXON via MCP.',
      cols: [
        {
          h: 'Funktionen',
          items: [
            'RSS-Ingestion & Signal-Pipeline',
            'Embeddings, Tags, Kategorisierung',
            'Waves: Cluster / Themenlinien',
            'Wave Dynamics (Aufkommen, Verlauf)',
            'Research-Chat mit Citations',
            'MCP: Research, Signals, Waves',
          ],
        },
        {
          h: 'Mehrwert',
          items: [
            'Weniger Lärm, mehr Lagebild',
            'Muster statt chronologischer Zufallsfeed',
            'Priorität: woran zuerst?',
            'Nachvollziehbare Markt-Evidenz',
            'Wissen statt flaches Nachrichtenarchiv',
          ],
        },
        {
          h: 'Im Ökosystem',
          items: [
            'PLEXON Assistent: 3. MCP neben CHECKION/AUDION',
            'Playbook Markt → Zielgruppen (AUDION)',
            'Quick Check: Markt-Research-Schritt',
            'CHECKION: Site-Kontext + externe Wellen',
            'Kampagne: Timing & Themen aus dem Markt',
          ],
        },
      ],
    });
    addFooter(s, 10);
  }

  // —— 11 Synergies ——
  {
    const s = pptx.addSlide();
    addAccentBar(s);
    addSlideTitle(
      s,
      'Zusammenspiel — Synergien',
      'Paare und Dreier, die mehr liefern als isolierte Produkt-Reports'
    );
    const rows = [
      ['CHECKION + AUDION', 'Site-Themen speisen realistische Personas; GEO in Persona-Stimme'],
      ['ECHON + AUDION', 'Markt-Findings → Zielgruppen / Segmente (Playbook „Markt → Audience“)'],
      ['ECHON + CHECKION', 'Externe Wellen + eigene Site-Messung = volleres Lagebild'],
      ['BRANDION + CHECKION', 'Offline-Assets und Online-Site — eine Markenwirkung'],
      ['VIDEON + alle', 'Hero-Video, Landing, PDF, Zielgruppe, Marktstory — eine Kampagne'],
      ['PLEXON + alle', 'Ein Account, Usage; Assistent/Board orchestriert über MCP'],
    ];
    rows.forEach((row, i) => {
      const y = 1.25 + i * 0.85;
      s.addShape(pptxShapeRect(), {
        x: 0.55,
        y,
        w: 12.2,
        h: 0.75,
        fill: { color: i % 2 === 0 ? C.cardBg : C.white },
        line: { color: C.line },
      });
      s.addText(row[0], {
        x: 0.75,
        y: y + 0.18,
        w: 4.0,
        h: 0.4,
        fontSize: 13,
        fontFace: FONT,
        bold: true,
        color: C.ink,
      });
      s.addText(row[1], {
        x: 4.9,
        y: y + 0.18,
        w: 7.5,
        h: 0.4,
        fontSize: 12,
        fontFace: FONT,
        color: C.muted,
      });
    });
    addFooter(s, 11);
  }

  // —— 12 Campaign + value ——
  {
    const s = pptx.addSlide();
    addAccentBar(s);
    addSlideTitle(
      s,
      'Beispiel: Kampagne end-to-end',
      'Fünf Evidenzschichten — eine gemeinsame Story für Leadership'
    );
    const steps = [
      { t: 'ECHON', d: 'Markt & Themen\nerkennen (Waves)' },
      { t: 'AUDION', d: 'Segmente &\nBotschaft testen' },
      { t: 'CHECKION', d: 'Landing messen\n(WCAG, GEO, Speed)' },
      { t: 'BRANDION', d: 'PDF / Broschüre\ngegen Guideline' },
      { t: 'VIDEON', d: 'Hero-Video\nfinden & schneiden' },
    ];
    steps.forEach((st, i) => {
      const x = 0.4 + i * 2.55;
      s.addShape(pptxShapeRect(), {
        x,
        y: 1.35,
        w: 2.4,
        h: 2.15,
        fill: { color: C.cardBg },
        line: { color: C.line },
      });
      s.addShape(pptxShapeRect(), {
        x,
        y: 1.35,
        w: 2.4,
        h: 0.08,
        fill: { color: C.brand },
        line: { color: C.brand },
      });
      s.addText(`${i + 1}`, {
        x: x + 0.12,
        y: 1.55,
        w: 0.4,
        h: 0.3,
        fontSize: 16,
        fontFace: FONT,
        bold: true,
        color: C.brand,
      });
      s.addText(st.t, {
        x: x + 0.12,
        y: 1.95,
        w: 2.15,
        h: 0.3,
        fontSize: 13,
        fontFace: FONT,
        bold: true,
        color: C.ink,
      });
      s.addText(st.d, {
        x: x + 0.12,
        y: 2.35,
        w: 2.15,
        h: 0.9,
        fontSize: 11,
        fontFace: FONT,
        color: C.muted,
      });
      if (i < steps.length - 1) {
        s.addText('→', {
          x: x + 2.3,
          y: 2.15,
          w: 0.3,
          h: 0.35,
          fontSize: 16,
          fontFace: FONT,
          color: C.brand,
          align: 'center',
        });
      }
    });
    s.addText(
      'PLEXON hält das zusammen: Login, Projekt-Sync, Usage und Assistent — damit Teams nicht fünf Insel-Tools bedienen, sondern eine Steuerungslogik nutzen.',
      {
        x: 0.55,
        y: 3.7,
        w: 12.2,
        h: 0.45,
        fontSize: 12,
        fontFace: FONT,
        color: C.muted,
      }
    );
    s.addText('Nutzen in vier Stufen', {
      x: 0.55,
      y: 4.25,
      w: 12,
      h: 0.3,
      fontSize: 13,
      fontFace: FONT,
      bold: true,
      color: C.ink,
    });
    const stages = [
      'Risiko ↓ — weniger Blindflüge in Live, Marke, Messaging und Timing',
      'Tempo ↑ — weniger Handarbeit, Scrubben, Feed-Lärm und parallele Wahrheiten',
      'Alignment — eine Evidenz für Marketing, Design, IT, Compliance und Führung',
      'Skalierung — viele Domains, Marken, Assets und Märkte — steuerbar über PLEXON',
    ];
    s.addText(
      stages.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
      {
        x: 0.55,
        y: 4.6,
        w: 12.2,
        h: 2.0,
        fontSize: 12,
        fontFace: FONT,
        color: C.ink,
        valign: 'top',
      }
    );
    addFooter(s, 12);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const output = await pptx.write({ outputType: 'nodebuffer' });
  const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
  fs.writeFileSync(outFile, buffer);

  return {
    absolutePath: outFile,
    slideCount: TOTAL,
    buffer,
  };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  generatePlexonEcosystemPptx()
    .then((r) => {
      console.log(`Wrote ${r.slideCount} slides → ${r.absolutePath}`);
      console.log(`Size: ${(r.buffer.length / 1024).toFixed(1)} KB`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
