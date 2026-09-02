/**
 * Collection Flow report pins (Wave 26).
 * @see specs/domain/collection-flow-report-pins.md
 */

import { and, asc, eq } from 'drizzle-orm'
import { getDb } from './index'
import { collectionFlowReportPins } from './schema'

export type FlowOutputSnapshot = {
  nodeId: string
  kind: string
  label: string
  text: string
  imageUrl?: string | null
  historyRunId?: string | null
}

export type StoredFlowReportPin = {
  id: string
  platformProjectId: string
  flowId: string
  userId: string
  historyRunId: string | null
  nodeId: string
  outputSnapshot: FlowOutputSnapshot
  sortOrder: number
  createdAt: Date
}

function normalizeHistoryRunId(value: string | null | undefined): string {
  return value?.trim() || ''
}

function mapRow(row: typeof collectionFlowReportPins.$inferSelect): StoredFlowReportPin {
  return {
    id: row.id,
    platformProjectId: row.platformProjectId,
    flowId: row.flowId,
    userId: row.userId,
    historyRunId: row.historyRunId?.trim() ? row.historyRunId : null,
    nodeId: row.nodeId,
    outputSnapshot: row.outputSnapshot as FlowOutputSnapshot,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }
}

export async function listFlowReportPins(input: {
  flowId: string
  userId: string
}): Promise<StoredFlowReportPin[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(collectionFlowReportPins)
    .where(
      and(
        eq(collectionFlowReportPins.flowId, input.flowId),
        eq(collectionFlowReportPins.userId, input.userId),
      ),
    )
    .orderBy(asc(collectionFlowReportPins.sortOrder), asc(collectionFlowReportPins.createdAt))
  return rows.map(mapRow)
}

export async function getFlowReportPinById(id: string): Promise<StoredFlowReportPin | null> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(collectionFlowReportPins)
    .where(eq(collectionFlowReportPins.id, id))
    .limit(1)
  return row ? mapRow(row) : null
}

export async function nextFlowReportPinSortOrder(flowId: string, userId: string): Promise<number> {
  const pins = await listFlowReportPins({ flowId, userId })
  if (pins.length === 0) return 0
  return Math.max(...pins.map((p) => p.sortOrder)) + 1
}

export async function createFlowReportPin(input: {
  id: string
  platformProjectId: string
  flowId: string
  userId: string
  historyRunId?: string | null
  nodeId: string
  outputSnapshot: FlowOutputSnapshot
  sortOrder: number
}): Promise<StoredFlowReportPin> {
  const db = getDb()
  const historyRunId = normalizeHistoryRunId(input.historyRunId)
  await db.insert(collectionFlowReportPins).values({
    id: input.id,
    platformProjectId: input.platformProjectId,
    flowId: input.flowId,
    userId: input.userId,
    historyRunId,
    nodeId: input.nodeId,
    outputSnapshot: input.outputSnapshot as Record<string, unknown>,
    sortOrder: input.sortOrder,
  })
  const row = await getFlowReportPinById(input.id)
  if (!row) throw new Error('Failed to create flow report pin')
  return row
}

export async function findFlowReportPin(input: {
  flowId: string
  userId: string
  nodeId: string
  historyRunId?: string | null
}): Promise<StoredFlowReportPin | null> {
  const pins = await listFlowReportPins(input)
  const hr = normalizeHistoryRunId(input.historyRunId)
  return (
    pins.find(
      (p) => p.nodeId === input.nodeId && normalizeHistoryRunId(p.historyRunId) === hr,
    ) ?? null
  )
}

export async function deleteFlowReportPin(id: string): Promise<void> {
  const db = getDb()
  await db.delete(collectionFlowReportPins).where(eq(collectionFlowReportPins.id, id))
}
