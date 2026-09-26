# BRN-QS-01 — PDF im Measured evaluate prüfen

## Tutorial-Steckbrief

| Feld | Inhalt |
|---|---|
| Format | Quick Start |
| Zieldauer | 3–5 Minuten |
| Zielgruppe | Neue BRANDION-Nutzer:innen, Design Ops |
| Oberfläche | BRANDION `/analysis` (**Measured evaluate**) |
| Lernziel | Eine kontrollierte PDF-Vorlage gegen eine Guideline messen und Pass/Fail-Findings lesen |
| Erfolg | Ein Evaluate-Run ist gestartet; StatLede zeigt Passed/Failed/Skipped und Findings sind sichtbar |

## Terminologie

Die Produktnavigation nennt die Fläche **Analysis** mit Titel **Measured evaluate**. Der frühere Produktname **Detection Lab** (`/detection-lab`) ist ein Redirect auf dieselbe Fläche und erscheint **nicht** mehr in der Rail.

Im Sprechertext:

> „Wir prüfen ein PDF im Measured evaluate — BRANDION vergleicht die Datei mit den Tokens und Regeln der gewählten Guideline.“

Wir sagen nicht „Detection Lab“, außer als historische Fußnote im Begleittext.

## Voraussetzungen

- Anmeldung mit Plexon-Konto (Staging: `https://brandion-v3.projects-a.plygrnd.tech`).
- Mindestens eine Guideline existiert (Demo-Kit oder Collection-Guideline).
- Vor der Aufnahme: Flow einmal ohne Kamera durchklicken; Live/Demo/Fixture kennzeichnen.
- Keine Kunden-PDFs ohne Freigabe.

## Beispieldaten (kontrolliert)

| Feld | Beispiel |
|---|---|
| Oberfläche | `/analysis` oder `/analysis?adapter=pdf` |
| Evidence | Staging-Fixture `https://brandion-v3.projects-a.plygrnd.tech/fixtures/pdf-porsche-pds.pdf` (Porsche PDS kit) **oder** lokal heruntergeladenes `cd-test-measure.pdf` |
| Guideline | Demo-/Test-Guideline mit gemappten Regeln (z. B. Staging-Kit „Porsche PDS“ / CD Evaluate Test Kit) |
| Erwartung | Gemischte Pass/Fail-Findings (PDS-Kit dokumentiert ~4 pass · 3 fail) |

Alternative ohne Upload: Primary-Kit-Hinweis in der UI nutzen, wenn Staging die Fixture-Hinweise anbietet.

## Klickpfad

1. BRANDION öffnen und anmelden.
2. In der linken Navigation **Analysis** wählen (nicht Detection Lab).
3. Unter **Guideline** die Ziel-Guideline wählen.
4. Unter **Primary evidence** / **Document (PDF or image)** **Choose file…** und die Demo-PDF wählen — Auto-detect zeigt **Detected: PDF**.
5. Optional: Seite-URL-Feld leer lassen (PDF bleibt Primary).
6. **Run evaluate** wählen.
7. Während **Running…** den Status belassen; danach StatLede (**Passed** / **Failed** / **Skipped**) und **Findings** lesen.
8. Bei Bedarf **Recent runs** in der History prüfen.

`Lab evidence` (CSS / DTCG / Fixture-Paste) bleibt zugeklappt — Produktpfad ist Primary-Upload, nicht Lab.

## Storyboard und Sprechertext

| Zeit | Bildschirmregie | Sprechertext | Einblendung |
|---:|---|---|---|
| 00:00 | Analysis / Measured evaluate | „In diesem Quick Start prüfen wir ein Marken-PDF gegen eine Guideline in BRANDION.“ | Measured evaluate |
| 00:12 | Kurz Rail: Projects · Analysis · Guidelines | „Analysis ist der Messraum. Guidelines speichern Tokens und Regeln; Projects binden beides an eine Collection.“ | Collection · Capability |
| 00:30 | Guideline-Picker | „Zuerst wählen wir die Guideline, gegen die gemessen wird.“ | Guideline wählen |
| 00:48 | Primary evidence · Choose file | „Als Primary Evidence laden wir ein kontrolliertes Demo-PDF — keine Kundendatei.“ | PDF · Demo |
| 01:05 | Detected: PDF | „BRANDION erkennt automatisch PDF oder Bild. Für diesen Lauf bleibt es PDF.“ | Auto-detect |
| 01:20 | Run evaluate | „Mit Run evaluate starten wir die Messung.“ | Run evaluate |
| 01:35 | Running… | „Der Lauf kann kurz dauern. Running bedeutet: die Messung läuft noch — kein fertiges Urteil.“ | Running |
| 01:55 | StatLede Passed/Failed/Skipped | „Oben sehen wir die Bilanz: bestanden, fehlgeschlagen, übersprungen.“ | Passed · Failed · Skipped |
| 02:20 | Findings-Liste / Dossier | „Darunter die Findings. Jeder Eintrag bezieht sich auf eine Regel der Guideline — nicht auf ein Ranking-Versprechen.“ | Findings |
| 02:50 | Studio-Link oder Guidelines CTA | „Wenn Tokens fehlen, führt der Banner zurück in die Guideline. Der nächste sinnvolle Schritt ist: Guideline aktiv setzen.“ | Als Nächstes: Activate |

## Erwarteter Endzustand

- Guideline ausgewählt
- Evidence als PDF erkannt
- Mindestens ein Run in History oder aktueller Findings-Ansicht
- StatLede mit Zahlen ≥ 0
- Keine Behauptung „Marke ist compliant“, wenn Failed > 0 — ehrlich interpretieren

## Wahrheitsstatus

| Umgebung | Kennzeichnung |
|---|---|
| Staging mit echten Runs | **Live** oder **Demo** (kontrollierte Fixture-PDF) |
| Fixture-Adapter / vorgefertigte Findings ohne Upload | **Fixture** — im Sprechertext sagen |
| Detection Lab als eigener Hub | **Geplant / entfallen** — nicht zeigen |

## Fehlerpfade

| Situation | Erklärung |
|---|---|
| No guidelines yet | Zuerst Guideline anlegen (BRN-QS-02 / Create), dann zurück zu Analysis. |
| PDF missing / invalid | Andere Fixture laden; Dateigröße/Seitenlimit beachten. |
| Unmapped tokens Banner | Studio öffnen, Tokens/Rules prüfen, erneut Run evaluate. |
| Lab evidence geöffnet | Für dieses Tutorial wieder schließen — Primary-Pfad bleibt SoT. |

## Aufnahmeplan

- 16:9, mindestens 1440 × 900
- Listen und Kundennamen ausblenden oder Demo-Collection nutzen
- Original-Screenshot + Highlight-Variante für: Guideline-Picker, Upload, StatLede, Findings
- Vor Veröffentlichung Flow auf Staging erneut durchklicken

## Nächste Folge

**BRN-QS-02** — Guideline öffnen und aktivieren (Active Pack für die Collection).
