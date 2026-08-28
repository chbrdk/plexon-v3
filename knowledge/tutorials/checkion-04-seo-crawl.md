# CHK-CORE-03 — SEO-Abdeckung einer Domain prüfen

## Tutorial-Steckbrief

| Feld | Inhalt |
|---|---|
| Format | Kernworkflow |
| Zieldauer | 5–6 Minuten |
| Oberfläche | CHECKION `/scan` → SEO |
| Lernziel | Einen SEO-fokussierten Host-Crawl starten und Coverage-Lücken einordnen |
| Erfolg | SEO Coverage im Domain-Magazin ist verständlich ausgewertet |

## Produktgrenze

SEO startet aktuell den vorhandenen Domain-Crawl und öffnet dessen Magazin mit einem SEO-Coverage-Kapitel. Es gibt noch keine separate, ausschließlich auf SEO beschränkte Pipeline. Der Sprechertext bezeichnet den Ablauf deshalb als **SEO-fokussierten Domain-Crawl**.

## Klickpfad

1. **Scan** öffnen.
2. **SEO** wählen.
3. Unter **URL** die Host-Wurzel oder den beabsichtigten Einstiegspunkt eintragen.
4. Unter **Project** die Collection prüfen.
5. **Launch SEO crawl** wählen.
6. Den Job über **Jobs** bis **Completed** verfolgen.
7. Das Domain Overview öffnen.
8. Das Kapitel **SEO coverage** sowie relevante Detailwerte prüfen.

## Sprechertext und Bildschirmregie

| Zeit | Bildschirmregie | Sprechertext | Einblendung |
|---:|---|---|---|
| 00:00 | Capability-Auswahl | „In dieser Folge prüfen wir, wie konsistent eine Domain für klassische Suche und technische Findability vorbereitet ist.“ | SEO Coverage |
| 00:16 | **SEO** wählen | „SEO startet einen hostweiten Crawl. Der Fokus liegt auf Titeln, Meta-Daten, Überschriften und der Abdeckung im Corpus.“ | Findability · SEO |
| 00:40 | URL eintragen | „Für eine Domainbewertung verwenden wir in der Regel die Host-Wurzel. Ein tieferer Einstiegspunkt kann den erreichbaren Corpus einschränken.“ | Host-Wurzel bevorzugen |
| 01:04 | Project prüfen | „Die richtige Collection sorgt dafür, dass wir SEO später mit Accessibility- und GEO-Ergebnissen derselben Website vergleichen können.“ | Gemeinsamer Collection-Kontext |
| 01:26 | **Launch SEO crawl** | „Launch SEO crawl stellt den Job in die Warteschlange. Auch hier warten wir auf Completed, bevor wir Schlüsse ziehen.“ | Crawl starten |
| 01:48 | Jobs Center | „Über Jobs beobachten wir Fortschritt und Status. Ein laufender oder unterbrochener Crawl ist noch keine vollständige SEO-Bewertung.“ | Status vor Interpretation |
| 02:18 | Domain Overview | „Das Ergebnis öffnet als Domain-Magazin. Neben SEO können weitere gemessene Dimensionen erscheinen, weil derselbe Corpus auch andere Qualitätsdaten trägt.“ | Gemeinsamer Domain-Corpus |
| 02:42 | SEO coverage | „SEO coverage zeigt, wie durchgängig zentrale Seitensignale vorhanden und plausibel sind.“ | Abdeckung statt Einzelwert |
| 03:02 | Title/Meta/Heading-Meter | „Wir betrachten Titel, Meta Descriptions und Überschriften nicht nur einzeln, sondern über alle gecrawlten Seiten. Lücken und auffällige Verteilungen sind wichtiger als ein einzelner perfekter Wert.“ | Konsistenz über Seiten |
| 03:36 | Structured data/robots/canonical, falls vorhanden | „Je nach Datengrundlage sehen wir außerdem Canonicals, Robots-, Sitemap- oder strukturierte Daten. Nur sichtbare Messwerte werden bewertet; fehlende Daten sind kein positives Signal.“ | Nur gemessene Daten bewerten |
| 04:08 | Page sample oder Detail | „Über die Seitenstichprobe und Detailansicht finden wir konkrete URLs, die das Gesamtbild verursachen.“ | Vom Muster zur URL |
| 04:36 | Priorisierung | „Zuerst beheben wir wiederkehrende Lücken mit großer Seitenreichweite – beispielsweise fehlende Titel oder inkonsistente Hauptüberschriften.“ | Reichweite × Relevanz |
| 05:02 | Abschluss | „Damit ist die klassische Findability eingeordnet. Als Nächstes messen wir, ob die Marke bereits in ungestützten Modellantworten auftaucht.“ | Nächste Folge: GEO |

## Interpretationsregeln

- Coverage beschreibt Konsistenz im Corpus, nicht automatisch Ranking-Erfolg.
- Sichtbare Techniksignale sind keine Garantie für gute Inhalte.
- Einzelne perfekte Seiten gleichen systematische Lücken nicht aus.
- Weitere Domain-Kapitel sind Kontext, obwohl der Launch über SEO erfolgte.
- Nicht gemessene Werte werden nicht als bestanden bezeichnet.

## Fehlerpfade

| Situation | Reaktion |
|---|---|
| SEO-Kapitel ist leer | Crawl-Datengrundlage prüfen und gegebenenfalls neu ausführen. |
| Wenige Seiten gefunden | Einstiegspunkt, interne Navigation und Robots prüfen. |
| Crawl nicht Completed | Keine abschließende Coverage-Aussage treffen. |
| Fixture-Daten | Im Begleittext deutlich als Demo-Ergebnis kennzeichnen. |

## QA vor Veröffentlichung

- [ ] SEO ist als Capability ausgewählt.
- [ ] CTA lautet aktuell **Launch SEO crawl**.
- [ ] Tutorial behauptet keine separate SEO-only Pipeline.
- [ ] Domain-Corpus und SEO-Coverage werden getrennt erklärt.
- [ ] Keine Ranking-Garantie oder automatische Vollständigkeit wird suggeriert.

