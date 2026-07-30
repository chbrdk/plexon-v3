import { pathPlatformProjectDashboard } from '@/lib/constants';

export type ProjectCreatedFormatInput = {
  name: string;
  platformProjectId: string;
  dashboardPath?: string;
  syncResults?: Array<{
    productId: string;
    ok: boolean;
    externalProjectId?: string | null;
    error?: string;
  }>;
  startResearch?: boolean;
};

export function formatCheckionProjectCreatedMessage(input: {
  name: string;
  checkionProjectId: string;
  projectHref?: string;
  domain?: string | null;
}): string {
  const parts = [
    '## Projekt in CHECKION angelegt',
    '',
    `**${input.name}** wurde direkt in CHECKION erstellt.`,
    '',
    `Projekt-ID: \`${input.checkionProjectId}\``,
  ];
  if (input.domain) parts.push(`Domain: **${input.domain}**`);
  if (input.projectHref) parts.push('', `[In CHECKION öffnen](${input.projectHref})`);
  return parts.join('\n');
}

export function formatAudionProjectCreatedMessage(input: {
  name: string;
  audionProjectId: string;
  adminHref?: string;
}): string {
  const href = input.adminHref;
  const parts = [
    '## Projekt in AUDION angelegt',
    '',
    `**${input.name}** wurde direkt in AUDION erstellt.`,
    '',
    `Projekt-ID: \`${input.audionProjectId}\``,
  ];
  if (href) {
    parts.push('', `[In AUDION öffnen](${href})`);
  }
  return parts.join('\n');
}

export function formatProjectCreatedMessage(input: ProjectCreatedFormatInput): string {
  const dashboard =
    input.dashboardPath ?? pathPlatformProjectDashboard(input.platformProjectId);
  const syncLines =
    input.syncResults?.map((r) => {
      const icon = r.ok ? '✓' : '✗';
      const id = r.externalProjectId ? ` \`${r.externalProjectId}\`` : '';
      return `- **${r.productId}** ${icon}${id}`;
    }) ?? [];

  const parts = [
    `## Projekt angelegt`,
    '',
    `**${input.name}** wurde als Plattform-Projekt erstellt.`,
    '',
    `[Zum PLEXON-Dashboard](${dashboard})`,
  ];

  if (syncLines.length > 0) {
    parts.push('', '### Synchronisation', ...syncLines);
  }

  if (input.startResearch) {
    parts.push('', '_Research wurde parallel gestartet – Fortschritt siehst du unten._');
  }

  return parts.join('\n');
}

export function formatMissingProjectNameMessage(domain?: string | null): string {
  return [
    '## Projektname fehlt',
    '',
    'Wie soll das Projekt heißen?',
    domain ? `\nDomain **${domain}** habe ich bereits notiert.` : '\nOptional kannst du auch gleich eine Domain nennen.',
  ].join('\n');
}

export function formatMissingCompanyMessage(
  companies: Array<{ id: string; name: string }>
): string {
  return [
    '## Organisation wählen',
    '',
    'Du bist mehreren Organisationen zugeordnet. Für welche Organisation soll ich das Projekt anlegen?',
    '',
    ...companies.map((c) => `- **${c.name}**`),
  ].join('\n');
}
