import fs from "node:fs/promises";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const starterPath = "/Users/christoph.bordeck/Desktop/GITHUB/plexon-v3/.tmp/provinzial-deck/template/template-starter.pptx";
const finalPath = "/Users/christoph.bordeck/Desktop/GITHUB/plexon-v3/output/Provinzial_GEO_Sichtbarkeitsaudit.pptx";
const renderDir = "/Users/christoph.bordeck/Desktop/GITHUB/plexon-v3/.tmp/provinzial-deck/final-render";
const sourcePdf = "/Users/christoph.bordeck/Downloads/plexon-assistant-report-Quick-Check-Provinzial.pdf";
const sourceDeck = "/Users/christoph.bordeck/Desktop/VKB_GEO_Sichtbarkeitsaudit.pptx";

async function writeBlob(path, blob) {
  await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

const presentation = await PresentationFile.importPptx(await FileBlob.load(starterPath));
const snapshot = await presentation.inspect({
  kind: "slide,textbox,shape,image,notes",
  include: "id,slide,name,title,text,textPreview,bbox,bboxUnit",
  maxChars: 1000000,
});

const records = snapshot.ndjson
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

function recordFor(slide, name) {
  const matches = records.filter((record) => record.slide === slide && record.name === name && record.kind === "textbox");
  if (matches.length !== 1) {
    throw new Error(`Expected one textbox on slide ${slide} named ${name}; found ${matches.length}`);
  }
  return matches[0];
}

function replaceText(slide, name, nextText) {
  const record = recordFor(slide, name);
  if (!record.text) throw new Error(`Textbox ${name} on slide ${slide} has no source text`);
  const shape = presentation.resolve(record.id);
  shape.text.replace(record.text, nextText);
}

function replaceSegment(slide, name, oldText, nextText) {
  const record = recordFor(slide, name);
  if (!record.text.includes(oldText)) {
    throw new Error(`Source segment not found on slide ${slide}, ${name}: ${oldText}`);
  }
  const shape = presentation.resolve(record.id);
  shape.text.replace(oldText, nextText);
}

// 1 — Opening thesis
replaceText(1, "Text 0", "GEO-SICHTBARKEITS-AUDIT · PROVINZIAL");
replaceText(1, "Text 1", "Sichtbar, aber kaum zitierbar");
replaceText(1, "Text 2", "Quick Check für provinzial.de/west: Domainqualität, GEO-Wettbewerb und konkrete Content-Hebel");

// 2 — Context
replaceText(2, "Text 0", "QUICK CHECK");
replaceText(2, "Text 1", "Ein Quick Check, drei Perspektiven");
replaceText(2, "Text 3", "Untersuchte Domain");
replaceText(2, "Text 4", "provinzial.de/west · 50 Seiten · Domain-Score 73 · 6 A11y-Fehler");
replaceText(2, "Text 6", "Analyse-Bausteine");
replaceText(2, "Text 7", "Domain-Scan, 4 Personas und GEO-Audit mit 8 Prompts in 7 Modellen");
replaceText(2, "Text 9", "Leitfrage");
replaceText(2, "Text 10", "Wie wird Provinzial zur zitierfähigen Quelle statt nur zur sichtbaren Marke?");

// 3 — Personas
replaceText(3, "Text 0", "PERSONA-PORTFOLIO");
replaceText(3, "Text 1", "Vier Personas, zwei Suchwelten");
replaceText(3, "Text 2", "PRIVATKUNDEN");
replaceText(3, "Text 3", "Sabrina Weber");
replaceText(3, "Text 4", "Sicherheitsorientiert; sucht verständliche Beratung, transparente Kosten und lokale Nähe.");
replaceText(3, "Text 5", "Markus Klein");
replaceText(3, "Text 6", "Zeitknapp, datenbasiert; will Prioritäten, Vergleichbarkeit und digitale Unterlagen.");
replaceText(3, "Text 7", "Gemeinsamer Suchmodus");
replaceText(3, "Text 8", "Familie und Eigenheim, regionale Beratung und klare nächste Schritte.");
replaceText(3, "Text 9", "GEWERBEKUNDEN");
replaceText(3, "Text 10", "Markus Schneider");
replaceText(3, "Text 11", "Risikoabwägend; braucht klare Deckungsgrenzen und wenig Verwaltung.");
replaceText(3, "Text 12", "Sabrina Köhler");
replaceText(3, "Text 13", "Zeitkritisch; erwartet flexible Deckung und einen schnellen Start.");
replaceText(3, "Text 14", "Gemeinsamer Suchmodus");
replaceText(3, "Text 15", "Gewerbeschutz, fester Ansprechpartner und skalierbare Prozesse.");

// 4 — Key metrics
replaceText(4, "Text 0", "KERNZAHLEN");
replaceText(4, "Text 1", "Solide Basis, schwache GEO-Präsenz");
replaceText(4, "Text 4", "Domain-Score");
replaceText(4, "Text 5", "provinzial.de");
replaceText(4, "Text 6", "73 / 100");
replaceText(4, "Text 7", "50 Seiten");
replaceText(4, "Text 8", "6 Fehler");
replaceText(4, "Text 9", "Solide technische Basis.");
replaceText(4, "Text 12", "GEO-Score");
replaceText(4, "Text 13", "Provinzial");
replaceText(4, "Text 14", "46 / 100");
replaceText(4, "Text 15", "Wettbewerbs-Schnitt");
replaceText(4, "Text 16", "14 / 100");
replaceText(4, "Text 17", "Provinzial liegt 32 Punkte darüber.");
replaceText(4, "Text 20", "Sichtbarkeitsanteil");
replaceText(4, "Text 21", "Provinzial");
replaceText(4, "Text 22", "3 %");
replaceText(4, "Text 23", "Ø Position");
replaceText(4, "Text 24", "4,4");
replaceText(4, "Text 25", "Rang 6 im Wettbewerberfeld.");

// 5 — Core insight, preserve the two inherited text styles.
replaceText(5, "Text 0", "KERNERKENNTNIS");
replaceSegment(5, "Text 1", "Der höhere Domaincore hilft nichts, wenn kein Modell den Partner zitiert.", "77 % der Antworten verweisen auf „other“ — trotz solider Basis.");
replaceSegment(5, "Text 1", "Kretschmer & Schweiger (58 Punkte) ist bei allen 8 Fragen unsichtbar. VBG Daniela Mütze (48 Punkte) wird bei 5 von 8 Fragen zitiert — zweimal auf Platz 1 bzw. 2.", "Provinzial erreicht GEO-Score 46 und liegt 32 Punkte über dem Wettbewerbs-Schnitt. Trotzdem beträgt der Sichtbarkeitsanteil nur 3 %; bei 2 von 8 Prompts wird die Domain gar nicht zitiert.");

// 6 — Results by prompt
replaceText(6, "Text 0", "PROVINZIAL.DE · ERGEBNIS JE FRAGE");
replaceText(6, "Text 1", "Acht Fragen, zwei Mal unsichtbar");
replaceText(6, "Text 2", "Junge Familie & Eigenheim");
replaceText(6, "Text 3", "Platz 10");
replaceText(6, "Text 4", "Regionaler Berater in Düren");
replaceText(6, "Text 5", "nicht zitiert");
replaceText(6, "Text 6", "Lokal vs. bundesweit (Bonn)");
replaceText(6, "Text 7", "Platz 1");
replaceText(6, "Text 8", "Pflichtschutz beim Hauskauf");
replaceText(6, "Text 9", "Platz 14");
replaceText(6, "Text 10", "Regionaler Berater in Hürth");
replaceText(6, "Text 11", "Platz 17");
replaceText(6, "Text 12", "Anbietervergleich für Familien");
replaceText(6, "Text 13", "nicht zitiert");
replaceText(6, "Text 14", "Gewerbeschutz für Mittelstand");
replaceText(6, "Text 15", "Platz 14");
replaceText(6, "Text 16", "Gewerbeversicherer in Münster");
replaceText(6, "Text 17", "Platz 1");
replaceText(6, "Text 19", "Stark bei lokalen und spezifischen Fragen, unsichtbar bei Beratungssuche und Anbietervergleich. Basis: 8 Prompts × 7 Modelle.");

// 7 — Pattern in the prompt set
replaceText(7, "Text 0", "MUSTER IM PROMPT-SET");
replaceText(7, "Text 1", "Lokalität gewinnt, Vergleich verliert");
replaceText(7, "Text 2", "VERGLEICH & MAINSTREAM");
replaceText(7, "Text 3", "Regionaler Berater in Düren");
replaceText(7, "Text 4", "nicht zitiert");
replaceText(7, "Text 5", "Anbietervergleich für Familien");
replaceText(7, "Text 6", "nicht zitiert");
replaceText(7, "Text 7", "Pflichtschutz beim Hauskauf");
replaceText(7, "Text 8", "Platz 14");
replaceText(7, "Text 9", "Gewerbeschutz Mittelstand");
replaceText(7, "Text 10", "Platz 14");
replaceText(7, "Text 11", "Regionaler Berater in Hürth");
replaceText(7, "Text 12", "Platz 17");
replaceText(7, "Text 13", "LOKAL & SPEZIFISCH");
replaceText(7, "Text 14", "Bonn: lokal vs. bundesweit");
replaceText(7, "Text 15", "Platz 1");
replaceText(7, "Text 16", "Münster: fester Ansprechpartner");
replaceText(7, "Text 17", "Platz 1");
replaceText(7, "Text 18", "Junge Familie & Eigenheim");
replaceText(7, "Text 19", "Platz 10");
replaceText(7, "Text 21", "Die besten Rankings entstehen dort, wo Region und konkrete Lebens- oder Betriebslage zusammentreffen; generische Vergleichsfragen besetzen Wettbewerber.");

// 8 — Causes, preserve bold lead-ins and muted/italic follow-up runs.
replaceText(8, "Text 0", "WARUM DAS SO IST");
replaceText(8, "Text 1", "„other“ dominiert, E-E-A-T-Lücken bremsen");
replaceText(8, "Text 3", "WETTBEWERBSBILD");
replaceText(8, "Text 4", "77 % Sichtbarkeit entfallen auf „other“");
replaceSegment(8, "Text 5", "Kretschmer & Schweiger:", "Provinzial:");
replaceSegment(8, "Text 5", " check24.de auf Platz 1 bei 4 von 8 Fragen", " 3 % Sichtbarkeit · Ø Position 4,4");
replaceSegment(8, "Text 5", "VBG:", "Allianz / check24:");
replaceSegment(8, "Text 5", " check24.de auf Platz 1 bei 3 von 8 Fragen", " 5 % / 3 % Sichtbarkeit im Wettbewerberfeld");
replaceSegment(8, "Text 5", "Genau dort, wo der Partner selbst nicht vorkommt.", "Die Konkurrenz ist fragmentiert — konkrete Quellen gewinnen.");
replaceText(8, "Text 7", "E-E-A-T-LÜCKE");
replaceText(8, "Text 8", "Struktur gut, Details nicht zitierbar");
replaceSegment(8, "Text 9", "Kretschmer & Schweiger — Erfahrung (40/100):", "Vertrauen & Erfahrung — 40/100:");
replaceSegment(8, "Text 9", " keine Fallbeispiele, keine nachprüfbaren Prozesse", " kaum sichtbare Trust-Signale, keine Fälle oder Prozesse");
replaceSegment(8, "Text 9", "VBG — Vertrauen (40/100):", "Fachkompetenz & Autorität — 60/100:");
replaceSegment(8, "Text 9", " fehlende Impressum-, Datenschutz- und Über-uns-Signale", " gute Cluster, aber 0 FAQ-/Zitiersignale und keine HowTo-/Breadcrumb-Struktur");

// 9 — Interpretation
replaceText(9, "Text 1", "EINORDNUNG");
replaceText(9, "Text 2", "Die Technik trägt — der Content begrenzt die Sichtbarkeit");
replaceText(9, "Text 3", "Domain-Score 73 und 50 geprüfte Seiten zeigen eine belastbare Basis. Doch 86 % des Corpus sind sehr komplex; FAQ, HowTo, Breadcrumbs, Author-Bios und zitierfähige Detailblöcke fehlen. So bleibt Provinzial für generative Modelle schwer zusammenzufassen.");

// 10 — Recommendations
replaceText(10, "Text 0", "HANDLUNGSEMPFEHLUNGEN");
replaceText(10, "Text 1", "Drei Prioritäten, klarer Hebel");
replaceText(10, "Text 4", "Zitierbare Antwortblöcke");
replaceText(10, "Text 5", "Für Kernfragen kurze Blöcke aus Definition, 1–2 belastbaren Fakten, Quelle und Ansprechpartner veröffentlichen.");
replaceText(10, "Text 8", "FAQ & Schema");
replaceText(10, "Text 9", "FAQPage, HowTo, BreadcrumbList und semantische Definitionen ergänzen; bestehende Themen-Cluster maschinenlesbar auszeichnen.");
replaceText(10, "Text 12", "Trust & Experience");
replaceText(10, "Text 13", "Author-Bios, qualifizierte Kontakte, Fallbeispiele und nachprüfbare Prozesse sichtbar machen und mit Organization/WebPage-Signalen verbinden.");
replaceText(10, "Text 14", "Startpunkt: die zwei unzitierten Prompts plus Fragen mit Rang 14–17 — hier ist der größte kurzfristige Hebel.");

// 11 — Closing synthesis, preserve the inherited headline/body/footer styles.
replaceText(11, "Text 0", "FAZIT");
replaceSegment(11, "Text 1", "Der eigentliche Wettbewerber ist nicht Allianz oder Check24 —", "Provinzial muss nicht sichtbarer werden —");
replaceSegment(11, "Text 1", "es ist die Masse an „sonstigen“ Quellen.", "sondern zitierbarer.");
replaceText(11, "Text 2", "Die technische Basis ist solide und der GEO-Score überdurchschnittlich. Der nächste Sprung entsteht durch strukturierte Antworten, belastbare Vertrauenssignale und lokale Evidenz — genau dort, wo die Personas konkret suchen.");
replaceText(11, "Text 3", "Quelle: PLEXON Quick Check Provinzial · 50 Seiten · 8 Prompts · 7 Modelle · Stand 25.08.2026");

const pageSources = [
  "1, 6–9",
  "1, 6",
  "4–5",
  "1, 6, 9",
  "6, 9",
  "6",
  "6",
  "6–7",
  "2–3, 7",
  "8–9",
  "1, 6–9",
];

for (let index = 0; index < presentation.slides.items.length; index += 1) {
  const slide = presentation.slides.getItem(index);
  slide.speakerNotes.textFrame.setText(
    `[Sources]\n- ${sourcePdf} — Seiten ${pageSources[index]}\n- ${sourceDeck} — Designreferenz und MSQDX-Logo\n[/Sources]`,
  );
}

await fs.mkdir(renderDir, { recursive: true });
for (let index = 0; index < presentation.slides.items.length; index += 1) {
  const slide = presentation.slides.getItem(index);
  const stem = `slide-${String(index + 1).padStart(2, "0")}`;
  await writeBlob(`${renderDir}/${stem}.png`, await presentation.export({ slide, format: "png", scale: 2 }));
  await fs.writeFile(`${renderDir}/${stem}.layout.json`, await (await slide.export({ format: "layout" })).text(), "utf8");
}

await writeBlob(
  `${renderDir}/deck-montage.webp`,
  await presentation.export({ format: "webp", montage: true, scale: 1 }),
);

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(finalPath);
console.log(finalPath);
