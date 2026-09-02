/**
 * Generate Share report from Collection Flow pins (reuses Assistant report engine).
 * @see specs/domain/collection-flow-report-pins.md
 */

import { randomUUID } from 'crypto'
import { generateConversationReport } from '@/lib/assistant/reports/generate-conversation-report'
import type { GeneratedReportResult } from '@/lib/assistant/reports/types'
import { createAssistantConversation } from '@/lib/db/assistant-conversations'
import type { StoredFlowReportPin } from '@/lib/db/collection-flow-report-pins'
import type { StoredReportPin } from '@/lib/db/assistant-report-pins'
import { flowOutputSnapshotToUiBlock } from '@/lib/collection-flow-report-pins'

export async function generateFlowReport(input: {
  platformProjectId: string
  flowId: string
  flowName: string
  userId: string
  pins: StoredFlowReportPin[]
  titleHint?: string
  anthropicApiKey: string
}): Promise<GeneratedReportResult & { conversationId: string }> {
  const conversationId = randomUUID()
  await createAssistantConversation({
    id: conversationId,
    userId: input.userId,
    title: `Flow report · ${input.flowName}`.slice(0, 200),
    platformProjectId: input.platformProjectId,
  })

  const syntheticPins: StoredReportPin[] = input.pins.map((p, i) => ({
    id: p.id,
    conversationId,
    userId: input.userId,
    messageId: `flow-run:${p.historyRunId || 'latest'}`,
    blockId: p.nodeId,
    blockSnapshot: flowOutputSnapshotToUiBlock(p.outputSnapshot),
    sortOrder: p.sortOrder ?? i,
    createdAt: p.createdAt,
  }))

  const result = await generateConversationReport({
    conversationId,
    userId: input.userId,
    pins: syntheticPins,
    titleHint: input.titleHint,
    conversationTitle: input.flowName,
    anthropicApiKey: input.anthropicApiKey,
  })

  return { ...result, conversationId }
}
