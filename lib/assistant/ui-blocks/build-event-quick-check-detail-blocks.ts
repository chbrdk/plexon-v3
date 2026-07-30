import { randomUUID } from 'crypto';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import { listPersonasFromPreview } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import { pathCheckionDomainScan } from '@/lib/paths/checkion-api';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

type UiTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

function pushBlock(blocks: UiBlock[], block: ReturnType<typeof createUiBlock>): void {
  if (block.ok) blocks.push(block.block);
}

function scoreTone(score: number): UiTone {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
}

export function buildDomainScanDetailBlocks(scan: DomainScanPreview): UiBlock[] {
  const blocks: UiBlock[] = [];

  pushBlock(
    blocks,
    createUiBlock(
      'metric_grid',
      {
        title: 'Domain-Scan',
        items: [
          { label: 'Domain-Score', value: scan.score, unit: '/100', tone: scoreTone(scan.score) },
          { label: 'Seiten', value: scan.totalPages },
          { label: 'Fehler', value: scan.stats.errors, tone: scan.stats.errors > 0 ? 'error' : 'success' },
          {
            label: 'Warnungen',
            value: scan.stats.warnings,
            tone: scan.stats.warnings > 0 ? 'warning' : 'neutral',
          },
          { label: 'Hinweise', value: scan.stats.notices, tone: 'neutral' },
          { label: 'Issues gesamt', value: scan.stats.total, tone: 'neutral' },
        ],
      },
      randomUUID()
    )
  );

  if (scan.topIssues.length > 0) {
    pushBlock(
      blocks,
      createUiBlock(
        'data_table',
        {
          title: 'Top Issues (Domain-Scan)',
          columns: ['Issue', 'Betroffene Seiten'],
          rows: scan.topIssues.slice(0, 10).map((i) => [i.title, i.count]),
        },
        randomUUID()
      )
    );
  }

  pushBlock(
    blocks,
    createUiBlock(
      'key_value_list',
      {
        title: 'Scan-Details',
        items: [
          { label: 'Domain', value: scan.domain },
          { label: 'Status', value: scan.status },
          { label: 'Scan-ID', value: scan.id },
          ...(scan.seoPagesAnalyzed != null
            ? [{ label: 'SEO-Seiten analysiert', value: String(scan.seoPagesAnalyzed) }]
            : []),
        ],
      },
      randomUUID()
    )
  );

  pushBlock(
    blocks,
    createUiBlock(
      'link_list',
      {
        title: 'CHECKION',
        links: [
          {
            label: 'Deep Scan öffnen',
            href: pathCheckionDomainScan({ url: scan.url || `https://${scan.domain}`, scanId: scan.id }),
            external: true,
          },
        ],
      },
      randomUUID()
    )
  );

  return blocks;
}

export function buildPersonaDetailBlocks(preview: PersonaBootstrapPreview): UiBlock[] {
  const personas = listPersonasFromPreview(preview);
  return personas.flatMap((persona, index) =>
    buildSinglePersonaDetailBlocks(
      persona,
      personas.length > 1 ? `AUDION Persona ${index + 1}: ${persona.name}` : 'AUDION Persona'
    )
  );
}

function buildSinglePersonaDetailBlocks(
  persona: NonNullable<PersonaBootstrapPreview['persona']>,
  title: string
): UiBlock[] {
  const blocks: UiBlock[] = [];

  pushBlock(
    blocks,
    createUiBlock(
      'persona_card',
      {
        title,
        personas: [
          {
            id: persona.id,
            name: persona.name,
            segment: persona.segment,
            confidence: persona.confidence,
            headline: persona.headline,
          },
        ],
      },
      randomUUID()
    )
  );

  const profile = persona.profile;
  if (!profile) return blocks;

  if (profile.bio) {
    pushBlock(
      blocks,
      createUiBlock('text', { markdown: `**Bio:** ${profile.bio}` }, randomUUID())
    );
  }

  if (profile.traits.length > 0) {
    pushBlock(
      blocks,
      createUiBlock(
        'data_table',
        {
          title: 'Persona-Traits',
          columns: ['Trait', 'Score'],
          rows: profile.traits.map((t) => [
            t.name,
            t.score <= 1 ? `${Math.round(t.score * 100)}%` : t.score.toFixed(1),
          ]),
        },
        randomUUID()
      )
    );
  }

  if (profile.goals.length > 0) {
    pushBlock(
      blocks,
      createUiBlock(
        'finding_list',
        {
          title: 'Ziele der Persona',
          items: profile.goals.map((g) => ({
            title: g,
            description: 'Abgeleitet aus AUDION-Profil',
            severity: 'info' as const,
          })),
        },
        randomUUID()
      )
    );
  }

  if (profile.painPoints.length > 0) {
    pushBlock(
      blocks,
      createUiBlock(
        'finding_list',
        {
          title: 'Pain Points',
          items: profile.painPoints.map((p) => ({
            title: p,
            description: 'Abgeleitet aus AUDION-Profil',
            severity: 'warning' as const,
          })),
        },
        randomUUID()
      )
    );
  }

  if (profile.interests?.length) {
    pushBlock(
      blocks,
      createUiBlock(
        'key_value_list',
        {
          title: 'Interessen',
          items: profile.interests.map((interest, i) => ({
            label: `#${i + 1}`,
            value: interest,
          })),
        },
        randomUUID()
      )
    );
  }

  return blocks;
}

export function buildGeoDetailBlocks(job: GeoEeatJobPreview, geoQuestions?: string[]): UiBlock[] {
  const blocks: UiBlock[] = [];
  const metricItems: Array<{
    label: string;
    value: string | number;
    unit?: string;
    tone?: UiTone;
  }> = [];

  if (job.overallScore != null) {
    metricItems.push({
      label: 'GEO / Share of Voice',
      value: job.overallScore,
      unit: '/100',
      tone: scoreTone(job.overallScore),
    });
  }
  if (job.geoFitnessScore != null) {
    metricItems.push({
      label: 'GEO Fitness (On-Page)',
      value: job.geoFitnessScore,
      unit: '/100',
      tone: scoreTone(job.geoFitnessScore),
    });
  }

  if (metricItems.length > 0) {
    pushBlock(
      blocks,
      createUiBlock('metric_grid', { title: 'GEO Kennzahlen', items: metricItems }, randomUUID())
    );
  }

  const eeat = job.eeatScores;
  if (eeat) {
    const eeatRows: Array<[string, string]> = [];
    for (const key of ['trust', 'experience', 'expertise', 'authoritativeness'] as const) {
      const dim = eeat[key];
      if (!dim) continue;
      eeatRows.push([
        key.charAt(0).toUpperCase() + key.slice(1),
        `${dim.score}/5${dim.reasoning ? ` — ${dim.reasoning}` : ''}`,
      ]);
    }
    if (eeatRows.length > 0) {
      pushBlock(
        blocks,
        createUiBlock(
          'data_table',
          { title: 'E-E-A-T Bewertung', columns: ['Dimension', 'Score & Begründung'], rows: eeatRows },
          randomUUID()
        )
      );
    }
  }

  const competitors = job.competitors ?? [];
  if (competitors.length > 0) {
    pushBlock(
      blocks,
      createUiBlock(
        'data_table',
        {
          title: 'Wettbewerber (GEO Competitive)',
          columns: ['Domain', 'Score', 'Share of Voice', 'Ø Position', 'Erwähnungen'],
          rows: competitors.slice(0, 10).map((c) => [
            c.name,
            c.score != null ? c.score : '—',
            c.shareOfVoice != null ? `${Math.round(c.shareOfVoice * 100)}%` : '—',
            c.avgPosition != null ? c.avgPosition.toFixed(1) : '—',
            c.mentionCount ?? '—',
          ]),
        },
        randomUUID()
      )
    );

    const withScores = competitors.filter((c) => c.score != null);
    if (withScores.length >= 2) {
      pushBlock(
        blocks,
        createUiBlock(
          'chart',
          {
            title: 'GEO Score-Vergleich',
            chartType: 'bar',
            labels: withScores.slice(0, 8).map((c) => c.name.slice(0, 20)),
            datasets: [
              {
                label: 'Score',
                values: withScores.slice(0, 8).map((c) => c.score ?? 0),
              },
            ],
          },
          randomUUID()
        )
      );
    }
  }

  const citations = job.citationHighlights ?? [];
  if (citations.length > 0) {
    pushBlock(
      blocks,
      createUiBlock(
        'data_table',
        {
          title: 'Eigene Zitate in LLM-Antworten',
          columns: ['Suchanfrage', 'Domain', 'Position'],
          rows: citations.map((c) => [c.query, c.domain, c.position]),
        },
        randomUUID()
      )
    );
  }

  const queries = geoQuestions?.length ? geoQuestions : job.queries ?? [];
  if (queries.length > 0 && !geoQuestions?.length) {
    pushBlock(
      blocks,
      createUiBlock(
        'recommendation_list',
        {
          title: 'GEO-Suchanfragen (Competitive)',
          items: queries.map((q, i) => ({ title: `${i + 1}. ${q}` })),
        },
        randomUUID()
      )
    );
  }

  if (job.recommendations?.length) {
    pushBlock(
      blocks,
      createUiBlock(
        'recommendation_list',
        {
          title: 'GEO-Empfehlungen',
          items: job.recommendations.map((r) => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
          })),
        },
        randomUUID()
      )
    );
  }

  pushBlock(
    blocks,
    createUiBlock(
      'key_value_list',
      {
        title: 'GEO-Job',
        items: [
          { label: 'URL', value: job.url },
          { label: 'Status', value: job.status },
          { label: 'Job-ID', value: job.jobId },
          ...(job.competitiveOnly ? [{ label: 'Modus', value: 'Nur Competitive Benchmark' }] : []),
        ],
      },
      randomUUID()
    )
  );

  return blocks;
}

export function buildEventQuickCheckDetailBlocks(result: EventQuickCheckResult): UiBlock[] {
  const blocks: UiBlock[] = [];
  if (result.domainScan) {
    blocks.push(...buildDomainScanDetailBlocks(result.domainScan));
  }
  if (result.personaPreview) {
    blocks.push(...buildPersonaDetailBlocks(result.personaPreview));
  }
  if (result.geoJob) {
    blocks.push(...buildGeoDetailBlocks(result.geoJob, result.geoQuestions));
  }
  return blocks;
}
