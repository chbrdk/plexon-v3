import { randomUUID } from 'crypto'
import type { UiBlock } from '@/lib/assistant/ui-blocks/types'
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate'
import { buildVideonMediaHref } from '@/lib/assistant/ui-blocks/product-links'

export type VideonMediaGetPayload = {
  media?: {
    id?: string
    originalFilename?: string | null
    lifecycleState?: string | null
    durationMs?: number | null
  } | null
  analysis?: {
    id?: string
    status?: string | null
  } | null
  sceneCount?: number
  href?: string | null
  platformProjectId?: string | null
}

export type VideonAnalysisGetPayload = {
  platformProjectId?: string
  items?: Array<{
    id?: string
    status?: string | null
    mediaAssetId?: string | null
    stages?: Array<{
      stageKey?: string
      status?: string | null
      errorMessage?: string | null
    }>
  }>
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Parse MCP tool text/JSON into a media_get payload. */
export function parseVideonMediaGetPayload(raw: string): VideonMediaGetPayload | null {
  const text = raw.trim()
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as unknown
    const row = asObject(parsed)
    if (!row) return null
    if (!('media' in row) && !('analysis' in row) && !('sceneCount' in row) && !('href' in row)) {
      return null
    }
    return row as VideonMediaGetPayload
  } catch {
    return null
  }
}

/** Parse MCP tool text/JSON into an analysis_get payload. */
export function parseVideonAnalysisGetPayload(raw: string): VideonAnalysisGetPayload | null {
  const text = raw.trim()
  if (!text) return null
  try {
    const parsed = JSON.parse(text) as unknown
    const row = asObject(parsed)
    if (!row || !Array.isArray(row.items)) return null
    return row as VideonAnalysisGetPayload
  } catch {
    return null
  }
}

export function isVideonMediaGetToolName(name: string): boolean {
  const n = name.replace(/\./g, '_')
  return n === 'videon_media_get'
}

export function isVideonAnalysisGetToolName(name: string): boolean {
  const n = name.replace(/\./g, '_')
  return n === 'videon_analysis_get'
}

function mapStageStatus(
  status: string | null | undefined,
): 'pending' | 'running' | 'done' | 'failed' | 'skipped' {
  const s = (status ?? '').toLowerCase()
  if (s === 'done' || s === 'succeeded' || s === 'complete' || s === 'completed' || s === 'ready') {
    return 'done'
  }
  if (s === 'running' || s === 'processing' || s === 'in_progress') return 'running'
  if (s === 'failed' || s === 'error') return 'failed'
  if (s === 'skipped') return 'skipped'
  return 'pending'
}

/**
 * Build video_status_card from VIDEON MCP media_get payload.
 */
export function buildVideonMediaGetBlocks(
  payload: VideonMediaGetPayload,
  meta?: UiBlock['meta'],
): UiBlock[] {
  const media = payload.media
  const mediaAssetId =
    (typeof media?.id === 'string' ? media.id.trim() : '') ||
    (typeof (payload as { mediaAssetId?: string }).mediaAssetId === 'string'
      ? (payload as { mediaAssetId?: string }).mediaAssetId!.trim()
      : '')
  let platformProjectId =
    typeof payload.platformProjectId === 'string' ? payload.platformProjectId.trim() : ''
  const relativeHref = typeof payload.href === 'string' ? payload.href.trim() : ''
  if (!platformProjectId && relativeHref) {
    try {
      const u = new URL(relativeHref, 'https://videon.local')
      platformProjectId = u.searchParams.get('platformProjectId')?.trim() ?? ''
    } catch {
      /* ignore */
    }
  }
  const href = relativeHref ? buildVideonMediaHref(relativeHref) : null

  const rows: Array<{ label: string; value: string }> = []
  const filename =
    typeof media?.originalFilename === 'string' && media.originalFilename.trim()
      ? media.originalFilename.trim()
      : mediaAssetId || '—'
  rows.push({ label: 'Datei', value: filename.slice(0, 500) })
  if (media?.lifecycleState) {
    rows.push({ label: 'Lifecycle', value: String(media.lifecycleState).slice(0, 256) })
  }
  if (payload.analysis?.status) {
    rows.push({ label: 'Analyse', value: String(payload.analysis.status).slice(0, 256) })
  } else {
    rows.push({ label: 'Analyse', value: 'keine' })
  }
  if (typeof payload.sceneCount === 'number' && Number.isFinite(payload.sceneCount)) {
    rows.push({ label: 'Szenen', value: String(payload.sceneCount) })
  }
  if (typeof media?.durationMs === 'number' && Number.isFinite(media.durationMs)) {
    const sec = Math.round(media.durationMs / 1000)
    rows.push({ label: 'Dauer', value: `${sec}s` })
  }

  const steps: Array<{
    id: string
    label: string
    status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  }> = [
    {
      id: 'lifecycle',
      label: 'Lifecycle',
      status: mapStageStatus(media?.lifecycleState === 'ready' ? 'done' : media?.lifecycleState),
    },
    {
      id: 'analysis',
      label: 'Analyse',
      status: mapStageStatus(payload.analysis?.status),
    },
  ]

  const created = createUiBlock(
    'video_status_card',
    {
      title: filename.slice(0, 256),
      ...(mediaAssetId ? { mediaAssetId: mediaAssetId.slice(0, 256) } : {}),
      ...(platformProjectId ? { platformProjectId: platformProjectId.slice(0, 256) } : {}),
      ...(href ? { href } : {}),
      rows: rows.slice(0, 12),
      steps,
    },
    randomUUID(),
    meta,
  )
  return created.ok ? [created.block] : []
}

/**
 * Build video_status_card from VIDEON MCP analysis_get payload.
 */
export function buildVideonAnalysisGetBlocks(
  payload: VideonAnalysisGetPayload,
  meta?: UiBlock['meta'],
): UiBlock[] {
  const items = Array.isArray(payload.items) ? payload.items : []
  if (items.length === 0) return []

  const platformProjectId =
    typeof payload.platformProjectId === 'string' ? payload.platformProjectId.trim() : ''
  const first = items[0]
  const mediaAssetId =
    typeof first?.mediaAssetId === 'string' ? first.mediaAssetId.trim() : ''
  const runStatus = first?.status ?? null
  const stages = Array.isArray(first?.stages) ? first.stages : []

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Läufe', value: String(items.length) },
    { label: 'Status', value: String(runStatus ?? '—').slice(0, 256) },
  ]
  if (mediaAssetId) rows.push({ label: 'Media', value: mediaAssetId.slice(0, 256) })
  if (first?.id) rows.push({ label: 'Run', value: String(first.id).slice(0, 256) })

  const steps = stages.slice(0, 12).map((stage, index) => {
    const key = typeof stage.stageKey === 'string' && stage.stageKey.trim() ? stage.stageKey.trim() : `stage-${index}`
    return {
      id: key.slice(0, 256),
      label: key.slice(0, 256),
      status: mapStageStatus(stage.status),
    }
  })

  let href: string | null = null
  if (mediaAssetId && platformProjectId) {
    href = buildVideonMediaHref(
      `/media/${encodeURIComponent(mediaAssetId)}?platformProjectId=${encodeURIComponent(platformProjectId)}`,
    )
  }

  const created = createUiBlock(
    'video_status_card',
    {
      title: 'Analyse-Status',
      ...(mediaAssetId ? { mediaAssetId: mediaAssetId.slice(0, 256) } : {}),
      ...(platformProjectId ? { platformProjectId: platformProjectId.slice(0, 256) } : {}),
      ...(href ? { href } : {}),
      rows: rows.slice(0, 12),
      ...(steps.length ? { steps } : {}),
    },
    randomUUID(),
    meta,
  )
  return created.ok ? [created.block] : []
}
