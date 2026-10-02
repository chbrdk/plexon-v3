/**
 * Auto UI after MAGCLOUD boards / summarize / slides / ingest / conflicts.
 * Spec: assistant-magcloud-mcp.md
 */

import { randomUUID } from 'crypto';
import { getMagcloudUrl } from '@/lib/constants';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_LIMITS } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

type ToolMeta = {
  source: 'plexon_ui';
  toolCallId: string;
};

function magcloudBase(): string {
  return getMagcloudUrl()?.replace(/\/+$/, '') ?? '';
}

export function buildMagcloudBoardHref(boardName: string): string | null {
  const name = boardName.trim();
  if (!name) return null;
  const path = `/boards?boardId=${encodeURIComponent(name)}`;
  const base = magcloudBase();
  return base ? `${base}${path}` : path;
}

function normTool(name: string): string {
  return name.replace(/\./g, '_').toLowerCase();
}

export function isMagcloudBoardsListToolName(name: string): boolean {
  return normTool(name) === 'magcloud_boards_list';
}

export function isMagcloudBoardSummarizeToolName(name: string): boolean {
  return normTool(name) === 'magcloud_board_summarize';
}

export function isMagcloudSlidesSearchToolName(name: string): boolean {
  return normTool(name) === 'magcloud_slides_search';
}

export function isMagcloudIngestJobsListToolName(name: string): boolean {
  return normTool(name) === 'magcloud_ingest_jobs_list';
}

export function isMagcloudIngestJobGetToolName(name: string): boolean {
  return normTool(name) === 'magcloud_ingest_job_get';
}

export function isMagcloudIngestStartToolName(name: string): boolean {
  return normTool(name) === 'magcloud_ingest_start';
}

export function isMagcloudMetaConflictsListToolName(name: string): boolean {
  return normTool(name) === 'magcloud_meta_conflicts_list';
}

export function isMagcloudMetaConflictResolveToolName(name: string): boolean {
  return normTool(name) === 'magcloud_meta_conflict_resolve';
}

export type MagcloudBoardListItem = {
  name: string;
  painPoints?: number;
  modified?: string;
};

export type MagcloudBoardSummary = {
  name: string;
  slideCount: number;
  noteCount: number;
  metaConflicts: number;
  sharePointBound?: boolean;
  noteLabels?: string[];
};

export type MagcloudSlideHit = {
  title?: string;
  summary?: string;
  score?: number;
  slideSrc?: string;
  deckId?: string;
  boardId?: string;
};

export type MagcloudIngestJob = {
  jobId: string;
  status?: string;
  stage?: string;
  boardName?: string;
  error?: string | null;
  result?: {
    slideCount?: number;
    noteCount?: number;
    sync?: { conflicts?: number; mode?: string };
  } | null;
};

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function parseMagcloudBoardsListPayload(text: string): MagcloudBoardListItem[] | null {
  const raw = parseJson(text) as { boards?: unknown; error?: unknown } | null;
  if (!raw || typeof raw !== 'object' || raw.error) return null;
  if (!Array.isArray(raw.boards)) return null;
  const items: MagcloudBoardListItem[] = [];
  for (const row of raw.boards) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (!name) continue;
    items.push({
      name,
      painPoints: typeof r.painPoints === 'number' ? r.painPoints : undefined,
      modified: typeof r.modified === 'string' ? r.modified : undefined,
    });
  }
  return items;
}

export function parseMagcloudBoardSummarizePayload(text: string): MagcloudBoardSummary | null {
  const raw = parseJson(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object' || raw.error) return null;
  const name =
    (typeof raw.name === 'string' && raw.name.trim()) ||
    (typeof raw.deckId === 'string' && raw.deckId.trim()) ||
    '';
  if (!name) return null;
  return {
    name,
    slideCount: typeof raw.slideCount === 'number' ? raw.slideCount : 0,
    noteCount: typeof raw.noteCount === 'number' ? raw.noteCount : 0,
    metaConflicts: typeof raw.metaConflicts === 'number' ? raw.metaConflicts : 0,
    sharePointBound: Boolean(raw.sharePointBound),
    noteLabels: Array.isArray(raw.noteLabels)
      ? raw.noteLabels.filter((x): x is string => typeof x === 'string')
      : undefined,
  };
}

export function parseMagcloudSlidesSearchPayload(text: string): MagcloudSlideHit[] | null {
  const raw = parseJson(text) as { hits?: unknown; error?: unknown } | null;
  if (!raw || typeof raw !== 'object' || raw.error) return null;
  if (!Array.isArray(raw.hits)) return null;
  const hits: MagcloudSlideHit[] = [];
  for (const row of raw.hits) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    hits.push({
      title: typeof r.title === 'string' ? r.title : undefined,
      summary: typeof r.summary === 'string' ? r.summary : undefined,
      score: typeof r.score === 'number' ? r.score : undefined,
      slideSrc: typeof r.slideSrc === 'string' ? r.slideSrc : undefined,
      deckId: typeof r.deckId === 'string' ? r.deckId : undefined,
      boardId: typeof r.boardId === 'string' ? r.boardId : undefined,
    });
  }
  return hits;
}

export function parseMagcloudIngestJobsListPayload(text: string): MagcloudIngestJob[] | null {
  const raw = parseJson(text) as { jobs?: unknown; error?: unknown } | null;
  if (!raw || typeof raw !== 'object' || raw.error) return null;
  if (!Array.isArray(raw.jobs)) return null;
  return raw.jobs
    .map((row) => parseMagcloudIngestJobRow(row))
    .filter((j): j is MagcloudIngestJob => Boolean(j));
}

export function parseMagcloudIngestJobGetPayload(text: string): MagcloudIngestJob | null {
  const raw = parseJson(text);
  return parseMagcloudIngestJobRow(raw);
}

function parseMagcloudIngestJobRow(row: unknown): MagcloudIngestJob | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  if (r.error) return null;
  const jobId = typeof r.jobId === 'string' ? r.jobId.trim() : '';
  if (!jobId) return null;
  return {
    jobId,
    status: typeof r.status === 'string' ? r.status : undefined,
    stage: typeof r.stage === 'string' ? r.stage : undefined,
    boardName: typeof r.boardName === 'string' ? r.boardName : undefined,
    error: typeof r.error === 'string' ? r.error : null,
    result:
      r.result && typeof r.result === 'object'
        ? (r.result as MagcloudIngestJob['result'])
        : null,
  };
}

export function parseMagcloudMetaConflictsPayload(
  text: string,
): { boardName: string; conflicts: Array<Record<string, unknown>> } | null {
  const raw = parseJson(text) as {
    boardName?: unknown;
    conflicts?: unknown;
    error?: unknown;
  } | null;
  if (!raw || typeof raw !== 'object' || raw.error) return null;
  const boardName = typeof raw.boardName === 'string' ? raw.boardName.trim() : '';
  if (!boardName || !Array.isArray(raw.conflicts)) return null;
  return {
    boardName,
    conflicts: raw.conflicts.filter((c) => c && typeof c === 'object') as Array<
      Record<string, unknown>
    >,
  };
}

export function parseMagcloudMetaConflictResolvePayload(
  text: string,
): { boardName: string; remaining: number; choice: string } | null {
  const raw = parseJson(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object' || raw.error) return null;
  const boardName = typeof raw.boardName === 'string' ? raw.boardName.trim() : '';
  if (!boardName) return null;
  return {
    boardName,
    remaining: typeof raw.remaining === 'number' ? raw.remaining : 0,
    choice: typeof raw.choice === 'string' ? raw.choice : 'new',
  };
}

export function buildMagcloudBoardsListBlocks(
  items: MagcloudBoardListItem[],
  meta: ToolMeta,
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const links = items.slice(0, UI_BLOCK_LIMITS.maxLinks).map((b) => {
    const href = buildMagcloudBoardHref(b.name) || `/boards?boardId=${encodeURIComponent(b.name)}`;
    const notes = typeof b.painPoints === 'number' ? ` · ${b.painPoints} Notes` : '';
    return {
      label: `${b.name}${notes}`.slice(0, 256),
      href,
      external: Boolean(magcloudBase()) as boolean,
    };
  });
  if (!links.length) return blocks;
  const block = createUiBlock(
    'link_list',
    { title: 'Magcloud Boards', links },
    randomUUID(),
    meta,
  );
  if (block.ok) blocks.push(block.block);
  return blocks;
}

export function buildMagcloudBoardSummarizeBlocks(
  summary: MagcloudBoardSummary,
  meta: ToolMeta,
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const metrics = [
    { label: 'Folien', value: summary.slideCount },
    { label: 'Notes', value: summary.noteCount },
    { label: 'Meta-Konflikte', value: summary.metaConflicts },
  ];
  const grid = createUiBlock(
    'metric_grid',
    {
      title: summary.name.slice(0, 256),
      items: metrics.slice(0, UI_BLOCK_LIMITS.maxMetrics),
    },
    randomUUID(),
    meta,
  );
  if (grid.ok) blocks.push(grid.block);

  const href = buildMagcloudBoardHref(summary.name);
  if (href) {
    const link = createUiBlock(
      'link_list',
      {
        title: 'Board öffnen',
        links: [
          {
            label: summary.name.slice(0, 256),
            href,
            external: Boolean(magcloudBase()),
          },
        ],
      },
      randomUUID(),
      meta,
    );
    if (link.ok) blocks.push(link.block);
  }
  return blocks;
}

export function buildMagcloudSlidesSearchBlocks(
  hits: MagcloudSlideHit[],
  meta: ToolMeta,
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const links = hits.slice(0, UI_BLOCK_LIMITS.maxLinks).map((h, i) => {
    const board = (h.boardId || h.deckId || '').trim();
    const href = board
      ? buildMagcloudBoardHref(board)!
      : magcloudBase()
        ? `${magcloudBase()}/boards`
        : '/boards';
    const score =
      typeof h.score === 'number' ? ` (${Math.round(h.score * 1000) / 1000})` : '';
    const label = `${h.title?.trim() || h.slideSrc || `Hit ${i + 1}`}${score}`.slice(0, 256);
    return { label, href, external: Boolean(magcloudBase()) };
  });
  if (!links.length) return blocks;
  const block = createUiBlock(
    'link_list',
    { title: 'Folien-Treffer', links },
    randomUUID(),
    meta,
  );
  if (block.ok) blocks.push(block.block);
  return blocks;
}

function jobStepStatus(
  status?: string,
): 'pending' | 'running' | 'done' | 'failed' {
  const s = (status || '').toLowerCase();
  if (s === 'ready' || s === 'done' || s === 'completed') return 'done';
  if (s === 'failed' || s === 'error') return 'failed';
  if (s === 'queued' || s === 'pending') return 'pending';
  return 'running';
}

export function buildMagcloudIngestJobsBlocks(
  jobs: MagcloudIngestJob[],
  meta: ToolMeta,
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const steps = jobs.slice(0, UI_BLOCK_LIMITS.maxSteps).map((j) => ({
    id: j.jobId.slice(0, 64),
    label: `${j.boardName || j.jobId} · ${j.status || 'unknown'}`.slice(0, 256),
    status: jobStepStatus(j.status),
    detail: j.stage || j.error || undefined,
  }));
  if (!steps.length) return blocks;
  const block = createUiBlock(
    'step_list',
    { title: 'Ingest Jobs', steps },
    randomUUID(),
    meta,
  );
  if (block.ok) blocks.push(block.block);
  return blocks;
}

export function buildMagcloudIngestJobGetBlocks(
  job: MagcloudIngestJob,
  meta: ToolMeta,
): UiBlock[] {
  const blocks = buildMagcloudIngestJobsBlocks([job], meta);
  const sync = job.result?.sync;
  const metrics: Array<{ label: string; value: number | string }> = [];
  if (typeof job.result?.slideCount === 'number') {
    metrics.push({ label: 'Folien', value: job.result.slideCount });
  }
  if (typeof job.result?.noteCount === 'number') {
    metrics.push({ label: 'Notes', value: job.result.noteCount });
  }
  if (typeof sync?.conflicts === 'number') {
    metrics.push({ label: 'Konflikte', value: sync.conflicts });
  }
  if (sync?.mode) metrics.push({ label: 'Sync', value: sync.mode });
  if (metrics.length) {
    const grid = createUiBlock(
      'metric_grid',
      { title: job.boardName || job.jobId, items: metrics.slice(0, UI_BLOCK_LIMITS.maxMetrics) },
      randomUUID(),
      meta,
    );
    if (grid.ok) blocks.push(grid.block);
  }
  return blocks;
}

export function buildMagcloudMetaConflictsBlocks(
  payload: { boardName: string; conflicts: Array<Record<string, unknown>> },
  meta: ToolMeta,
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const items = payload.conflicts.slice(0, UI_BLOCK_LIMITS.maxKeyValues).map((c, i) => {
    const title =
      (typeof c.title === 'string' && c.title) ||
      (typeof c.pptxSldId === 'string' && `sldId ${c.pptxSldId}`) ||
      `Konflikt ${i + 1}`;
    const folie =
      typeof c.folieIndex === 'number' ? `Folie ${c.folieIndex}` : '';
    return {
      label: String(title).slice(0, 128),
      value: folie || String(c.src || 'open').slice(0, 256),
    };
  });
  const block = createUiBlock(
    'key_value_list',
    {
      title: `Meta-Konflikte · ${payload.boardName}`.slice(0, 256),
      items:
        items.length > 0
          ? items
          : [{ label: 'Offen', value: '0' }],
    },
    randomUUID(),
    meta,
  );
  if (block.ok) blocks.push(block.block);
  return blocks;
}

export function buildMagcloudMetaConflictResolveBlocks(
  payload: { boardName: string; remaining: number; choice: string },
  meta: ToolMeta,
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const alert = createUiBlock(
    'alert',
    {
      title: 'Konflikt gelöst',
      message: `${payload.boardName}: choice=${payload.choice}, verbleibend=${payload.remaining}`,
      tone: 'success' as const,
    },
    randomUUID(),
    meta,
  );
  if (alert.ok) blocks.push(alert.block);
  return blocks;
}
