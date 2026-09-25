/**
 * Enterprise E7 — Kampagnenbrief Assistant intents.
 * Spec: specs/domain/suite-enterprise-program.md § E7
 */

import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { emitPhase, type IntentHandler } from '@/lib/assistant/handlers/context';
import {
  createCampaignBrief,
  listCampaignBriefs,
  type CampaignBriefPublic,
} from '@/lib/collection-campaign-brief';
import { recordSuiteAuditEvent } from '@/lib/suite-audit';

function markdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function formatBriefListMarkdown(briefs: CampaignBriefPublic[]): string {
  if (briefs.length === 0) {
    return '## Kampagnenbriefe\n\nKeine Kampagnenbriefe in dieser Collection.';
  }
  const rows = briefs.map(
    (b) =>
      `| ${markdownCell(b.title)} | ${b.status} | ${b.updatedAt.slice(0, 10)} | \`${b.id}\` |`,
  );
  return [
    '## Kampagnenbriefe',
    '',
    '| Titel | Status | Aktualisiert | ID |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

const COLLECTION_REQUIRED =
  '## Collection wählen\n\nBitte wähle eine Collection im Kontext-Dropdown, bevor ich Kampagnenbriefe anzeige oder anlege.';

export const handleCampaignBriefListIntent: IntentHandler<'campaign_brief_list'> = async (ctx) => {
  emitPhase(ctx.emit, 'workflow', 'campaign_brief_list');

  const platformProjectId = ctx.platformProjectId?.trim();
  if (!platformProjectId) {
    return {
      assistantText: COLLECTION_REQUIRED,
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const briefs = await listCampaignBriefs(platformProjectId);
  return {
    assistantText: formatBriefListMarkdown(briefs),
    metadata: {
      contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
      campaignBriefCount: briefs.length,
    },
  };
};

export const handleCampaignBriefCreateIntent: IntentHandler<'campaign_brief_create'> = async (
  ctx,
  intent,
) => {
  emitPhase(ctx.emit, 'workflow', 'campaign_brief_create');

  const platformProjectId = ctx.platformProjectId?.trim();
  if (!platformProjectId) {
    return {
      assistantText: COLLECTION_REQUIRED,
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const title = intent.title?.trim() || 'Kampagnenbrief';
  const brief = await createCampaignBrief({
    platformProjectId,
    title,
    createdByUserId: ctx.user.id,
    status: 'draft',
  });

  await recordSuiteAuditEvent({
    actorUserId: ctx.user.id,
    platformProjectId,
    productId: 'plexon',
    action: 'published',
    subjectRef: brief.id,
    meta: { kind: 'campaign_brief' },
  });

  const assistantText = [
    '## Kampagnenbrief angelegt',
    '',
    `- **Titel:** ${brief.title}`,
    `- **Status:** ${brief.status}`,
    `- **ID:** \`${brief.id}\``,
  ].join('\n');

  return {
    assistantText,
    metadata: {
      contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
      campaignBriefId: brief.id,
    },
  };
};
