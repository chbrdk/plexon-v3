import { randomUUID } from 'crypto';
import { buildReportLayout } from '@/lib/assistant/reports/build-report-layout';
import { generateReportNarrative } from '@/lib/assistant/reports/generate-report-narrative';
import { generateReportShareToken, hashReportShareToken } from '@/lib/assistant/reports/share-token';
import type { GeneratedReportResult } from '@/lib/assistant/reports/types';
import { createSharedReport } from '@/lib/db/assistant-shared-reports';
import type { StoredReportPin } from '@/lib/db/assistant-report-pins';
import { pathShareReport } from '@/lib/constants';

export async function generateConversationReport(input: {
  conversationId: string;
  userId: string;
  pins: StoredReportPin[];
  titleHint?: string;
  conversationTitle?: string | null;
  anthropicApiKey: string;
}): Promise<GeneratedReportResult> {
  const pinnedBlocks = input.pins.map((p) => p.blockSnapshot);
  const narrative = await generateReportNarrative({
    apiKey: input.anthropicApiKey,
    pinnedBlocks,
    titleHint: input.titleHint,
    conversationTitle: input.conversationTitle,
  });

  const uiLayout = buildReportLayout(narrative, pinnedBlocks);
  const shareToken = generateReportShareToken();
  const shareTokenHash = hashReportShareToken(shareToken);
  const reportId = randomUUID();

  await createSharedReport({
    id: reportId,
    conversationId: input.conversationId,
    userId: input.userId,
    title: narrative.title,
    uiLayout,
    narrative,
    shareTokenHash,
    isPublic: true,
  });

  return {
    reportId,
    title: narrative.title,
    uiLayout,
    narrative,
    shareToken,
    sharePath: pathShareReport(shareToken),
  };
}
