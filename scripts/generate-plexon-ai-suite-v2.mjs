import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importRuntimeModule } from "/Users/christoph.bordeck/.codex/plugins/cache/openai-primary-runtime/presentations/26.819.11345/skills/presentations/container_tools/runtime_helpers.mjs";

const { Presentation, PresentationFile } = await importRuntimeModule("@oai/artifact-tool");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "assets/presentations/plexon-ai-suite-kundenpraesentation-v2.pptx");
const previewDir = "/private/tmp/plexon-v2-preview";
const checkionScreenshot = path.join(root, "knowledge/tutorials/assets/checkion-article/01-project-workspace.png");
const logoBlackPath = "/Users/christoph.bordeck/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/msqdx-pptx-design/references/logo_black.b64";
const logoWhitePath = "/Users/christoph.bordeck/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/msqdx-pptx-design/references/logo_white.b64";

const W = 1280;
const H = 720;
const C = {
  black: "#000000",
  white: "#FFFFFF",
  ink: "#111111",
  grey: "#6B6B6B",
  light: "#F2F2F2",
  line: "#D8D8D8",
  pink: "#F256B6",
  pinkSoft: "#FAD0EB",
  yellow: "#FEF14D",
  yellowSoft: "#FFF9B7",
  green: "#00CA55",
  greenSoft: "#BFF2D2",
  orange: "#FF6A3B",
  orangeSoft: "#FFD0C2",
};
const F = { head: "Noto Sans JP", body: "Noto Sans JP Light", mono: "IBM Plex Mono" };

const presentation = Presentation.create({ slideSize: { width: W, height: H } });
presentation.title = "PLEXON AI Suite – Kundenpräsentation V2";
presentation.subject = "MSQ DX Ecosystem, Apps, Integrationen und Kundennutzen";
presentation.author = "MSQ DX";

function addBox(slide, x, y, w, h, fill, opts = {}) {
  return slide.shapes.add({
    geometry: opts.geometry || "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: opts.line || fill, width: opts.lineWidth ?? 0 },
    ...(opts.radius ? { borderRadius: opts.radius } : {}),
  });
}

function addText(slide, value, x, y, w, h, opts = {}) {
  const t = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  t.text = value;
  t.text.style = {
    fontSize: opts.size ?? 24,
    typeface: opts.font ?? F.body,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: opts.autoFit ?? "shrinkText",
  };
  return t;
}

function addPill(slide, label, x, y, w, fill = C.light, color = C.ink) {
  addBox(slide, x, y, w, 30, fill, { geometry: "roundRect", radius: "rounded-xl" });
  addText(slide, label, x + 8, y + 5, w - 16, 18, { size: 12, font: F.mono, bold: true, color, align: "center" });
}

function addConnector(slide, x1, y1, x2, y2, color = C.ink, thickness = 2) {
  if (Math.abs(y2 - y1) < 3) addBox(slide, Math.min(x1, x2), y1, Math.abs(x2 - x1), thickness, color);
  else if (Math.abs(x2 - x1) < 3) addBox(slide, x1, Math.min(y1, y2), thickness, Math.abs(y2 - y1), color);
}

async function b64Blob(file) {
  const raw = (await fs.readFile(file, "utf8")).trim();
  const buf = Buffer.from(raw, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function imageBlob(file) {
  const buf = await fs.readFile(file);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const logoBlack = await b64Blob(logoBlackPath);
const logoWhite = await b64Blob(logoWhitePath);
const checkionBlob = await imageBlob(checkionScreenshot);

function addLogo(slide, light = false) {
  slide.images.add({
    blob: light ? logoWhite : logoBlack,
    contentType: "image/png",
    alt: "MSQ DX",
    fit: "contain",
    position: { left: 1164, top: 28, width: 72, height: 28 },
  });
}

function addChrome(slide, eyebrow, page, light = false) {
  addLogo(slide, light);
  addText(slide, eyebrow.toUpperCase(), 48, 28, 620, 20, { size: 11, font: F.mono, bold: true, color: C.pink });
  addText(slide, String(page).padStart(2, "0"), 1190, 674, 46, 18, { size: 10, font: F.mono, color: light ? C.white : C.grey, align: "right" });
}

function addSources(slide, urls = []) {
  if (!urls.length) return;
  slide.speakerNotes.textFrame.setText(`[Sources]\n${urls.map((u) => `- ${u}`).join("\n")}\n[/Sources]`);
  slide.speakerNotes.setVisible(false);
}

function addToolStrip(slide, label, tools, y, accent) {
  addText(slide, label.toUpperCase(), 48, y, 230, 18, { size: 10, font: F.mono, bold: true, color: C.grey });
  let x = 284;
  for (const tool of tools) {
    const width = Math.max(92, Math.min(165, 22 + tool.length * 7.1));
    addPill(slide, tool, x, y - 6, width, accent, C.ink);
    x += width + 10;
  }
  addText(slide, "Beispiele möglicher Anbindungen · abhängig von API, Lizenz und Berechtigung", 850, y + 2, 386, 18, { size: 10, color: C.grey, align: "right" });
}

function addMetricTile(slide, n, label, x, y, w, fill) {
  addBox(slide, x, y, w, 84, fill);
  addText(slide, n, x + 14, y + 12, 58, 38, { size: 28, bold: true });
  addText(slide, label, x + 78, y + 18, w - 92, 46, { size: 15, bold: true, valign: "middle" });
}

function addProductHeader(slide, app, statement, page) {
  addChrome(slide, `${app} · PLEXON ECOSYSTEM`, page);
  addText(slide, statement, 48, 74, 900, 82, { size: 35, font: F.head, bold: true });
}

// 1 — Cover
{
  const s = presentation.slides.add();
  s.background.fill = C.pink;
  s.images.add({ blob: logoBlack, contentType: "image/png", alt: "MSQ DX", fit: "contain", position: { left: 48, top: 38, width: 78, height: 30 } });
  addText(s, "PLEXON", 48, 142, 520, 78, { size: 62, font: F.head, bold: true });
  addText(s, "Ihre Systeme.\nEin gemeinsamer\nKontext.", 48, 218, 480, 176, { size: 40, font: F.head, bold: true });
  addText(s, "Die offene AI Suite von MSQ DX für Research, Kreation, Qualität und Governance.", 48, 412, 560, 58, { size: 18, bold: true });

  addBox(s, 735, 114, 220, 220, C.black, { geometry: "ellipse" });
  addText(s, "PLEXON", 775, 190, 140, 38, { size: 26, font: F.head, bold: true, color: C.white, align: "center" });
  addText(s, "KONTEXT · FLOWS", 775, 230, 140, 20, { size: 10, font: F.mono, color: C.pink, align: "center" });
  const coverApps = [
    ["ECHON", 670, 66, C.greenSoft], ["AUDION", 986, 134, C.pinkSoft], ["CHECKION", 962, 350, C.greenSoft],
    ["BRANDION", 670, 382, C.orangeSoft], ["CREATION", 520, 278, C.yellowSoft],
  ];
  for (const [name, x, y, fill] of coverApps) {
    addBox(s, x, y, 132, 62, fill);
    addText(s, name, x + 12, y + 18, 108, 24, { size: 16, font: F.head, bold: true, align: "center" });
  }
  addConnector(s, 790, 114, 760, 128, C.black, 3);
  addConnector(s, 955, 220, 986, 165, C.black, 3);
  addConnector(s, 920, 320, 962, 380, C.black, 3);
  addConnector(s, 735, 300, 742, 382, C.black, 3);
  addConnector(s, 735, 268, 652, 310, C.black, 3);
  addText(s, "MSQ DX · 2026", 48, 672, 210, 18, { size: 10, font: F.mono });
}

// 2 — Core promise
{
  const s = presentation.slides.add();
  s.background.fill = C.black;
  addChrome(s, "DAS VERSPRECHEN", 2, true);
  addText(s, "PLEXON ersetzt Ihren Stack nicht.", 48, 90, 870, 60, { size: 38, font: F.head, bold: true, color: C.white });
  addText(s, "Es macht ihn gemeinsam nutzbar.", 48, 150, 870, 60, { size: 38, font: F.head, bold: true, color: C.pink });

  const left = [["Research", "Qualtrics"], ["Design", "Figma"], ["CMS", "Contentful"], ["Analytics", "Search Console"]];
  left.forEach(([cat, tool], i) => {
    const y = 270 + i * 76;
    addText(s, cat.toUpperCase(), 48, y + 6, 112, 18, { size: 10, font: F.mono, bold: true, color: C.grey });
    addBox(s, 160, y, 178, 44, C.white);
    addText(s, tool, 174, y + 11, 150, 22, { size: 15, bold: true });
    addBox(s, 338, y + 20, 110, 3, C.pink);
  });
  addBox(s, 450, 248, 290, 336, C.pink);
  addText(s, "PLEXON", 490, 298, 210, 42, { size: 32, font: F.head, bold: true, align: "center" });
  addText(s, "gemeinsamer Kontext", 490, 348, 210, 28, { size: 15, bold: true, align: "center" });
  ["Daten", "Entscheidungen", "Rollen", "Nachweise"].forEach((v, i) => addPill(s, v, 510, 405 + i * 40, 170, C.black, C.white));
  ["Insights", "Prototypen", "Prüfungen", "Freigaben"].forEach((v, i) => {
    const y = 270 + i * 76;
    addBox(s, 740, y + 20, 108, 3, C.pink);
    addBox(s, 848, y, 205, 44, C.white);
    addText(s, v, 862, y + 11, 177, 22, { size: 15, bold: true });
  });
  addText(s, "Bestehende Systeme bleiben relevant. PLEXON verbindet Daten, Spezialfähigkeiten und Entscheidungen.", 48, 630, 1005, 30, { size: 15, bold: true, color: C.white });
}

// 3 — Ecosystem map
{
  const s = presentation.slides.add();
  s.background.fill = C.white;
  addChrome(s, "ÖKOSYSTEM", 3);
  addText(s, "Fünf Spezialisten. Viele Andockpunkte. Ein Arbeitskreislauf.", 48, 76, 1080, 64, { size: 34, font: F.head, bold: true });
  addBox(s, 505, 244, 270, 150, C.black);
  addText(s, "PLEXON", 555, 274, 170, 35, { size: 27, font: F.head, bold: true, color: C.white, align: "center" });
  addText(s, "COLLECTION · KONTEXT · FLOWS", 530, 322, 220, 20, { size: 10, font: F.mono, color: C.pink, align: "center" });
  const apps = [
    { n: "ECHON", x: 165, y: 170, fill: C.greenSoft, ext: "Brandwatch · Meltwater" },
    { n: "AUDION", x: 165, y: 402, fill: C.pinkSoft, ext: "Qualtrics · SurveyMonkey" },
    { n: "CHECKION", x: 875, y: 170, fill: C.greenSoft, ext: "Search Console · PageSpeed" },
    { n: "BRANDION", x: 875, y: 402, fill: C.orangeSoft, ext: "Figma · Frontify · Bynder" },
    { n: "CREATION", x: 505, y: 500, fill: C.yellowSoft, ext: "Contentful · Storyblok · AEM" },
  ];
  for (const a of apps) {
    addBox(s, a.x, a.y, 240, 86, a.fill);
    addText(s, a.n, a.x + 16, a.y + 14, 208, 26, { size: 19, font: F.head, bold: true });
    addText(s, a.ext, a.x + 16, a.y + 50, 208, 20, { size: 10, font: F.mono, color: C.grey });
  }
  addConnector(s, 405, 210, 505, 286, C.black, 2);
  addConnector(s, 405, 444, 505, 350, C.black, 2);
  addConnector(s, 775, 286, 875, 210, C.black, 2);
  addConnector(s, 775, 350, 875, 444, C.black, 2);
  addConnector(s, 640, 394, 640, 500, C.black, 2);
  addText(s, "Toolnamen zeigen mögliche Integrationsziele – keine pauschale Zusage einer bereits produktiven Standardintegration.", 48, 654, 1050, 20, { size: 11, color: C.grey });
}

// 4 — PLEXON control plane
{
  const s = presentation.slides.add();
  s.background.fill = C.white;
  addChrome(s, "PLEXON · CONTROL PLANE", 4);
  addText(s, "Der Kontext bleibt zusammen. Die Apps bleiben spezialisiert.", 48, 74, 1010, 64, { size: 34, font: F.head, bold: true });
  addBox(s, 48, 176, 775, 420, C.black);
  addText(s, "COLLECTION", 82, 206, 250, 24, { size: 11, font: F.mono, bold: true, color: C.pink });
  addText(s, "Ein gemeinsamer Arbeitsraum", 82, 246, 540, 44, { size: 30, font: F.head, bold: true, color: C.white });
  const lanes = [
    ["01", "KONTEXT", "Quellen, Briefings, Ergebnisse", C.pinkSoft],
    ["02", "FLOWS", "Übergaben und spezialisierte Agents", C.yellowSoft],
    ["03", "GOVERNANCE", "Rollen, Prüfungen, Nachweise", C.greenSoft],
  ];
  lanes.forEach(([n, h, d, fill], i) => {
    const y = 330 + i * 78;
    addBox(s, 82, y, 680, 58, fill);
    addText(s, n, 96, y + 15, 44, 24, { size: 13, font: F.mono, bold: true });
    addText(s, h, 154, y + 12, 172, 24, { size: 16, font: F.head, bold: true });
    addText(s, d, 338, y + 14, 405, 24, { size: 14 });
  });
  addText(s, "ANDOCKPUNKTE", 870, 184, 250, 20, { size: 11, font: F.mono, bold: true, color: C.pink });
  ["SharePoint", "Google Drive", "Teams / Slack", "APIs & MCP"].forEach((v, i) => {
    addBox(s, 870, 225 + i * 72, 320, 54, i === 3 ? C.pink : C.light);
    addText(s, v, 892, 240 + i * 72, 276, 24, { size: 17, bold: true });
  });
  addText(s, "PLEXON hält den Prozess steuerbar – nicht die fachliche Tiefe jeder App.", 870, 535, 320, 60, { size: 17, bold: true });
}

// 5 — ECHON
{
  const s = presentation.slides.add();
  s.background.fill = C.black;
  addChrome(s, "ECHON · MARKET INTELLIGENCE", 5, true);
  addText(s, "Marktdynamik wird zum Briefing.", 48, 74, 820, 60, { size: 38, font: F.head, bold: true, color: C.white });
  addText(s, "Signale erkennen, strukturieren und in konkrete Fragen übersetzen.", 48, 142, 760, 34, { size: 18, bold: true, color: C.green });
  addBox(s, 48, 222, 735, 330, C.greenSoft);
  const bars = [120, 188, 94, 245, 156, 278, 202, 300, 234, 330, 260];
  bars.forEach((v, i) => addBox(s, 84 + i * 58, 514 - v * 0.68, 26, v * 0.68, i > 7 ? C.pink : C.black));
  addBox(s, 84, 514, 650, 2, C.black);
  addText(s, "SIGNALDYNAMIK", 84, 244, 200, 18, { size: 10, font: F.mono, bold: true });
  addText(s, "Was verändert sich – und warum ist es relevant?", 84, 274, 560, 50, { size: 25, font: F.head, bold: true });
  ["TRACK", "STRUCTURE", "EXPLAIN"].forEach((v, i) => addPill(s, v, 84 + i * 150, 454, 132, i === 2 ? C.pink : C.white));
  addBox(s, 828, 222, 360, 330, C.white);
  addText(s, "OUTPUT", 856, 248, 100, 18, { size: 10, font: F.mono, bold: true, color: C.pink });
  ["Trend-Wave", "Source Trail", "Research Question"].forEach((v, i) => {
    addText(s, `0${i + 1}`, 856, 295 + i * 74, 44, 28, { size: 15, font: F.mono, bold: true, color: C.pink });
    addText(s, v, 910, 292 + i * 74, 230, 34, { size: 18, bold: true });
  });
  addToolStrip(s, "Mögliche Datenquellen", ["Brandwatch", "Meltwater", "Similarweb", "RSS / News"], 622, C.greenSoft);
  addSources(s, ["https://developers.brandwatch.com/", "https://developer.meltwater.com/docs/", "https://developers.similarweb.com/docs/similarweb-web-traffic-api"]);
}

// 6 — AUDION
{
  const s = presentation.slides.add();
  s.background.fill = C.white;
  addProductHeader(s, "AUDION", "Aus Zielgruppenwissen wird ein Sparringspartner.", 6);
  addText(s, "Research bleibt Quelle. AUDION macht ihn anwendbar, vergleichbar und testbar.", 48, 148, 860, 30, { size: 17, bold: true, color: C.pink });
  const personas = [
    ["A", "EFFIZIENZ", "Will Klarheit, Tempo und belastbare Belege.", C.pinkSoft],
    ["B", "SICHERHEIT", "Braucht Orientierung, Vergleich und Nachvollziehbarkeit.", C.yellowSoft],
    ["C", "FORTSCHRITT", "Reagiert auf Relevanz, Nutzen und sichtbare Wirkung.", C.greenSoft],
  ];
  personas.forEach(([letter, h, d, fill], i) => {
    const x = 48 + i * 260;
    addBox(s, x, 224, 232, 250, fill);
    addBox(s, x + 18, 244, 62, 62, C.black, { geometry: "ellipse" });
    addText(s, letter, x + 32, 257, 34, 30, { size: 22, bold: true, color: C.white, align: "center" });
    addText(s, h, x + 18, 332, 196, 24, { size: 16, font: F.head, bold: true });
    addText(s, d, x + 18, 372, 196, 70, { size: 14, bold: true });
  });
  addBox(s, 870, 224, 318, 250, C.black);
  addText(s, "VALIDIERUNG", 896, 248, 160, 18, { size: 10, font: F.mono, bold: true, color: C.pink });
  addText(s, "Passt die Idee zur Zielgruppe?", 896, 282, 250, 62, { size: 25, font: F.head, bold: true, color: C.white });
  [["Quellenbezug", 86], ["Segment-Fit", 74], ["Hypothesen", 91]].forEach(([label, v], i) => {
    const y = 366 + i * 43;
    addText(s, label, 896, y, 116, 18, { size: 11, color: C.white });
    addBox(s, 1018, y + 4, 130, 10, C.grey);
    addBox(s, 1018, y + 4, 130 * v / 100, 10, C.pink);
  });
  addMetricTile(s, "01", "Quellen sichtbar", 48, 504, 232, C.light);
  addMetricTile(s, "02", "Interpretation getrennt", 296, 504, 232, C.light);
  addMetricTile(s, "03", "Hypothesen testbar", 544, 504, 232, C.light);
  addToolStrip(s, "Mögliche Research-Quellen", ["Qualtrics", "Typeform", "SurveyMonkey", "XLSX / CSV"], 630, C.pinkSoft);
  addSources(s, ["https://api.qualtrics.com/", "https://www.typeform.com/developers/", "https://developer.surveymonkey.com/api/v3/"]);
}

// 7 — CHECKION
{
  const s = presentation.slides.add();
  s.background.fill = C.black;
  addChrome(s, "CHECKION · DIGITAL QUALITY", 7, true);
  addText(s, "Qualität wird messbar – vor und nach dem Launch.", 48, 74, 990, 60, { size: 36, font: F.head, bold: true, color: C.white });
  addText(s, "Technik, Accessibility, SEO und GEO in einer priorisierbaren Sicht.", 48, 140, 800, 30, { size: 17, bold: true, color: C.green });
  addBox(s, 48, 204, 785, 378, C.white);
  s.images.add({
    blob: checkionBlob,
    contentType: "image/png",
    alt: "CHECKION project workspace",
    fit: "cover",
    position: { left: 58, top: 214, width: 765, height: 358 },
  });
  addBox(s, 866, 204, 322, 378, C.greenSoft);
  ["WCAG", "SEO", "GEO", "PERFORMANCE"].forEach((v, i) => addPill(s, v, 894, 232 + i * 54, 156, i === 2 ? C.pink : C.white));
  addText(s, "Ein Befund.\nEine Priorität.\nEin überprüfbarer Fix.", 894, 468, 252, 88, { size: 21, font: F.head, bold: true });
  addToolStrip(s, "Mögliche Messquellen", ["Search Console", "PageSpeed", "Siteimprove", "Crawler-Exports"], 630, C.greenSoft);
  addSources(s, ["https://developers.google.com/webmaster-tools/v1/api_reference_index", "https://developers.google.com/speed/docs/insights/v5/get-started", "https://developer.siteimprove.com/"]);
}

// 8 — BRANDION
{
  const s = presentation.slides.add();
  s.background.fill = C.white;
  addProductHeader(s, "BRANDION", "Marke wird zur prüfbaren Regel.", 8);
  addText(s, "Guidelines, Tokens und Referenzmaterial werden maschinenlesbar – Prüfung bleibt nachvollziehbar.", 48, 148, 920, 30, { size: 17, bold: true, color: C.orange });
  addBox(s, 48, 218, 550, 342, C.orangeSoft);
  addText(s, "ASSET CHECK", 78, 244, 150, 18, { size: 10, font: F.mono, bold: true });
  addBox(s, 78, 284, 300, 212, C.white);
  addBox(s, 104, 312, 248, 56, C.pink);
  addText(s, "MAKE IT MATTER.", 120, 324, 216, 26, { size: 18, font: F.head, bold: true, align: "center" });
  addBox(s, 104, 388, 118, 82, C.black);
  addBox(s, 234, 388, 118, 82, C.yellow);
  addBox(s, 410, 284, 156, 58, C.green);
  addText(s, "PASS", 432, 299, 112, 26, { size: 18, font: F.mono, bold: true, color: C.white, align: "center" });
  addText(s, "Logo\nFarbe\nTypo\nKontrast", 410, 374, 140, 116, { size: 18, font: F.head, bold: true });

  addBox(s, 632, 218, 556, 342, C.black);
  addText(s, "RULE ENGINE", 662, 244, 150, 18, { size: 10, font: F.mono, bold: true, color: C.pink });
  const rules = [["Logo clear space", "OK", C.green], ["Primary palette", "OK", C.green], ["Headline type", "REVIEW", C.yellow], ["CTA contrast", "FAIL", C.orange]];
  rules.forEach(([label, status, fill], i) => {
    const y = 286 + i * 55;
    addText(s, label, 662, y + 10, 260, 22, { size: 16, bold: true, color: C.white });
    addPill(s, status, 990, y + 5, 158, fill, C.ink);
  });
  addToolStrip(s, "Mögliche Brand-Quellen", ["Figma", "Frontify", "Bynder", "DAM / PIM"], 630, C.orangeSoft);
  addSources(s, ["https://developers.figma.com/docs/rest-api/", "https://developer.frontify.com/", "https://developers.bynder.com/"]);
}

// 9 — CREATION corrected positioning
{
  const s = presentation.slides.add();
  s.background.fill = C.yellow;
  addChrome(s, "CREATION · RAPID PROTOTYPING", 9);
  addText(s, "Erst sichtbar machen. Dann sauber ins CMS übergeben.", 48, 72, 1010, 66, { size: 36, font: F.head, bold: true });
  addText(s, "CREATION ist kein Allzweck-Studio – sondern die schnelle Oberfläche für Landing-Page-Varianten und strukturierte Übergaben.", 48, 144, 1010, 50, { size: 17, bold: true });

  const variants = [
    { x: 48, y: 236, w: 260, h: 310, c: C.pink, title: "VARIANTE A" },
    { x: 326, y: 210, w: 300, h: 350, c: C.green, title: "VARIANTE B" },
    { x: 644, y: 254, w: 238, h: 292, c: C.orange, title: "VARIANTE C" },
  ];
  variants.forEach((v, i) => {
    addBox(s, v.x, v.y, v.w, v.h, C.white, { line: C.black, lineWidth: 2 });
    addText(s, v.title, v.x + 16, v.y + 14, v.w - 32, 18, { size: 10, font: F.mono, bold: true });
    addBox(s, v.x + 16, v.y + 50, v.w - 32, 72, v.c);
    addBox(s, v.x + 16, v.y + 138, v.w * 0.54, 16, C.black);
    addBox(s, v.x + 16, v.y + 170, v.w - 48, 8, C.line);
    addBox(s, v.x + 16, v.y + 190, v.w - 76, 8, C.line);
    addBox(s, v.x + 16, v.y + v.h - 58, 118, 34, C.black);
    addText(s, i === 1 ? "COMPARE" : "PREVIEW", v.x + 26, v.y + v.h - 50, 98, 18, { size: 10, font: F.mono, bold: true, color: C.white, align: "center" });
  });
  addBox(s, 882, 352, 64, 4, C.black);
  addText(s, "→", 896, 324, 40, 40, { size: 30, bold: true, align: "center" });
  addBox(s, 952, 222, 236, 326, C.black);
  addText(s, "CMS HANDOFF", 978, 248, 178, 20, { size: 11, font: F.mono, bold: true, color: C.pink, align: "center" });
  ["Contentful", "Storyblok", "Adobe AEM", "Webflow"].forEach((v, i) => addPill(s, v, 984, 300 + i * 50, 172, i === 0 ? C.yellow : C.white));
  addText(s, "API · Webhook · strukturierter Export", 978, 510, 186, 24, { size: 10, font: F.mono, color: C.white, align: "center" });
  addToolStrip(s, "Klarer Scope", ["Rapid Prototype", "Landing-Page-Varianten", "CMS-Schnittstelle"], 630, C.white);
  addSources(s, ["https://www.contentful.com/developers/docs/references/api-basics/", "https://www.storyblok.com/docs/api/management", "https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/headless/introduction", "https://developers.webflow.com/data/reference/content-management"]);
}

// 10 — Process
{
  const s = presentation.slides.add();
  s.background.fill = C.white;
  addChrome(s, "ZUSAMMENSPIEL", 10);
  addText(s, "Von der Marktbewegung zur überprüften Experience.", 48, 74, 1020, 62, { size: 35, font: F.head, bold: true });
  addText(s, "Jeder Schritt kann interne und externe Systeme nutzen – der Kontext bleibt verbunden.", 48, 142, 900, 28, { size: 17, bold: true });
  const steps = [
    ["01", "BEOBACHTEN", "ECHON", C.greenSoft, "Meltwater"],
    ["02", "VERSTEHEN", "AUDION", C.pinkSoft, "Qualtrics"],
    ["03", "ENTSCHEIDEN", "PLEXON", C.black, "Briefing"],
    ["04", "PROTOTYP", "CREATION", C.yellowSoft, "Figma / CMS"],
    ["05", "PRÜFEN", "CHECKION + BRANDION", C.orangeSoft, "GSC / DAM"],
  ];
  steps.forEach(([n, label, app, fill, ext], i) => {
    const x = 48 + i * 236;
    const dark = fill === C.black;
    addBox(s, x, 232, 205, 250, fill);
    addText(s, n, x + 16, 250, 42, 22, { size: 12, font: F.mono, bold: true, color: dark ? C.pink : C.pink });
    addText(s, label, x + 16, 292, 173, 26, { size: 16, font: F.head, bold: true, color: dark ? C.white : C.ink });
    addText(s, app, x + 16, 348, 173, 54, { size: 20, font: F.head, bold: true, color: dark ? C.white : C.ink });
    addText(s, ext, x + 16, 438, 173, 20, { size: 10, font: F.mono, color: dark ? C.white : C.grey });
    if (i < steps.length - 1) addText(s, "→", x + 204, 332, 32, 32, { size: 26, bold: true, align: "center" });
  });
  addBox(s, 48, 520, 1140, 70, C.black);
  addText(s, "CREATION baut nicht den gesamten Prozess ab. Es macht Entscheidungen früh sichtbar und bereitet die Übergabe in bestehende Produktionssysteme vor.", 76, 540, 1084, 34, { size: 16, bold: true, color: C.white, align: "center" });
}

// 11 — Integration architecture
{
  const s = presentation.slides.add();
  s.background.fill = C.black;
  addChrome(s, "INTEGRATIONSARCHITEKTUR", 11, true);
  addText(s, "Jeder Prozess hat Andockpunkte.", 48, 76, 830, 58, { size: 38, font: F.head, bold: true, color: C.white });
  addText(s, "Integration ist eine Designentscheidung – kein Produktversprechen per Toolname.", 48, 142, 940, 28, { size: 17, bold: true, color: C.pink });
  const modes = [
    ["API", "lesen · schreiben", C.pink],
    ["MCP", "Tools für Agents", C.green],
    ["IMPORT", "XLSX · CSV · JSON", C.yellow],
    ["WEBHOOK", "Events · Übergaben", C.orange],
  ];
  modes.forEach(([h, d, fill], i) => {
    const x = 48 + i * 292;
    addBox(s, x, 222, 262, 170, fill);
    addText(s, h, x + 20, 246, 222, 44, { size: 29, font: F.head, bold: true });
    addText(s, d, x + 20, 320, 222, 26, { size: 14, font: F.mono, bold: true });
  });
  addBox(s, 48, 430, 1140, 146, C.white);
  const checks = [["01", "ZUGRIFF", "OAuth, Rollen, Datenräume"], ["02", "VERTRAG", "API-Plan, Rate Limits, Lizenzen"], ["03", "GOVERNANCE", "Freigabe, Nachweis, Monitoring"]];
  checks.forEach(([n, h, d], i) => {
    const x = 78 + i * 362;
    addText(s, n, x, 458, 42, 22, { size: 11, font: F.mono, bold: true, color: C.pink });
    addText(s, h, x + 50, 454, 170, 28, { size: 15, font: F.head, bold: true });
    addText(s, d, x, 506, 300, 28, { size: 13, bold: true });
  });
  addText(s, "Die passende Anbindung wird pro Kunde und Use Case geprüft – technisch, rechtlich und wirtschaftlich.", 48, 624, 1040, 28, { size: 15, bold: true, color: C.white });
  addSources(s, ["https://developers.figma.com/docs/rest-api/", "https://www.contentful.com/developers/docs/references/api-basics/", "https://www.storyblok.com/docs/api/management"]);
}

// 12 — Governance
{
  const s = presentation.slides.add();
  s.background.fill = C.white;
  addChrome(s, "GOVERNANCE", 12);
  addText(s, "Offen integrieren. Kontrolliert entscheiden.", 48, 74, 980, 62, { size: 36, font: F.head, bold: true });
  addText(s, "Externe Tools liefern Daten oder Aktionen. PLEXON hält Regeln, Rollen und Nachweise zusammen.", 48, 142, 980, 28, { size: 17, bold: true });
  const gov = [
    ["EVIDENCE", "Welche Quelle stützt die Aussage?", C.pinkSoft],
    ["POLICY", "Welche CI- und Prozessregeln gelten?", C.yellowSoft],
    ["REVIEW", "Wer prüft und gibt frei?", C.greenSoft],
    ["TRACE", "Was wurde wann entschieden?", C.orangeSoft],
  ];
  gov.forEach(([h, d, fill], i) => {
    const x = 48 + i * 292;
    addBox(s, x, 230, 262, 252, fill);
    addText(s, `0${i + 1}`, x + 18, 250, 44, 22, { size: 11, font: F.mono, bold: true, color: C.pink });
    addText(s, h, x + 18, 298, 226, 30, { size: 20, font: F.head, bold: true });
    addText(s, d, x + 18, 360, 226, 72, { size: 17, bold: true });
  });
  addBox(s, 48, 522, 1140, 72, C.black);
  addText(s, "AI beschleunigt Prüfung und Vorbereitung. Verantwortliche Menschen behalten Entscheidung und Freigabe.", 76, 542, 1084, 34, { size: 16, bold: true, color: C.white, align: "center" });
}

// 13 — Benefits
{
  const s = presentation.slides.add();
  s.background.fill = C.pink;
  addChrome(s, "WIRKUNG", 13);
  addText(s, "Drei Perspektiven. Ein gemeinsamer Vorteil: weniger Kontextverlust.", 48, 74, 1080, 68, { size: 35, font: F.head, bold: true });
  const cols = [
    ["FÜR KUNDEN", "Mehr Steuerbarkeit", "Bestehende Systeme bleiben nutzbar. Entscheidungen werden nachvollziehbar.", C.black, C.white],
    ["FÜR USER", "Weniger Reibung", "Research, Gestaltung und Prüfung greifen auf denselben Kontext zu.", C.white, C.ink],
    ["FÜR MSQ DX", "Skalierbare Services", "Wiederverwendbare Flows verbinden Beratung, Kreation und Technologie.", C.yellow, C.ink],
  ];
  cols.forEach(([eye, h, d, fill, color], i) => {
    const x = 48 + i * 388;
    addBox(s, x, 210, 356, 358, fill);
    addText(s, eye, x + 22, 234, 312, 18, { size: 10, font: F.mono, bold: true, color: i === 0 ? C.pink : C.grey });
    addText(s, h, x + 22, 286, 312, 64, { size: 27, font: F.head, bold: true, color });
    addText(s, d, x + 22, 390, 312, 108, { size: 17, bold: true, color });
  });
}

// 14 — Close
{
  const s = presentation.slides.add();
  s.background.fill = C.black;
  addLogo(s, true);
  addText(s, "EINSTIEG", 48, 40, 300, 18, { size: 11, font: F.mono, bold: true, color: C.pink });
  addText(s, "Nicht mit allen Tools starten.\nMit einem echten Prozess.", 48, 118, 750, 122, { size: 44, font: F.head, bold: true, color: C.white });
  addText(s, "Ein relevanter Use Case zeigt schnell, welche Daten, Apps und Anbindungen wirklich Wert schaffen.", 48, 268, 720, 54, { size: 18, bold: true, color: C.white });
  const pilot = [["01", "PROZESS", "Eine konkrete Frage"], ["02", "STACK", "Vorhandene Systeme"], ["03", "LOOP", "Messbare Entscheidung"]];
  pilot.forEach(([n, h, d], i) => {
    const x = 48 + i * 286;
    addBox(s, x, 390, 256, 160, i === 0 ? C.pink : i === 1 ? C.yellow : C.green);
    addText(s, n, x + 18, 410, 44, 22, { size: 11, font: F.mono, bold: true });
    addText(s, h, x + 18, 450, 220, 30, { size: 21, font: F.head, bold: true });
    addText(s, d, x + 18, 500, 220, 24, { size: 14, bold: true });
  });
  addBox(s, 932, 390, 256, 160, C.white);
  addText(s, "LET’S BUILD\nTHE LOOP.", 958, 426, 204, 80, { size: 25, font: F.head, bold: true, align: "center" });
  addText(s, "PLEXON AI Suite · MSQ DX", 48, 656, 340, 20, { size: 11, font: F.mono, color: C.white });
}

async function saveBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

for (const [index, slide] of presentation.slides.items.entries()) {
  const file = path.join(previewDir, `slide-${index + 1}.png`);
  await saveBlob(file, await presentation.export({ slide, format: "png", scale: 1 }));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(previewDir, `slide-${index + 1}.layout.json`), await layout.text());
}

await saveBlob(path.join(previewDir, "montage.webp"), await presentation.export({ format: "webp", montage: true, scale: 0.6 }));
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(outPath);
console.log(JSON.stringify({ outPath, previewDir, slides: presentation.slides.items.length }, null, 2));
