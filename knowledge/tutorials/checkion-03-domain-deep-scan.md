# CHK-CORE-02 — Komplette Domain untersuchen

## Tutorial-Steckbrief

| Feld | Inhalt |
|---|---|
| Format | Kernworkflow |
| Zieldauer | 5–6 Minuten |
| Oberfläche | CHECKION `/scan` → WCAG → Deep scan |
| Lernziel | Einen Host crawlen und wiederkehrende Probleme über mehrere Seiten erkennen |
| Erfolg | Domain Overview und systemische Issues sind korrekt interpretiert |

## Voraussetzungen

- Die Domain darf automatisiert gecrawlt werden.
- Scope, Laufzeit und erwartete Seitenzahl sind für die Demo kontrollierbar.
- Die Collection ist ausgewählt.
- Es läuft nicht bereits ein gleichartiger Crawl für dieselbe Demo.

## Klickpfad

1. **Scan** öffnen.
2. **WCAG** wählen.
3. **Deep scan** wählen.
4. Unter **URL** einen sinnvollen Host-Einstiegspunkt eintragen.
5. Unter **Project** die Collection prüfen.
6. **Launch deep scan** wählen.
7. Unter **Jobs** Fortschritt, gescannte Seiten und aktuelle URL verfolgen.
8. Optional die verfügbaren Controls **Pause**, **Resume** oder **Cancel** erklären.
9. Bei **Completed** das Domain-Ergebnis öffnen.
10. Overview, systemische Issues und betroffene Seiten zeigen.

## Sprechertext und Bildschirmregie

| Zeit | Bildschirmregie | Sprechertext | Einblendung |
|---:|---|---|---|
| 00:00 | Scan-Startseite | „Ein Einzelscan zeigt, was auf einer Seite passiert. Deep scan zeigt, welche Probleme sich über einen ganzen Host wiederholen.“ | WCAG Deep scan |
| 00:18 | **WCAG** wählen | „Wir bleiben in der Accessibility-Capability.“ | Accessibility |
| 00:28 | **Deep scan** wählen | „Mit Deep scan folgt CHECKION den erreichbaren Seiten ab unserem Einstiegspunkt und baut daraus einen leichten Corpus.“ | Hostweiter Corpus |
| 00:52 | URL-Feld | „Wir verwenden einen kontrollierten Einstiegspunkt. Bei einer Unterseite kann der erreichbare Scope anders ausfallen als an der Host-Wurzel.“ | Einstiegspunkt bewusst wählen |
| 01:16 | Project-Auswahl | „Die Collection verbindet diesen Crawl mit früheren und späteren Prüfungen derselben Website.“ | Collection zuordnen |
| 01:34 | **Launch deep scan** | „Mit Launch deep scan startet ein asynchroner Crawl. Je nach Größe und Erreichbarkeit kann er deutlich länger dauern als ein Einzelscan.“ | Crawl gestartet |
| 01:56 | Jobs Center | „Im Job sehen wir den Fortschritt, die Anzahl bereits geprüfter Seiten und die aktuell bearbeitete URL.“ | Seitenfortschritt |
| 02:20 | Pause/Resume/Cancel, falls sichtbar | „Während eines laufenden Crawls können je nach Zustand Pause, Resume oder Cancel verfügbar sein. Ein Abbruch erzeugt kein vollständig abgeschlossenes Ergebnis.“ | Lauf kontrollieren |
| 02:48 | Domain Overview | „Das Domain Overview verdichtet den Corpus. Es zeigt nicht nur einzelne Findings, sondern ihre Verteilung über mehrere Seiten.“ | Domain Overview |
| 03:10 | Corpus signal und Scoreline | „Die Scoreline ordnet die schwächsten Dimensionen zuerst ein. Der Corpus signalisiert, wie konsistent oder uneinheitlich die Stichprobe ist.“ | Schwächste Dimension zuerst |
| 03:38 | Systemic issues | „Systemische Issues sind besonders wertvoll: Sie zeigen Regelgruppen und wie viele Seiten davon betroffen sind. Ein Problem auf zwanzig Seiten ist meist wichtiger als ein isolierter Einzelfall.“ | Systemisch vor isoliert |
| 04:10 | Issue öffnen und affected pages | „Öffnen wir eine Gruppe, sehen wir die betroffenen Seiten und können von dort in den jeweiligen Einzelscan wechseln.“ | Betroffene Seiten |
| 04:38 | Weitere Overview-Kapitel | „Zusätzlich fasst das Magazin Signale zu SEO, Performance, UX, Trust und weiteren verfügbaren Dimensionen zusammen. Fehlende Daten werden nicht als gute Werte interpretiert.“ | Verfügbare Signale lesen |
| 05:08 | Abschluss | „Damit kennen wir die wiederkehrenden Muster der Domain. In der nächsten Folge fokussieren wir speziell ihre SEO-Abdeckung.“ | Nächste Folge: SEO |

## Interpretationsregeln

- `pageCount` bezeichnet betroffene Seiten, nicht zwingend einzelne DOM-Vorkommen.
- Systemische Gruppen zuerst nach Schwere und Reichweite priorisieren.
- Ein unvollständiger oder unterbrochener Crawl darf nicht als vollständige Domainbewertung präsentiert werden.
- Fehlende Kapitel oder Daten sind kein positiver Befund.
- Von einer betroffenen Seite kann in den zugehörigen Single-Scan gewechselt werden.

## Fehlerpfade

| Situation | Reaktion |
|---|---|
| Crawl bleibt Running | Jobs prüfen; aktuelle URL und Fortschritt beobachten. |
| Crawl wurde durch Redeploy unterbrochen | Status Failed erklären und über Restart neu starten. |
| Sehr wenige Seiten | Robots, Navigation, Einstiegspunkt und technische Erreichbarkeit prüfen. |
| Unerwartet viele Seiten | Crawl abbrechen und Scope beziehungsweise Demo-Domain korrigieren. |
| Kapitel fehlt | Nicht als Nullwert interpretieren; Datengrundlage oder neuen Crawl prüfen. |

## QA vor Veröffentlichung

- [ ] Crawl-Freigabe für die Domain liegt vor.
- [ ] Deep scan ist sichtbar ausgewählt.
- [ ] Fortschritt wird über Jobs gezeigt.
- [ ] Das Ergebnis ist tatsächlich Completed.
- [ ] Systemische Issues werden als Seitenreichweite erklärt.
- [ ] Keine Aussage behauptet einen vollständigen Crawl, wenn er unterbrochen war.

