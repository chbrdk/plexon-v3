# Suite — Aufgaben und Use Cases für Agenturen

**Stand:** 2026-09-25  
**Voraussetzung:** [`suite-funktionsstand.md`](suite-funktionsstand.md)  
**Lesart:** Eine Collection ist das Kundenmandat. Die Apps sind Werkzeuge darin. Nicht jedes Mandat braucht alle Apps.

Jede Aufgabe nennt, was heute durchspielbar ist und wo die Kette noch eine Lücke hat. „Durchspielbar“ heißt: die Flächen existieren. Keys, Freigabe der Domain und Federation-Modus bleiben Betriebsvoraussetzungen.

## Aufgabenkatalog

Aufgaben, die eine Agentur oder ein Inhouse-Team in der Plattform erledigen will — unabhängig davon, welche App das Schild trägt.

| Aufgabe | Werkzeuge | Heute |
|---|---|---|
| Neuen Pitch in einem Durchlauf belegen | PLEXON Event Quick Check, CHECKION, AUDION | Durchspielbar |
| Eine URL auf Barrierefreiheit prüfen und dem Kunden zeigen | CHECKION Single + Share | Durchspielbar |
| Eine Domain auf wiederkehrende Qualitäts- und SEO-Muster prüfen | CHECKION Deep / SEO-Crawl | Durchspielbar |
| Prüfen, ob KI-Modelle die Marke ohne Stütze kennen | CHECKION GEO Model memory | Durchspielbar |
| Prüfen, ob die Marke in gestützter KI-Suche vorkommt | CHECKION GEO Live search | Durchspielbar; nie mit Model memory in eine Zahl werfen |
| Zielgruppe und Personas für ein Mandat anlegen | AUDION | Durchspielbar |
| Mit einer Persona sprechen, auch per Video | AUDION Chat / Tavus / BEY | Durchspielbar, wenn Provider-Keys da sind |
| Eine Customer Journey mit Reibung und Zitaten prüfen | AUDION Journeys | Durchspielbar |
| Einen UX-Test mit Agent auf einer echten Fläche laufen lassen | AUDION Studies | Durchspielbar mit Journey-Agent-URL, sonst Fixture |
| Marken-Guideline als Tokens und Regeln führen | BRANDION | Durchspielbar |
| PDF, Keyvisual oder Seite gegen die Guideline messen | BRANDION Analysis | Durchspielbar |
| Landing, Onepager oder Magazin gestalten | CREATION | Durchspielbar |
| Entwurf zur Kundenfreigabe schicken | CREATION Client Share | Durchspielbar |
| HTML-Entwurf in eine bearbeitbare Seite ziehen | CREATION Import | Durchspielbar |
| Seite als React/Tailwind an Entwicklung übergeben | CREATION Export | Durchspielbar |
| Rohschnitt suchen, schneiden, 9:16 ableiten, exportieren | VIDEON | Durchspielbar |
| Monatsreport aus Website, Journey und Tabelle bauen | METRON + Konnektoren | Durchspielbar |
| Marktbewegung der Woche in ein Briefing fassen | ECHON | Durchspielbar in der ECHON-Oberfläche |
| Alles zu einem Mandat an einem Ort halten | PLEXON Collection + Knowledge Pack | Durchspielbar |
| Wiederkehrenden Prüfpfad speichern und erneut starten | Collection Flow | Durchspielbar |
| Dem Assistant eine Folge von Jobs übergeben | Assistant-Spezialisten, optional Catalog-Runtime | Durchspielbar; gemeinsame Executor-Runtime ist geflagt |

---

## Use Cases

### 1. Pitch: „Was ist in 48 Stunden über diese Marke sagbar?“

**Wer:** Neugeschäft, Strategie.  
**Aufgabe:** Vor dem Ersttermin eine belegbare Sicht auf Website, KI-Sichtbarkeit und Zielgruppe.

1. Collection für den Pitch anlegen.
2. Event Quick Check auf die freigegebene URL starten: Tiefe wählen, GEO-Fragen prüfen, Report erzeugen.
3. Report per Share-Link oder PDF/PPTX in die Deck legen.
4. Wenn die Fragen nach der Zielgruppe gehen: in AUDION eine Zielgruppe und ein bis zwei Personas anlegen und den Research-Destillat in den Knowledge Pack geben.
5. Optional: CHECKION Deep nur starten, wenn der Crawl freigegeben ist.

**Ergebnis:** Ein Magazin-Report plus, wenn gewünscht, Personas.  
**Lücke:** Quick Check ersetzt keinen Deep-Crawl und kein betreutes UX-Study.

### 2. Website-Retainer: Qualität, SEO-Corpus, KI-Sichtbarkeit

**Wer:** Digital-Team am Bestandskunden.  
**Aufgabe:** Monatlich wissen, was auf der Site systematisch kaputt ist und ob Antwortmaschinen die Marke nennen.

1. Collection des Mandats öffnen.
2. WCAG Deep auf die freigegebene Domain, Issues nach Häufigkeit lesen, nicht nach Einzelfehler.
3. SEO-Crawl über denselben Corpus: Titel, Meta, Überschriften, Abdeckung.
4. Zwei getrennte GEO-Jobs: Model memory und Live search. Zahlen nicht addieren.
5. `geo_context` und `competitive` in den Knowledge Pack schreiben.
6. In METRON das CHECKION-Site-Health-Pack **auf Apply** in ein Dashboard ziehen und den Link an den Kunden geben.

**Ergebnis:** Dossier in CHECKION, Kennzahlen in METRON, Kurzfassung im Pack.  
**Lücke:** Kein Rank-Tracking als Produktversprechen. Reports-Magazin in CHECKION ist Platzhalter; der Report lebt im Ergebnis und in METRON.

### 3. Relaunch: für wen, welche Seite, welche Reibung

**Wer:** UX und Content.  
**Aufgabe:** Vor dem Go-live sagen, welche Seiten für welche Persona tragen und wo die Journey hakt.

1. AUDION-Projekt der Collection: Zielgruppe, Personas, Journey mit Phasen.
2. Journey validieren (automatisch oder im Chat) und Reibungspunkte notieren.
3. Aus einem Journey-Schritt den CHECKION-Single auf die konkrete URL legen.
4. Wenn ein Agent verfügbar ist: UX Study mit Hypothesen, Evaluate, Compare.
5. Research-Destillat publizieren, damit GEO-Fragen in CHECKION dieselbe Sprache sprechen.

**Ergebnis:** Journey-Evidenz plus Seitenbefund.  
**Lücke:** Study ohne Agent-URL bleibt **Fixture** (muss als solches gekennzeichnet sein).  
**By design:** CHECKION-Handoff aus der Journey ist nur **Single**, nie Deep (`audion-journey-scan-trigger.md`). Deep gehört zu Use Case 2 (Retainer).

### 4. Marke führen und Kampagnenmittel prüfen

**Wer:** Brand- und Design-Team.  
**Aufgabe:** Eine Guideline, an der Gestaltung und Freigabe hängen.

1. In BRANDION Guideline anlegen oder importieren, Tokens setzen, eine Guideline aktivieren.
2. Compliance-Regeln mit Schwere und Toleranz, Trockenlauf.
3. PDF oder Keyvisual in Analysis messen, Findings nach Farbe, Typo, Layout, Asset, Content lesen.
4. CREATION öffnet dieselbe Collection und bindet das Active Pack. Gestaltung ändert Pfade, nicht eine zweite Token-Wahrheit.
5. VIDEON-Brand-Check nutzt dieselbe Messung auf Frames.

**Ergebnis:** Aktive Guideline, Messlauf, gestaltete Fläche auf denselben Tokens.  
**Lücke:** Detection Lab ist keine Nutzerreise. Ein „Bestanden“ ohne Messung gibt es nicht.

### 5. Landing bauen, freigeben, übergeben

**Wer:** Kreation und Frontend.  
**Aufgabe:** Aus einem HTML-Entwurf oder einer leeren Seite eine freigabefähige Landing machen und Code abgeben.

1. Composition in der Collection anlegen.
2. HTML importieren oder im Editor aus Site-Kit-Atomen bauen. Der Assistant kann Ops und Import über MCP.
3. Optional Referenzen über SPIRION in den Chat ziehen, bevor das Layout festgezurrt wird.
4. Client Page Share mit Passwort und Frist; Kommentare der Gäste zurück im Editor.
5. Export React/Tailwind/SwiftUI. Storyblok-Push nur, wenn das Zielsystem Storyblok ist (PoC).

**Ergebnis:** Szene, Kundenlink, Code.  
**Lücke:** Storyblok ist kein Zwei-Wege-Sync. macOS-Parity ist nicht deckungsgleich mit dem Web-Editor.

### 6. Bewegtbild: finden, schneiden, Format wechseln

**Wer:** Content- und Social-Team.  
**Aufgabe:** Aus Rohmaterial einen Cut und eine Hochformat-Ableitung, die zur Marke passt.

1. Material in die Collection hochladen, Analyse laufen lassen.
2. In der Szenen-Suche die Stellen finden, die zur Botschaft passen.
3. Cut anlegen, Szenen legen, VO und zweite Spur nutzen, MP4 oder Premiere XML exportieren.
4. Reframe für 9:16. Generative Änderung nur nach expliziter Freigabe im Entwurf.
5. Brand-Check gegen die aktive BRANDION-Guideline. Highlights landen als `media_insights` im Pack.

**Ergebnis:** Durchsuchbares Material, Cut, Ableitung, Markenbefund.  
**Lücke:** Reframe und Generate sind Agent-Jobs, keine Flow-Knoten.

### 7. Monatsreporting ohne neue Excel-Wahrheit

**Wer:** Account und Analytics.  
**Aufgabe:** Eine Seite, die Kunde und Team jeden Monat öffnen, mit Herkunft der Zahl.

1. Sources: Suite-Sync (CHECKION, AUDION) und, wo Credentials liegen, GA4, Sheets oder HubSpot.
2. Starter-Packs nur anwenden, nicht automatisch anlegen: Site Health, Journey, GA4 Traffic.
3. Eigene KPIs nur, wenn die Zahl eine klare Formel hat. Auswertung bleibt serverseitig.
4. Dashboard bauen, Share-Link an den Kunden.
5. Im Assistant nach dem Dashboard fragen, statt die Zahl aus dem Kopf zu setzen.

**Ergebnis:** Geteiltes Dashboard mit Stand und Quelle.  
**Lücke:** Kein freies BI-Studio. Home von METRON ist nur das Sprungbrett.

### 8. Wochenbriefing Markt

**Wer:** Strategie, Planning.  
**Aufgabe:** Was sich diese Woche bewegt, in fünf Sätzen, anschlussfähig an Zielgruppe und Kreation.

1. In ECHON Tagespuls und Foresight lesen: steigende Tags, Watchlist, Waves.
2. Szenario oder Chat: eine Frage zur Branche, mit Belegen aus Signalen.
3. Briefing-Fassung erzeugen.
4. Destillat in die Facette `market_intelligence` der Collection geben, wenn die Bindung steht.
5. AUDION-Zielgruppe gegen diese Themen halten: welche Persona ist betroffen, welche Journey-Phase.

**Ergebnis:** Belegtes Briefing im Mandatsordner.  
**Lücke:** ECHON läuft als Companion auf dem Mac-Setup, nicht als automatisch gespiegeltes Produktprojekt. Signal-Rohdaten bleiben in ECHON.

### 9. Laufendes Mandat als ein Arbeitsraum

**Wer:** Projektleitung.  
**Aufgabe:** Team, Wissen und nächste Prüfung an einem Ort, ohne acht Logins mit acht Projektbegriffen.

1. Eine Collection pro Kunde oder Kampagne.
2. Team über Einladung (Annahme-Link). Produkt-Entitlements setzt die Administration.
3. Knowledge Pack als gemeinsame Kurzfassung: Profil, Wettbewerb, Research, GEO, Marke, Markt, Medien.
4. Wiederkehrenden Pfad als Flow speichern: zum Beispiel Scan, dann GEO, dann Vergleich. Oder Guideline plus Markenmessung. Oder Medienanalyse plus Cut.
5. Assistant im Flyout der jeweiligen App: Spezialist wählen, lange Jobs in den Flow übergeben.

**Ergebnis:** Ein Mandatsordner, nachvollziehbare Läufe, Destillate statt Aktendumps.  
**Lücke:** Mitgliederverwaltung auf der Collection-Home ist noch API-lastig (Invite-API + `/invite/:token`; kein volles Roster-Panel in dieser Tranche). Capability-Panes CREATION/VIDEON/ECHON/SPIRION: Einstieg auch ohne letzten Lauf (Härte).

**Verifikation:** [`suite-use-case-testing.md`](suite-use-case-testing.md) — Markierungen Live|Fixture|Demo|Geplant, CI + Staging-E2E.

---

## Welche Kette für welchen Agenturtyp

| Agenturtyp | Kernkette | Ergänzung |
|---|---|---|
| Digital / Performance | CHECKION → METRON | Event Quick Check für Pitches |
| UX / Research | AUDION Studies und Journeys → CHECKION Single | Knowledge Pack für die Sprache der GEO-Fragen |
| Brand / Design | BRANDION → CREATION → Client Share | VIDEON Brand-Check, SPIRION als Referenz |
| Content / Social | VIDEON → CREATION (Stills, Landing) | BRANDION |
| Strategie / Planning | ECHON → AUDION | CHECKION GEO |
| Full-Service-Retainer | Collection + Flow + Pack, dann die Kette aus Use Case 2, 4 und 7 | Assistant als Querfrage |

Enterprise-Wellen E1–E9: Spec `specs/domain/suite-enterprise-program.md` (Done bzw. E9 Admin-Stub). Testing: `knowledge/suite-use-case-testing.md`.

## Nicht versprechen

- Rankings, Zeitersparnis in Prozent, oder dass eine Messung „die Marke besteht“, ohne den Lauf zu zeigen.
- Dass Model memory und Live search dieselbe Kennzahl sind.
- Dass jede App in jeder Umgebung ohne Keys live rechnet. Fixture-Modus ist ein Betriebszustand, keine Demo-Lüge in Kundentexten: Kennzeichnung **Live**, **Demo**, **Fixture** oder **Geplant** wie in [`handover/suite-knowledge-base.md`](handover/suite-knowledge-base.md).
