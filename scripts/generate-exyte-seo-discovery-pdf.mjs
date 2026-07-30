/**
 * Exyte SEO/GEO Discovery PDF — bilingual (DE/EN), brief coverage + 20 open questions.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'exyte-discovery');
const OUT_FILE = path.join(OUT_DIR, 'Exyte-SEO-Discovery-Form.pdf');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 44;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FOOTER_Y = 22;

const C = {
  brand: rgb(0, 0.792, 0.333),
  brandDark: rgb(0.05, 0.35, 0.18),
  ink: rgb(0.12, 0.12, 0.14),
  muted: rgb(0.45, 0.45, 0.48),
  line: rgb(0.82, 0.84, 0.86),
  sectionBg: rgb(0.95, 0.97, 0.96),
  full: rgb(0.1, 0.55, 0.28),
  partial: rgb(0.55, 0.45, 0.05),
  oos: rgb(0.4, 0.4, 0.42),
  fieldBorder: rgb(0.72, 0.74, 0.76),
};

/** @type {Array<{ id: string; briefDe: string; briefEn: string; coverDe: string; coverEn: string; tool: string; status: 'full'|'partial'|'oos' }>} */
const BRIEF_COVERAGE = [
  {
    id: 'audit_tech',
    briefDe: 'Technischer SEO-Audit',
    briefEn: 'Technical SEO audit',
    coverDe: 'Domain-Crawl, Priorisierung, Executive Summary',
    coverEn: 'Domain crawl, prioritization, executive summary',
    tool: 'CHECKION',
    status: 'full',
  },
  {
    id: 'audit_page',
    briefDe: 'Page-level SEO (Meta, H1, Schema)',
    briefEn: 'Page-level SEO (meta, H1, schema)',
    coverDe: 'Einzel- & Stichproben-Scans, On-Page-Scores',
    coverEn: 'Single-page & sample scans, on-page scores',
    tool: 'CHECKION',
    status: 'full',
  },
  {
    id: 'pagespeed',
    briefDe: 'Page Speed / Core Web Vitals',
    briefEn: 'Page speed / Core Web Vitals',
    coverDe: 'Lab-Metriken + PageSpeed Insights',
    coverEn: 'Lab metrics + PageSpeed Insights',
    tool: 'CHECKION',
    status: 'full',
  },
  {
    id: 'gsc_ga',
    briefDe: 'GSC, GA4, GTM Fehleranalyse',
    briefEn: 'GSC, GA4, GTM error review',
    coverDe: 'Manuelle Review (kein Tool-Connector)',
    coverEn: 'Manual review (no tool connector)',
    tool: 'Partner',
    status: 'partial',
  },
  {
    id: 'strategy',
    briefDe: 'SEO-Strategie & Roadmap',
    briefEn: 'SEO strategy & roadmap',
    coverDe: 'Workshop, Reifegrad, Massnahmenplan',
    coverEn: 'Workshop, maturity model, action plan',
    tool: 'Partner',
    status: 'full',
  },
  {
    id: 'playbook',
    briefDe: 'SEO-Playbook & Redaktions-Guardrails',
    briefEn: 'SEO playbook & editorial guardrails',
    coverDe: 'Checklisten, Sitecore-Feld-Mapping',
    coverEn: 'Checklists, Sitecore field mapping',
    tool: 'Partner + Sitecore',
    status: 'full',
  },
  {
    id: 'keywords',
    briefDe: 'Keyword Research & Priorisierung',
    briefEn: 'Keyword research & prioritization',
    coverDe: 'AI-Suggest, Rank-Monitoring; kein Ahrefs-Volumen',
    coverEn: 'AI suggest, rank monitoring; no Ahrefs volume',
    tool: 'CHECKION + AUDION',
    status: 'partial',
  },
  {
    id: 'content_seo',
    briefDe: 'Skalierbarer SEO-Content-Ansatz',
    briefEn: 'Scalable SEO content approach',
    coverDe: 'Themen-/Persona-Richtung; keine Produktion',
    coverEn: 'Topic/persona direction; no production',
    tool: 'AUDION + Playbook',
    status: 'partial',
  },
  {
    id: 'reporting',
    briefDe: 'Reporting-Framework intern',
    briefEn: 'Internal reporting framework',
    coverDe: 'Template + Re-Scans; Dashboard optional',
    coverEn: 'Template + re-scans; optional dashboard',
    tool: 'PLEXON + CHECKION',
    status: 'partial',
  },
  {
    id: 'sitecore',
    briefDe: 'Sitecore-native Umsetzung',
    briefEn: 'Sitecore-native delivery',
    coverDe: 'CMS, Workflows, Fixes mit IT',
    coverEn: 'CMS, workflows, fixes with IT',
    tool: 'Sitecore Partner',
    status: 'full',
  },
  {
    id: 'aeo',
    briefDe: 'AI-Sichtbarkeit / GEO / AEO',
    briefEn: 'AI visibility / GEO / AEO',
    coverDe: 'Zitat-Monitoring, AXP-Pilot, Scrunch',
    coverEn: 'Citation monitoring, AXP pilot, Scrunch',
    tool: 'Sitecore Scrunch',
    status: 'full',
  },
  {
    id: 'enablement',
    briefDe: 'Enablement & Handover (RACI)',
    briefEn: 'Enablement & handover (RACI)',
    coverDe: 'Schulung, Betriebsmodell',
    coverEn: 'Training, operating model',
    tool: 'Partner',
    status: 'full',
  },
  {
    id: 'content_prod',
    briefDe: 'Content-Produktion',
    briefEn: 'Content production',
    coverDe: 'Out of scope laut Brief',
    coverEn: 'Out of scope per brief',
    tool: '-',
    status: 'oos',
  },
];

const STATUS = {
  full: { de: 'Voll', en: 'Full' },
  partial: { de: 'Teilw.', en: 'Part.' },
  oos: { de: 'OOS', en: 'OOS' },
};

const STATUS_COLOR = { full: C.full, partial: C.partial, oos: C.oos };

/** @type {Array<{ n: number; de: string; en: string; field: object }>} */
const QUESTIONS = [
  {
    n: 1,
    de: 'Alle relevanten Domains (Exyte, Exentec, Sprachen, Subdomains)',
    en: 'All relevant domains (Exyte, Exentec, languages, subdomains)',
    field: { type: 'text', name: 'q01.domains', h: 24, multi: true },
  },
  {
    n: 2,
    de: 'Geschaetzte indexierte Seiten (beide Sites)',
    en: 'Estimated indexed pages (both sites)',
    field: {
      type: 'check',
      name: 'q02.pages',
      opts: [
        { id: 's', de: '< 500', en: '< 500' },
        { id: 'm', de: '500-2.000', en: '500-2,000' },
        { id: 'l', de: '> 2.000', en: '> 2,000' },
        { id: 'u', de: 'Unbekannt', en: 'Unknown' },
      ],
      cols: 2,
    },
  },
  {
    n: 3,
    de: 'Prioritaere Maerkte / Sprachen fuer Rankings & GEO',
    en: 'Priority markets / languages for rankings & GEO',
    field: { type: 'text', name: 'q03.maerkte', h: 20 },
  },
  {
    n: 4,
    de: 'Exyte vs. Exentec: gemeinsame oder getrennte SEO/GEO-Strategie?',
    en: 'Exyte vs. Exentec: joint or separate SEO/GEO strategy?',
    field: {
      type: 'check',
      name: 'q04.strategie',
      opts: [
        { id: 'gemeinsam', de: 'Gemeinsam', en: 'Joint' },
        { id: 'getrennt', de: 'Getrennt', en: 'Separate' },
        { id: 'unklar', de: 'Unklar', en: 'TBD' },
      ],
    },
  },
  {
    n: 5,
    de: 'Top 3 Business-Ziele fuer SEO (priorisiert)',
    en: 'Top 3 business goals for SEO (prioritized)',
    field: { type: 'text', name: 'q05.ziele', h: 26, multi: true },
  },
  {
    n: 6,
    de: '3-5 Wettbewerber fuer SEO/GEO-Benchmark',
    en: '3-5 competitors for SEO/GEO benchmark',
    field: { type: 'text', name: 'q06.wettbewerb', h: 20 },
  },
  {
    n: 7,
    de: 'Bereits genutzte SEO-Tools',
    en: 'SEO tools already in use',
    field: { type: 'text', name: 'q07.tools', h: 20 },
  },
  {
    n: 8,
    de: 'Bestehendes Keyword-Set / Rank-Tracking?',
    en: 'Existing keyword set / rank tracking?',
    field: {
      type: 'check',
      name: 'q08.keywords',
      opts: [
        { id: 'ja', de: 'Ja, aktuell', en: 'Yes, current' },
        { id: 'veraltet', de: 'Veraltet', en: 'Outdated' },
        { id: 'nein', de: 'Nein', en: 'No' },
      ],
    },
  },
  {
    n: 9,
    de: 'Bekannte kritische SEO-Probleme',
    en: 'Known critical SEO issues',
    field: { type: 'text', name: 'q09.issues', h: 22, multi: true },
  },
  {
    n: 10,
    de: 'Gewichtung: klassisches SEO vs. GEO/AEO',
    en: 'Weighting: classic SEO vs. GEO/AEO',
    field: {
      type: 'check',
      name: 'q10.gewicht',
      opts: [
        { id: 'seo', de: 'Primaer SEO', en: 'Mainly SEO' },
        { id: 'balance', de: 'Ausgewogen', en: 'Balanced' },
        { id: 'geo', de: 'Primaer GEO', en: 'Mainly GEO' },
      ],
    },
  },
  {
    n: 11,
    de: 'GEO: priorisierte Themen / Prompts fuer Monitoring',
    en: 'GEO: priority topics / prompts for monitoring',
    field: { type: 'text', name: 'q11.geo_prompts', h: 22, multi: true },
  },
  {
    n: 12,
    de: 'Sitecore Scrunch / AXP-Pilot im Scope?',
    en: 'Sitecore Scrunch / AXP pilot in scope?',
    field: {
      type: 'check',
      name: 'q12.scrunch',
      opts: [
        { id: 'ja', de: 'Ja, Pilot', en: 'Yes, pilot' },
        { id: 'spaeter', de: 'Spaeter', en: 'Later' },
        { id: 'nein', de: 'Nein', en: 'No' },
        { id: 'offen', de: 'Offen', en: 'TBD' },
      ],
      cols: 2,
    },
  },
  {
    n: 13,
    de: 'Relevante KI-Suchkanaele (Mehrfachauswahl)',
    en: 'Relevant AI search channels (multi-select)',
    field: {
      type: 'check',
      name: 'q13.kanaele',
      opts: [
        { id: 'chatgpt', de: 'ChatGPT', en: 'ChatGPT' },
        { id: 'gemini', de: 'Gemini', en: 'Gemini' },
        { id: 'perplexity', de: 'Perplexity', en: 'Perplexity' },
        { id: 'sonstige', de: 'Sonstige', en: 'Other' },
      ],
      cols: 2,
    },
  },
  {
    n: 14,
    de: 'GEO-relevante Content-Bereiche (AI-Zitationen)',
    en: 'GEO-relevant content areas (AI citations)',
    field: { type: 'text', name: 'q14.geo_content', h: 20, multi: true },
  },
  {
    n: 15,
    de: 'Reporting-Cadence nach Projektstart',
    en: 'Reporting cadence after project start',
    field: {
      type: 'check',
      name: 'q15.cadence',
      opts: [
        { id: 'monat', de: 'Monatlich', en: 'Monthly' },
        { id: 'quartal', de: 'Quartalsweise', en: 'Quarterly' },
        { id: 'ad_hoc', de: 'Ad hoc', en: 'Ad hoc' },
      ],
    },
  },
  {
    n: 16,
    de: 'Retainer / Re-Audits nach Enablement?',
    en: 'Retainer / re-audits after enablement?',
    field: {
      type: 'check',
      name: 'q16.retainer',
      opts: [
        { id: 'ja', de: 'Ja', en: 'Yes' },
        { id: 'nein', de: 'Nein', en: 'No' },
        { id: 'offen', de: 'Offen', en: 'TBD' },
      ],
    },
  },
  {
    n: 17,
    de: 'Projektstart & Deadline Audit / Roadmap',
    en: 'Project start & deadline for audit / roadmap',
    field: { type: 'text', name: 'q17.zeit', h: 20 },
  },
  {
    n: 18,
    de: 'Budget-Rahmen (optional)',
    en: 'Budget range (optional)',
    field: { type: 'text', name: 'q18.budget', h: 18 },
  },
  {
    n: 19,
    de: 'Bevorzugtes Angebots-Paket',
    en: 'Preferred proposal package',
    field: {
      type: 'check',
      name: 'q19.paket',
      opts: [
        { id: 'ess', de: 'Essential', en: 'Essential' },
        { id: 'pro', de: 'Professional', en: 'Professional' },
        { id: 'ent', de: 'Enterprise', en: 'Enterprise' },
        { id: 'offen', de: 'Offen', en: 'TBD' },
      ],
      cols: 2,
    },
  },
  {
    n: 20,
    de: 'Weitere SEO/GEO-Punkte fuer das Angebot',
    en: 'Additional SEO/GEO points for the proposal',
    field: { type: 'text', name: 'q20.sonst', h: 24, multi: true },
  },
];

class Builder {
  doc;
  form;
  page;
  font;
  fontBold;
  y = 0;
  pageNum = 0;

  async init() {
    this.doc = await PDFDocument.create();
    this.doc.setTitle('Exyte SEO/GEO Discovery DE-EN');
    this.form = this.doc.getForm();
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.fontBold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pageNum = 1;
    this.y = PAGE_H - MARGIN;
  }

  footer() {
    this.page.drawLine({
      start: { x: MARGIN, y: FOOTER_Y + 10 },
      end: { x: PAGE_W - MARGIN, y: FOOTER_Y + 10 },
      thickness: 0.4,
      color: C.line,
    });
    this.page.drawText('Exyte SEO/GEO Discovery | DE + EN', {
      x: MARGIN,
      y: FOOTER_Y,
      size: 6.5,
      font: this.font,
      color: C.muted,
    });
    this.page.drawText(`p. ${this.pageNum}`, {
      x: PAGE_W - MARGIN - 20,
      y: FOOTER_Y,
      size: 6.5,
      font: this.font,
      color: C.muted,
    });
  }

  newPage() {
    this.footer();
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pageNum += 1;
    this.y = PAGE_H - MARGIN;
  }

  ensure(need) {
    if (this.y - need < MARGIN + 26) this.newPage();
  }

  section(de, en) {
    this.ensure(24);
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - 18,
      width: CONTENT_W,
      height: 20,
      color: C.sectionBg,
      borderColor: C.brand,
      borderWidth: 0.5,
    });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 18, width: 3, height: 20, color: C.brand });
    this.page.drawText(de, { x: MARGIN + 8, y: this.y - 11, size: 9, font: this.fontBold, color: C.brandDark });
    this.page.drawText(en, { x: MARGIN + 280, y: this.y - 11, size: 8, font: this.font, color: C.muted });
    this.y -= 26;
  }

  header() {
    this.page.drawRectangle({ x: 0, y: PAGE_H - 78, width: PAGE_W, height: 78, color: C.brandDark });
    this.page.drawText('Exyte SEO / GEO Discovery', {
      x: MARGIN,
      y: PAGE_H - 34,
      size: 16,
      font: this.fontBold,
      color: rgb(1, 1, 1),
    });
    this.page.drawText('Brief-Abdeckung & 20 offene Fragen', {
      x: MARGIN,
      y: PAGE_H - 50,
      size: 9,
      font: this.font,
      color: rgb(0.85, 0.94, 0.88),
    });
    this.page.drawText('Brief coverage & 20 open questions', {
      x: MARGIN,
      y: PAGE_H - 62,
      size: 8,
      font: this.font,
      color: rgb(0.75, 0.88, 0.8),
    });
    this.y = PAGE_H - 92;

    const hy = this.y - 8;
    this.page.drawText('Kontakt / Contact', { x: MARGIN, y: hy, size: 7, font: this.fontBold, color: C.muted });
    this.page.drawText('Datum / Date', { x: MARGIN + 298, y: hy, size: 7, font: this.fontBold, color: C.muted });
    const fy = hy - 20;
    this.form.createTextField('meta.kontakt').addToPage(this.page, {
      x: MARGIN,
      y: fy,
      width: 284,
      height: 16,
      borderColor: C.fieldBorder,
      borderWidth: 0.5,
    });
    this.form.createTextField('meta.datum').addToPage(this.page, {
      x: MARGIN + 298,
      y: fy,
      width: CONTENT_W - 298,
      height: 16,
      borderColor: C.fieldBorder,
      borderWidth: 0.5,
    });
    this.y = fy - 10;
  }

  coverageMatrix() {
    this.section('A. Brief-Abdeckung (MSQDX / Sitecore)', 'A. Brief coverage (MSQDX / Sitecore)');
    this.ensure(12);
    this.page.drawText('Legende: Voll/Full | Teilw./Part. | OOS = out of scope', {
      x: MARGIN,
      y: this.y - 7,
      size: 6.5,
      font: this.font,
      color: C.muted,
    });
    this.y -= 12;

    const rowH = 30;
    const colOk = PAGE_W - MARGIN - 52;

    for (const row of BRIEF_COVERAGE) {
      this.ensure(rowH + 2);
      const top = this.y;
      this.page.drawLine({
        start: { x: MARGIN, y: top - rowH },
        end: { x: PAGE_W - MARGIN, y: top - rowH },
        thickness: 0.25,
        color: C.line,
      });

      const ty = top - 9;
      this.page.drawText(row.briefDe, { x: MARGIN, y: ty, size: 7, font: this.fontBold, color: C.ink });
      this.page.drawText(row.briefEn, { x: MARGIN, y: ty - 9, size: 6.5, font: this.font, color: C.muted });
      this.page.drawText(row.coverDe, { x: MARGIN + 168, y: ty, size: 6.2, font: this.font, color: C.ink });
      this.page.drawText(row.coverEn, { x: MARGIN + 168, y: ty - 9, size: 6, font: this.font, color: C.muted });

      this.page.drawText(row.tool, {
        x: MARGIN + 358,
        y: ty - 2,
        size: 6.5,
        font: this.fontBold,
        color: C.brandDark,
      });

      const st = STATUS[row.status];
      const badge = `${st.de}/${st.en}`;
      this.page.drawRectangle({
        x: MARGIN + 418,
        y: ty - 12,
        width: 42,
        height: 10,
        color: STATUS_COLOR[row.status],
      });
      this.page.drawText(badge, {
        x: MARGIN + 421,
        y: ty - 9,
        size: 5.5,
        font: this.fontBold,
        color: rgb(1, 1, 1),
      });

      const cb = this.form.createCheckBox(`cover.${row.id}.ok`);
      cb.addToPage(this.page, {
        x: colOk,
        y: ty - 11,
        width: 9,
        height: 9,
        borderWidth: 0.5,
        borderColor: C.fieldBorder,
      });
      this.page.drawText('OK', { x: colOk + 12, y: ty - 9, size: 6, font: this.font, color: C.muted });

      this.y -= rowH;
    }

    this.labelPair('Abweichungen / Ergaenzungen', 'Deviations / additions');
    this.textField('cover.notes', 28, true);
  }

  labelPair(de, en) {
    this.ensure(14);
    this.page.drawText(de, { x: MARGIN, y: this.y - 8, size: 7.5, font: this.fontBold, color: C.ink });
    this.page.drawText(en, { x: MARGIN + 240, y: this.y - 8, size: 7, font: this.font, color: C.muted });
    this.y -= 12;
  }

  textField(name, h, multi = false) {
    this.ensure(h + 6);
    const f = this.form.createTextField(name);
    if (multi) f.enableMultiline();
    f.addToPage(this.page, {
      x: MARGIN,
      y: this.y - h,
      width: CONTENT_W,
      height: h,
      borderColor: C.fieldBorder,
      borderWidth: 0.5,
    });
    try {
      f.setFontSize(8);
    } catch {
      /* noop */
    }
    this.y -= h + 8;
  }

  questionsSection() {
    this.newPage();
    this.section('B. Offene Fragen (nicht im Brief)', 'B. Open questions (not in brief)');
    this.page.drawText('Nicht im Brief: Audit-Anforderung, Playbook, Sitecore, Enablement, GSC/GA, Outcomes.', {
      x: MARGIN,
      y: this.y - 7,
      size: 6.5,
      font: this.font,
      color: C.muted,
    });
    this.page.drawText('Not in brief: audit scope, playbook, Sitecore, enablement, GSC/GA, outcomes.', {
      x: MARGIN,
      y: this.y - 16,
      size: 6.5,
      font: this.font,
      color: C.muted,
    });
    this.y -= 22;

    for (const item of QUESTIONS) this.question(item);
  }

  /** @param {{ n: number; de: string; en: string; field: object }} item */
  question(item) {
    const f = item.field;
    let need = 42;
    if (f.type === 'text') need = 28 + (f.h || 20);
    if (f.type === 'check') {
      const cols = f.cols || 1;
      need = 32 + Math.ceil(f.opts.length / cols) * 14;
    }
    this.ensure(need);

    const num = String(item.n).padStart(2, '0');
    this.page.drawText(`${num}.`, {
      x: MARGIN,
      y: this.y - 8,
      size: 8,
      font: this.fontBold,
      color: C.brand,
    });
    this.page.drawText(item.de, {
      x: MARGIN + 18,
      y: this.y - 8,
      size: 8,
      font: this.fontBold,
      color: C.ink,
    });
    this.page.drawText(item.en, {
      x: MARGIN + 18,
      y: this.y - 17,
      size: 7,
      font: this.font,
      color: C.muted,
    });
    this.y -= 22;

    if (f.type === 'text') {
      const field = this.form.createTextField(f.name);
      if (f.multi) field.enableMultiline();
      field.addToPage(this.page, {
        x: MARGIN + 18,
        y: this.y - f.h,
        width: CONTENT_W - 18,
        height: f.h,
        borderColor: C.fieldBorder,
        borderWidth: 0.5,
      });
      try {
        field.setFontSize(8);
      } catch {
        /* noop */
      }
      this.y -= f.h + 8;
      return;
    }

    const cols = f.cols || 1;
    const colW = (CONTENT_W - 18) / cols;
    const rowH = 14;
    f.opts.forEach((opt, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = MARGIN + 18 + col * colW;
      const yb = this.y - row * rowH - 11;
      const cb = this.form.createCheckBox(`${f.name}.${opt.id}`);
      cb.addToPage(this.page, { x, y: yb, width: 9, height: 9, borderWidth: 0.5, borderColor: C.fieldBorder });
      const lbl = opt.de === opt.en ? opt.de : `${opt.de} / ${opt.en}`;
      this.page.drawText(lbl, { x: x + 13, y: yb + 1, size: 6.8, font: this.font, color: C.ink });
    });
    this.y -= Math.ceil(f.opts.length / cols) * rowH + 6;
  }

  async save() {
    this.footer();
    this.form.updateFieldAppearances(this.font);
    const bytes = await this.doc.save();
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, bytes);
    return OUT_FILE;
  }
}

async function main() {
  if (QUESTIONS.length !== 20) throw new Error(`Expected 20 questions, got ${QUESTIONS.length}`);
  const b = new Builder();
  await b.init();
  b.header();
  b.coverageMatrix();
  b.questionsSection();
  const out = await b.save();
  console.log(`Written: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
