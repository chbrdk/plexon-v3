/**
 * CampaignBrief (Enterprise E7).
 * Spec: suite-enterprise-program.md § E7
 */

import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  CAMPAIGN_BRIEF_STATUSES,
  collectionCampaignBriefs,
  type CampaignBriefStatus,
} from '@/lib/db/schema';

export type CampaignBriefPublic = {
  id: string;
  platformProjectId: string;
  title: string;
  status: CampaignBriefStatus;
  marketRef: string | null;
  personaRefs: string[];
  guidelineId: string | null;
  pageRefs: string[];
  sceneId: string | null;
  mediaRefs: string[];
  kpiRefs: string[];
  spirionRefs: string[];
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapBrief(row: typeof collectionCampaignBriefs.$inferSelect): CampaignBriefPublic {
  return {
    id: row.id,
    platformProjectId: row.platformProjectId,
    title: row.title,
    status: row.status as CampaignBriefStatus,
    marketRef: row.marketRef,
    personaRefs: row.personaRefs ?? [],
    guidelineId: row.guidelineId,
    pageRefs: row.pageRefs ?? [],
    sceneId: row.sceneId,
    mediaRefs: row.mediaRefs ?? [],
    kpiRefs: row.kpiRefs ?? [],
    spirionRefs: row.spirionRefs ?? [],
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function isCampaignBriefStatus(value: string): value is CampaignBriefStatus {
  return (CAMPAIGN_BRIEF_STATUSES as readonly string[]).includes(value);
}

export async function listCampaignBriefs(
  platformProjectId: string
): Promise<CampaignBriefPublic[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(collectionCampaignBriefs)
    .where(eq(collectionCampaignBriefs.platformProjectId, platformProjectId.trim()))
    .orderBy(desc(collectionCampaignBriefs.updatedAt));
  return rows.map(mapBrief);
}

export async function getCampaignBrief(
  platformProjectId: string,
  briefId: string
): Promise<CampaignBriefPublic | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collectionCampaignBriefs)
    .where(
      and(
        eq(collectionCampaignBriefs.platformProjectId, platformProjectId.trim()),
        eq(collectionCampaignBriefs.id, briefId.trim())
      )
    )
    .limit(1);
  return row ? mapBrief(row) : null;
}

export async function createCampaignBrief(input: {
  platformProjectId: string;
  title: string;
  createdByUserId: string;
  marketRef?: string | null;
  personaRefs?: string[];
  guidelineId?: string | null;
  pageRefs?: string[];
  sceneId?: string | null;
  mediaRefs?: string[];
  kpiRefs?: string[];
  spirionRefs?: string[];
  status?: CampaignBriefStatus;
}): Promise<CampaignBriefPublic> {
  const id = randomUUID();
  const now = new Date();
  const db = getDb();
  await db.insert(collectionCampaignBriefs).values({
    id,
    platformProjectId: input.platformProjectId.trim(),
    title: input.title.trim() || 'Kampagnenbrief',
    status: input.status ?? 'draft',
    marketRef: input.marketRef?.trim() || null,
    personaRefs: input.personaRefs ?? [],
    guidelineId: input.guidelineId?.trim() || null,
    pageRefs: input.pageRefs ?? [],
    sceneId: input.sceneId?.trim() || null,
    mediaRefs: input.mediaRefs ?? [],
    kpiRefs: input.kpiRefs ?? [],
    spirionRefs: input.spirionRefs ?? [],
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  });
  const brief = await getCampaignBrief(input.platformProjectId, id);
  if (!brief) throw new Error('Failed to load campaign brief after create');
  return brief;
}

export async function patchCampaignBrief(input: {
  platformProjectId: string;
  briefId: string;
  title?: string;
  status?: CampaignBriefStatus;
  marketRef?: string | null;
  personaRefs?: string[];
  guidelineId?: string | null;
  pageRefs?: string[];
  sceneId?: string | null;
  mediaRefs?: string[];
  kpiRefs?: string[];
  spirionRefs?: string[];
}): Promise<CampaignBriefPublic | null> {
  const current = await getCampaignBrief(input.platformProjectId, input.briefId);
  if (!current) return null;
  const db = getDb();
  await db
    .update(collectionCampaignBriefs)
    .set({
      title: input.title?.trim() || current.title,
      status: input.status ?? current.status,
      marketRef:
        input.marketRef !== undefined
          ? input.marketRef?.trim() || null
          : current.marketRef,
      personaRefs: input.personaRefs ?? current.personaRefs,
      guidelineId:
        input.guidelineId !== undefined
          ? input.guidelineId?.trim() || null
          : current.guidelineId,
      pageRefs: input.pageRefs ?? current.pageRefs,
      sceneId:
        input.sceneId !== undefined ? input.sceneId?.trim() || null : current.sceneId,
      mediaRefs: input.mediaRefs ?? current.mediaRefs,
      kpiRefs: input.kpiRefs ?? current.kpiRefs,
      spirionRefs: input.spirionRefs ?? current.spirionRefs,
      updatedAt: new Date(),
    })
    .where(eq(collectionCampaignBriefs.id, current.id));
  return getCampaignBrief(input.platformProjectId, input.briefId);
}
