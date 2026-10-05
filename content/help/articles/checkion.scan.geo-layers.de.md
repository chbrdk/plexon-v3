# GEO-Schichten: Model memory vs Live search

CHECKION GEO nutzt **zwei getrennte Schichten**. Trefferquoten und Scores nicht vermischen.

| Schicht | Bedeutung |
|---------|-----------|
| **Model memory** | Was ein Modell ohne Browse bereits über die Marke „weiß“ (ungestützt) |
| **Live search** | Was erscheint, wenn das Modell live suchen darf |

## Model Memory starten (typischer erster GEO-Job)

1. Scan → **GEO** → nur **Model memory** aktivieren (Live Search aus für klare Layer-1-Lesung).
2. **URL** und/oder **Firmenname** eintragen (mindestens eines nötig).
3. Bestehende Collection zuordnen — keine versehentlichen neuen Capability-Datensätze.
4. **Queries** kuratieren: echte Nutzerfragen (Alternativen, Vergleiche), nicht nur den Markennamen. Suggest bewusst nutzen.
5. Nur Modelle belassen, die in dieser Umgebung verfügbar sind.
6. **Start GEO job** → unter **Jobs** auf **Completed** warten.
7. Overview lesen (Präsenz, Platzierung, Share of Voice), danach Query × Modell-Details.

## Praxis

- Jede Schicht getrennt ausführen und lesen; Share of Voice bezieht sich auf das Fragenset.
- Innerhalb einer Schicht über Zeit vergleichen; nie über Schichten mitteln.
- Live Search ist ein **eigener** Job, wenn webgestützte Sichtbarkeit nötig ist.

## Weiter

- [Einstieg](checkion.getting-started)
- [WCAG-Quick-Scan](checkion.scan.wcag-quick)
- [SEO-Crawl](checkion.scan.seo-crawl)
