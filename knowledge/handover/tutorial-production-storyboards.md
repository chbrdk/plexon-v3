# PLEXON Tutorialproduktion — Storyboards und Fortsetzungsplan

## Produktionsziel

Die Tutorials sollen nicht erklären, wo einzelne Buttons liegen. Jede Folge zeigt einen klaren fachlichen Gewinn, einen ehrlichen Systemzustand und den Platz der Capability in der Collection.

## Einheitliches Format

| Baustein | Vorgabe |
|---|---|
| Länge | Quick Start 2–5 Min.; Kernworkflow 8–15 Min.; Deep Dive 15–30 Min. |
| Einstieg | Ein Satz: Ergebnisversprechen und Zielgruppe. |
| Bildschirm | Echter, bereinigter Workspace; keine Kundendaten. |
| Sprechertext | Beschreibt Entscheidung und Interpretation, nicht nur Klicks. |
| Zustände | Queued, Running, Paused, Completed und Failed ehrlich zeigen, wenn sie auftreten. |
| Bilder | Original-Screenshot archivieren; eine separate, additive Highlight-Variante mit Nummern erzeugen. |
| Schluss | Nächster sinnvoller Schritt innerhalb derselben Collection. |

## Storyboard: CHECKION, die ersten fünf Folgen

| ID | Hook | Ablauf in Bildern | Kernaussage | Nächste Folge |
|---|---|---|---|---|
| CHK-QS-01 | „In drei Minuten steht der gemeinsame Prüfkontext.“ | Collection/Workspace öffnen → New scan → Capability-Synchronität zeigen | Ein Projekt ist eine Collection; CHECKION ist die Capability. | Einzelne Seite prüfen |
| CHK-QS-02 | „Wir prüfen eine wichtige Seite, bevor wir die ganze Domain crawlen.“ | WCAG → Quick single → URL/Collection → Launch → Jobs → Ergebnis | Ein Seitenscan liefert einen fokussierten Einstieg. | Muster im Corpus suchen |
| CHK-CORE-02 | „Ist das ein Einzelfehler oder ein Template-Problem?“ | WCAG → Deep scan → Start-URL → Launch → Corpus/Issues | Mehrseitenbefunde priorisieren. | Findability prüfen |
| CHK-CORE-03 | „Technik allein reicht nicht: Wie ist die Website als Corpus auffindbar?“ | SEO → Host/Collection → Crawl → Coverage lesen | SEO-Signale und Lücken, kein Ranking-Versprechen. | GEO-Fragen stellen |
| CHK-CORE-04 | „Was weiß ein Sprachmodell bereits über die Marke?“ | GEO → Model memory → URL/Name/Queries → Job → Ergebnis | Modellwissen und Live Search getrennt messen. | GEO Live Search Deep Dive |

Die vollständigen Sprechertexte liegen in `knowledge/tutorials/checkion-01-project-create.md` bis `checkion-05-geo-model-memory.md`.

## Vorhandener Artikel als Alternative zum Screencast

`knowledge/tutorials/articles/checkion-fuenf-pruefungen.md` ist die Lesefassung der fünf Einstiege. Er kann als Help-Center-Artikel, Landingpage-Ressource oder Video-Begleitartikel weiterentwickelt werden.

Die Screenshot-Familie liegt in `knowledge/tutorials/assets/checkion-article/`:

- `01-project-workspace[-highlight].png`
- `02-wcag-quick-single[-highlight].png`
- `03-wcag-deep-scan[-highlight].png`
- `04-seo-crawl[-highlight].png`
- `05-geo-model-memory.png`

Hinweis: Highlight-Bilder sind lediglich visuelle Erklärhilfen. Das unbearbeitete Original bleibt die Referenz; Bildbearbeitung darf keine UI-Inhalte verändern.

## Produktionsreihenfolge für die Suite

1. **CHECKION** — erste fünf Folgen sind geplant und textlich ausgearbeitet.
2. **BRANDION** — Detection Lab, Guideline aktivieren, Tokens/Markenregeln, Evaluation.
3. **ECHON** — Tagespuls, Signal zu Wave, Recherchebriefing.
4. **CREATION** — Collection/Composition öffnen, einfache Landingpage, Canvas und Scene Board.
5. **AUDION** — erst nach überprüftem Demo-/API-Zustand: Easy Setup, Persona, Zielgruppe, Journey, Study.
6. **Suite Journeys** — erst nach den stabilen Einzel-App-Flows: ECHON→AUDION, AUDION→CHECKION, BRANDION→CREATION sowie Event Quick Check.

## Aufnahmecheckliste

1. Zielumgebung und Login prüfen.
2. Eine freigegebene Demo-Collection mit bereinigten Daten öffnen.
3. Ausgangs- und Ergebniszustand definieren; Fixture gegebenenfalls sichtbar kennzeichnen.
4. Flow vollständig einmal ohne Aufnahme durchlaufen.
5. Bildschirm aufnehmen; danach die benötigten Standbilder exportieren.
6. Pro Bild eine Highlight-Version erzeugen, ohne Text, Werte oder UI zu verändern.
7. Sprechertext gegen die tatsächliche Oberfläche abgleichen.
8. Link, Video, Artikel und CTA gegeneinander testen.

## Qualitätsgates vor Veröffentlichung

- Ist der sichtbare Flow auf der Zielumgebung wirklich erreichbar?
- Erklärt das Tutorial Collection und Capability korrekt?
- Sind Live, Demo, Fixture und Geplant eindeutig bezeichnet?
- Sind Jobstatus und Ergebnisinterpretation wahrheitsgetreu?
- Ist die nächste Handlung für Zuschauer:innen klar?

