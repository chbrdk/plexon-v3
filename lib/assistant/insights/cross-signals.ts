import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import type { PageSpeedPreview, ScanResultPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import type { PlaybookRunResult } from '@/lib/assistant/playbooks/runner';
import type { LaunchReadinessResult } from '@/lib/assistant/playbooks/run-launch-readiness';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import type { SslCheckPreview } from '@/lib/integrations/checkion-tools-ssl-client';
import type { ReadabilityCheckPreview } from '@/lib/integrations/checkion-tools-readability-client';
import type { CrossBenchmarks, CrossSignal, WorkflowInsightSource } from '@/lib/assistant/insights/types';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { UiTone } from '@/lib/assistant/ui-blocks/types';

function scoreTone(score: number): UiTone {
  if (score >= 85) return 'success';
  if (score >= 65) return 'warning';
  return 'error';
}

function avgCompetitorScore(job: GeoEeatJobPreview): number | null {
  const scores = (job.competitors ?? [])
    .map((c) => c.score)
    .filter((s): s is number => typeof s === 'number' && !Number.isNaN(s));
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function topCompetitor(job: GeoEeatJobPreview): { name: string; score: number } | null {
  let best: { name: string; score: number } | null = null;
  for (const c of job.competitors ?? []) {
    if (c.score == null || Number.isNaN(c.score)) continue;
    if (!best || c.score > best.score) best = { name: c.name, score: c.score };
  }
  return best;
}

function overlapTokens(a: string[], b: string[]): string[] {
  const norm = (s: string) => s.toLowerCase().trim();
  const setB = new Set(b.map(norm));
  return a.map(norm).filter((t) => t.length > 2 && setB.has(t));
}

function extractKeywordTokens(projectContext: string | null | undefined): string[] {
  if (!projectContext) return [];
  const lines = projectContext.split('\n');
  const tokens: string[] = [];
  for (const line of lines) {
    if (!/keyword|geo-quer|seo/i.test(line)) continue;
    const part = line.split(':').slice(1).join(':');
    for (const chunk of part.split(/[;,]/)) {
      const t = chunk.trim();
      if (t) tokens.push(t);
    }
  }
  return tokens.slice(0, 30);
}

export function buildGeoCrossSignals(
  job: GeoEeatJobPreview,
  benchmarks?: CrossBenchmarks,
  projectContext?: string | null
): CrossSignal[] {
  const signals: CrossSignal[] = [];
  const score = job.overallScore;

  if (score != null) {
    signals.push({
      id: 'geo-overall',
      category: 'GEO',
      severity: scoreTone(score),
      title: 'GEO Gesamt-Score',
      fact: `E-E-A-T/GEO-Gesamtscore: ${score}/100 für ${job.url}.`,
    });
  }

  const avg = avgCompetitorScore(job);
  if (score != null && avg != null) {
    const gap = score - avg;
    signals.push({
      id: 'geo-vs-market',
      category: 'Wettbewerb',
      severity: gap >= 0 ? 'success' : gap >= -10 ? 'warning' : 'error',
      title: 'Abstand zum Wettbewerbs-Schnitt',
      fact: `Eigener Score ${score} vs. Wettbewerber-Schnitt ${avg} (Delta ${gap >= 0 ? '+' : ''}${gap}).`,
    });
  }

  const leader = topCompetitor(job);
  if (score != null && leader) {
    const gap = score - leader.score;
    signals.push({
      id: 'geo-vs-leader',
      category: 'Wettbewerb',
      severity: gap >= 0 ? 'success' : gap >= -15 ? 'warning' : 'error',
      title: 'Abstand zum stärksten Wettbewerber',
      fact: `${leader.name} führt mit ${leader.score}/100; eigener Abstand: ${gap >= 0 ? '+' : ''}${gap} Punkte.`,
    });
  }

  const geoKw = (job.keywords ?? []).slice(0, 20);
  if (geoKw.length > 0) {
    signals.push({
      id: 'geo-keywords',
      category: 'GEO',
      severity: geoKw.length >= 5 ? 'info' : 'warning',
      title: 'Keyword-Abdeckung',
      fact: `${geoKw.length} GEO-relevante Keywords erkannt (Auszug: ${geoKw.slice(0, 5).join(', ')}).`,
    });
  }

  const researchKw = extractKeywordTokens(projectContext);
  if (geoKw.length > 0 && researchKw.length > 0) {
    const overlap = overlapTokens(geoKw, researchKw);
    signals.push({
      id: 'geo-research-overlap',
      category: 'Quervergleich',
      severity: overlap.length > 0 ? 'success' : 'warning',
      title: 'GEO ↔ Projekt-Research',
      fact:
        overlap.length > 0
          ? `${overlap.length} Überschneidungen zwischen GEO-Keywords und Research/SEO-Kontext: ${overlap.slice(0, 5).join(', ')}.`
          : 'Keine klare Überschneidung zwischen GEO-Keywords und vorhandenem Research-Kontext — mögliche Lücke in der Content-Strategie.',
    });
  }

  const psi = benchmarks?.pageSpeed;
  if (psi && score != null) {
    const seoGap = psi.seo - score;
    signals.push({
      id: 'geo-psi-seo',
      category: 'Quervergleich',
      severity: Math.abs(seoGap) <= 15 ? 'info' : seoGap > 15 ? 'warning' : 'error',
      title: 'GEO vs. PageSpeed SEO',
      fact: `PageSpeed SEO ${psi.seo}/100 vs. GEO ${score}/100 (Delta SEO−GEO: ${seoGap >= 0 ? '+' : ''}${seoGap}).`,
    });
    signals.push({
      id: 'geo-psi-a11y',
      category: 'Quervergleich',
      severity: scoreTone(psi.accessibility),
      title: 'Technische UX vs. GEO',
      fact: `PageSpeed Accessibility ${psi.accessibility}/100 — schwache UX kann indirekt Trust-Signale und Conversion beeinflussen.`,
    });
  }

  return signals;
}

export function buildScanCrossSignals(
  scan: ScanResultPreview,
  benchmarks?: CrossBenchmarks
): CrossSignal[] {
  const signals: CrossSignal[] = [];
  signals.push({
    id: 'scan-score',
    category: 'Accessibility',
    severity: scoreTone(scan.score),
    title: 'WCAG-Scan Score',
    fact: `Accessibility-Score ${scan.score}/100 mit ${scan.stats.errors} Fehlern und ${scan.stats.warnings} Warnungen.`,
  });

  if (scan.stats.errors > 0) {
    signals.push({
      id: 'scan-errors',
      category: 'Accessibility',
      severity: 'error',
      title: 'Kritische Barrieren',
      fact: `${scan.stats.errors} Fehler — priorisierte Behebung empfohlen (Top-Regeln in der Tabelle).`,
    });
  }

  const psi = benchmarks?.pageSpeed;
  if (psi) {
    const a11yGap = psi.accessibility - scan.score;
    signals.push({
      id: 'scan-psi-a11y',
      category: 'Quervergleich',
      severity: Math.abs(a11yGap) <= 12 ? 'info' : 'warning',
      title: 'WCAG-Scan vs. PageSpeed A11y',
      fact: `Lighthouse Accessibility ${psi.accessibility}/100 vs. WCAG-Scan ${scan.score}/100 (Delta ${a11yGap >= 0 ? '+' : ''}${a11yGap}). Abweichungen sind normal, große Gaps deuten auf unterschiedliche Prüftiefen hin.`,
    });
    if (psi.performance < 70 && scan.score < 80) {
      signals.push({
        id: 'scan-perf-a11y',
        category: 'Quervergleich',
        severity: 'warning',
        title: 'Performance + Accessibility',
        fact: `Performance ${psi.performance}/100 und A11y ${scan.score}/100 — kombinierte UX-Schwäche kann Bounce und Engagement drücken.`,
      });
    }
  }

  return signals;
}

export function buildPageSpeedCrossSignals(pageSpeed: PageSpeedPreview): CrossSignal[] {
  return [
    {
      id: 'psi-performance',
      category: 'Performance',
      severity: scoreTone(pageSpeed.performance),
      title: 'Performance',
      fact: `Lighthouse Performance ${pageSpeed.performance}/100 für ${pageSpeed.url}.`,
    },
    {
      id: 'psi-seo',
      category: 'SEO',
      severity: scoreTone(pageSpeed.seo),
      title: 'Technisches SEO (Lighthouse)',
      fact: `Lighthouse SEO ${pageSpeed.seo}/100 — technische Basis, nicht identisch mit GEO/E-E-A-T.`,
    },
    {
      id: 'psi-a11y',
      category: 'Accessibility',
      severity: scoreTone(pageSpeed.accessibility),
      title: 'Accessibility (Lighthouse)',
      fact: `Lighthouse Accessibility ${pageSpeed.accessibility}/100.`,
    },
    {
      id: 'psi-bp',
      category: 'Best Practices',
      severity: scoreTone(pageSpeed.bestPractices),
      title: 'Best Practices',
      fact: `Lighthouse Best Practices ${pageSpeed.bestPractices}/100.`,
    },
  ];
}

function playbookScoreFromOutcome(o: PlaybookRunResult['outcomes'][number]): number | null {
  if (o.status !== 'done' || !o.payload) return null;
  switch (o.payload.kind) {
    case 'pagespeed_check':
      return o.payload.data.performance;
    case 'quick_scan':
      return o.payload.data.score;
    case 'geo_analysis':
      return o.payload.data.overallScore ?? null;
    case 'ssl_check': {
      const g = o.payload.data.grade?.toUpperCase() ?? '';
      if (g.startsWith('A')) return 90;
      if (g.startsWith('B')) return 75;
      if (g.startsWith('C')) return 60;
      return 45;
    }
    default:
      return null;
  }
}

export function buildPlaybookCrossSignals(playbook: PlaybookRunResult): CrossSignal[] {
  const signals: CrossSignal[] = [];
  const done = playbook.outcomes.filter((o) => o.status === 'done');
  const failed = playbook.outcomes.filter((o) => o.status === 'error');

  signals.push({
    id: 'playbook-coverage',
    category: 'Audit',
    severity: failed.length > 0 ? 'warning' : 'success',
    title: 'Audit-Abdeckung',
    fact: `${done.length}/${playbook.outcomes.length} Schritte erfolgreich${failed.length ? `, ${failed.length} fehlgeschlagen` : ''}.`,
  });

  const scored = done
    .map((o) => ({ label: o.label, score: playbookScoreFromOutcome(o) }))
    .filter((x): x is { label: string; score: number } => x.score != null);

  if (scored.length >= 2) {
    const min = scored.reduce((a, b) => (b.score < a.score ? b : a));
    const max = scored.reduce((a, b) => (b.score > a.score ? b : a));
    signals.push({
      id: 'playbook-spread',
      category: 'Quervergleich',
      severity: max.score - min.score > 25 ? 'warning' : 'info',
      title: 'Score-Spread im Audit',
      fact: `Stärkster Bereich: ${max.label} (${max.score}). Schwächster: ${min.label} (${min.score}). Spread: ${max.score - min.score} Punkte.`,
    });
  }

  const geo = done.find((o) => o.payload?.kind === 'geo_analysis');
  const psi = done.find((o) => o.payload?.kind === 'pagespeed_check');
  if (
    geo?.payload?.kind === 'geo_analysis' &&
    psi?.payload?.kind === 'pagespeed_check' &&
    geo.payload.data.overallScore != null
  ) {
    const gap = psi.payload.data.seo - geo.payload.data.overallScore;
    signals.push({
      id: 'playbook-geo-seo',
      category: 'Quervergleich',
      severity: Math.abs(gap) <= 15 ? 'info' : 'warning',
      title: 'GEO vs. Lighthouse SEO',
      fact: `GEO ${geo.payload.data.overallScore}/100 vs. Lighthouse SEO ${psi.payload.data.seo}/100 im selben Audit.`,
    });
  }

  return signals;
}

function sslGradeTone(grade: string | null | undefined): UiTone {
  const g = (grade ?? '').toUpperCase();
  if (g.startsWith('A')) return 'success';
  if (g.startsWith('B')) return 'warning';
  return 'error';
}

export function buildDomainScanCrossSignals(
  scan: DomainScanPreview,
  benchmarks?: CrossBenchmarks
): CrossSignal[] {
  const signals: CrossSignal[] = [];
  signals.push({
    id: 'domain-score',
    category: 'Domain',
    severity: scoreTone(scan.score),
    title: 'Domain-Score',
    fact: `${scan.domain}: ${scan.totalPages} Seiten, Score ${scan.score}/100, ${scan.stats.errors} Fehler domain-weit.`,
  });

  if (scan.topIssues.length > 0) {
    const top = scan.topIssues[0];
    signals.push({
      id: 'domain-top-issue',
      category: 'Domain',
      severity: top.count > 3 ? 'error' : 'warning',
      title: 'Häufigstes Issue',
      fact: `„${top.title}" betrifft ${top.count} Seiten — systemisches Muster wahrscheinlich.`,
    });
  }

  const psi = benchmarks?.pageSpeed;
  if (psi) {
    signals.push({
      id: 'domain-psi',
      category: 'Quervergleich',
      severity: scoreTone(psi.performance),
      title: 'Domain vs. Startseite (PageSpeed)',
      fact: `Domain-Score ${scan.score}/100 bei Performance ${psi.performance}/100 und SEO ${psi.seo}/100 der Start-URL.`,
    });
  }

  return signals;
}

export function buildSslCrossSignals(ssl: SslCheckPreview): CrossSignal[] {
  const signals: CrossSignal[] = [];
  signals.push({
    id: 'ssl-grade',
    category: 'Security',
    severity: sslGradeTone(ssl.grade),
    title: 'TLS-Grade',
    fact: `SSL Labs: Grade ${ssl.grade ?? '—'} (${ssl.status}) für ${ssl.host}.`,
  });

  if (ssl.status === 'IN_PROGRESS') {
    signals.push({
      id: 'ssl-pending',
      category: 'Security',
      severity: 'warning',
      title: 'Analyse unvollständig',
      fact: 'SSL Labs liefert noch kein finales Ergebnis — erneute Prüfung empfohlen.',
    });
  }

  return signals;
}

export function buildReadabilityCrossSignals(
  data: ReadabilityCheckPreview,
  benchmarks?: CrossBenchmarks
): CrossSignal[] {
  const signals: CrossSignal[] = [];
  const hard = data.score > 11;
  signals.push({
    id: hard ? 'readability-hard' : 'readability-ok',
    category: 'Content',
    severity: hard ? 'warning' : data.score > 9 ? 'info' : 'success',
    title: 'Lesbarkeits-Stufe',
    fact: `Grade Level ${data.score} (${data.grade}) — ${data.stats.words} Wörter, ${data.stats.sentences} Sätze.`,
  });

  if (data.stats.words > 0 && data.stats.sentences > 0) {
    const avgWords = Math.round(data.stats.words / Math.max(data.stats.sentences, 1));
    signals.push({
      id: 'readability-sentence-length',
      category: 'Content',
      severity: avgWords > 22 ? 'warning' : 'info',
      title: 'Satzlänge',
      fact: `Ø ${avgWords} Wörter pro Satz${avgWords > 22 ? ' — tendenziell zu lang für Web-Zielgruppen' : ''}.`,
    });
  }

  const psi = benchmarks?.pageSpeed;
  if (psi) {
    signals.push({
      id: 'readability-psi-seo',
      category: 'Quervergleich',
      severity: 'info',
      title: 'Content vs. technisches SEO',
      fact: `Lesbarkeit Stufe ${data.score} bei Lighthouse SEO ${psi.seo}/100 — Inhalt und Technik getrennt bewerten.`,
    });
  }

  return signals;
}

export function buildLaunchReadinessCrossSignals(launch: LaunchReadinessResult): CrossSignal[] {
  const signals: CrossSignal[] = [];
  const done = launch.outcomes.filter((o) => o.status === 'done');
  const failed = launch.outcomes.filter((o) => o.status === 'error');

  signals.push({
    id: 'launch-steps',
    category: 'Onboarding',
    severity: failed.length > 0 ? 'warning' : 'success',
    title: 'Launch-Schritte',
    fact: `${done.length}/${launch.outcomes.length} Onboarding-Schritte abgeschlossen für ${launch.projectName} (${launch.url}).`,
  });

  const psi = done.find((o) => o.payload?.kind === 'pagespeed_check');
  const scan = done.find((o) => o.payload?.kind === 'quick_scan');
  if (psi?.payload?.kind === 'pagespeed_check' && scan?.payload?.kind === 'quick_scan') {
    signals.push({
      id: 'launch-psi-scan',
      category: 'Quervergleich',
      severity: 'info',
      title: 'Technik beim Launch',
      fact: `PageSpeed Performance ${psi.payload.data.performance}/100 vs. WCAG-Scan ${scan.payload.data.score}/100 in der Launch-Prüfung.`,
    });
  }

  if (launch.platformProjectId) {
    signals.push({
      id: 'launch-platform',
      category: 'Plattform',
      severity: 'success',
      title: 'PLEXON-Projekt',
      fact: `Plattformprojekt angelegt (ID ${launch.platformProjectId}) — CHECKION/AUDION-Sync und Research eingebunden.`,
    });
  }

  return signals;
}

export function buildEventQuickCheckCrossSignals(quick: EventQuickCheckResult): CrossSignal[] {
  const signals: CrossSignal[] = []

  if (quick.domainScan) {
    signals.push(...buildDomainScanCrossSignals(quick.domainScan).slice(0, 3))
  }

  if (quick.geoJob) {
    signals.push(...buildGeoCrossSignals(quick.geoJob).slice(0, 5))

    const eeat = quick.geoJob.eeatScores
    if (eeat) {
      const dims = (
        [
          ['Trust', eeat.trust?.score],
          ['Experience', eeat.experience?.score],
          ['Expertise', eeat.expertise?.score],
          ['Authoritativeness', eeat.authoritativeness?.score],
        ] as const
      ).filter((d): d is [string, number] => typeof d[1] === 'number' && !Number.isNaN(d[1]))
      if (dims.length > 0) {
        const sorted = [...dims].sort((a, b) => a[1] - b[1])
        const weak = sorted[0]!
        const strong = sorted[sorted.length - 1]!
        signals.push({
          id: 'quick-eeat-spread',
          category: 'E-E-A-T',
          severity: weak[1] < 50 ? 'error' : weak[1] < 70 ? 'warning' : 'info',
          title: 'E-E-A-T-Schwachstelle',
          fact: `Schwächste Dimension ${weak[0]} (${weak[1]}/100), stärkste ${strong[0]} (${strong[1]}/100).`,
        })
      }
    }

    const missing = quick.geoJob.missingGeoElements?.filter(Boolean) ?? []
    if (missing.length > 0) {
      signals.push({
        id: 'quick-geo-gaps',
        category: 'GEO',
        severity: 'warning',
        title: 'Fehlende GEO-Elemente',
        fact: `On-Page-Lücken für generative Antworten: ${missing.slice(0, 5).join(', ')}.`,
      })
    }

    const withSov = (quick.geoJob.competitors ?? [])
      .map((c) => ({
        name: c.name,
        sov:
          typeof c.shareOfVoice === 'number' && !Number.isNaN(c.shareOfVoice)
            ? c.shareOfVoice <= 1
              ? Math.round(c.shareOfVoice * 100)
              : Math.round(c.shareOfVoice)
            : null,
      }))
      .filter((c) => c.sov != null) as Array<{ name: string; sov: number }>
    if (withSov.length >= 2) {
      const ranked = [...withSov].sort((a, b) => b.sov - a.sov)
      const leader = ranked[0]!
      const ownGuess =
        ranked.find((c) => /du|own|self/i.test(c.name)) ??
        ranked.find((c) =>
          quick.geoJob?.url
            ? c.name.replace(/^www\./, '').includes(
                quick.geoJob.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ??
                  '',
              )
            : false,
        )
      if (ownGuess && leader.name !== ownGuess.name) {
        signals.push({
          id: 'quick-sov-gap',
          category: 'Wettbewerb',
          severity: ownGuess.sov + 15 < leader.sov ? 'error' : 'warning',
          title: 'Share-of-Voice-Abstand',
          fact: `${ownGuess.name} bei ${ownGuess.sov}% SoV vs. ${leader.name} bei ${leader.sov}% — Zitierstärke im Modell-Lauf.`,
        })
      } else if (!ownGuess) {
        signals.push({
          id: 'quick-sov-leader',
          category: 'Wettbewerb',
          severity: 'info',
          title: 'Share-of-Voice-Leader',
          fact: `${leader.name} führt mit ${leader.sov}% Share of Voice unter den gemessenen Domains.`,
        })
      }
    }
  }

  const persona = quick.personaPreview?.persona
  if (persona) {
    signals.push({
      id: 'quick-persona',
      category: 'Persona',
      severity: 'success',
      title: 'AUDION Persona',
      fact: `${persona.name} (${persona.segment}) — Confidence ${Math.round(persona.confidence * 100)}%.`,
      role: 'context',
    })
    const topTraits = persona.profile?.traits?.slice(0, 3) ?? []
    if (topTraits.length > 0) {
      signals.push({
        id: 'quick-persona-traits',
        category: 'Persona',
        severity: 'info',
        title: 'Top-Traits',
        fact: topTraits.map((t) => `${t.displayName || t.name} ${Math.round(t.score * 100)}%`).join(', '),
        role: 'context',
      })
    }
    const goals = persona.profile?.goals?.slice(0, 3) ?? []
    const pains = persona.profile?.painPoints?.slice(0, 3) ?? []
    if (goals.length || pains.length) {
      signals.push({
        id: 'quick-persona-needs',
        category: 'Persona',
        severity: 'info',
        title: 'Persona-Bedarf',
        fact: [
          goals.length ? `Ziele: ${goals.join('; ')}` : null,
          pains.length ? `Schmerzpunkte: ${pains.join('; ')}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        role: 'context',
      })
    }
  }

  if (quick.geoQuestions?.length) {
    signals.push({
      id: 'quick-geo-questions',
      category: 'GEO',
      severity: 'info',
      title: 'GEO-Fragen',
      fact: `${quick.geoQuestions.length} persona-bezogene Suchanfragen: „${quick.geoQuestions[0]?.slice(0, 80) ?? ''}"`,
      role: 'context',
    })
  }

  if (quick.domainScan && quick.geoJob?.overallScore != null) {
    const gap = quick.geoJob.overallScore - quick.domainScan.score
    signals.push({
      id: 'quick-domain-geo',
      category: 'Quervergleich',
      severity: Math.abs(gap) <= 15 ? 'info' : 'warning',
      title: 'Domain-Score vs. GEO',
      fact: `Domain ${quick.domainScan.score}/100 vs. GEO ${quick.geoJob.overallScore}/100 (Delta ${gap >= 0 ? '+' : ''}${gap}).`,
    })
  }

  return signals
}

export function buildWorkflowCrossSignals(
  source: WorkflowInsightSource,
  benchmarks?: CrossBenchmarks,
  projectContext?: string | null
): CrossSignal[] {
  switch (source.workflowType) {
    case 'geo_analysis':
      return buildGeoCrossSignals(source.job, benchmarks, projectContext);
    case 'quick_scan':
      return buildScanCrossSignals(source.scan, benchmarks);
    case 'pagespeed_check':
      return buildPageSpeedCrossSignals(source.pageSpeed);
    case 'domain_scan':
      return buildDomainScanCrossSignals(source.scan, benchmarks);
    case 'ssl_check':
      return buildSslCrossSignals(source.ssl);
    case 'readability_check':
      return buildReadabilityCrossSignals(source.readability, benchmarks);
    case 'website_audit':
      return buildPlaybookCrossSignals(source.playbook);
    case 'launch_readiness':
      return buildLaunchReadinessCrossSignals(source.launch);
    case 'event_quick_check':
      return buildEventQuickCheckCrossSignals(source.quick);
    default:
      return [];
  }
}
