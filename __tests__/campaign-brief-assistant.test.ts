import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import {
  handleCampaignBriefCreateIntent,
  handleCampaignBriefListIntent,
} from '@/lib/assistant/handlers/campaign-brief';
import type { AssistantHandlerContext } from '@/lib/assistant/handlers/context';
import {
  createCampaignBrief,
  listCampaignBriefs,
} from '@/lib/collection-campaign-brief';
import { recordSuiteAuditEvent } from '@/lib/suite-audit';

vi.mock('@/lib/collection-campaign-brief', () => ({
  listCampaignBriefs: vi.fn(),
  createCampaignBrief: vi.fn(),
}));

vi.mock('@/lib/suite-audit', () => ({
  recordSuiteAuditEvent: vi.fn(),
}));

const listCampaignBriefsMock = vi.mocked(listCampaignBriefs);
const createCampaignBriefMock = vi.mocked(createCampaignBrief);
const recordSuiteAuditEventMock = vi.mocked(recordSuiteAuditEvent);

function baseCtx(overrides?: Partial<AssistantHandlerContext>): AssistantHandlerContext {
  return {
    user: { id: 'user-1', role: 'user', email: 'u@test.com' },
    body: {},
    conversationId: 'conv-1',
    conversation: { id: 'conv-1', userId: 'user-1', platformProjectId: 'pp-1', title: 'T' },
    platformProjectId: 'pp-1',
    bindingIds: null,
    history: [],
    prompt: '',
    profile: { name: null, email: 'u@test.com' },
    resolvedName: () => undefined,
    resolvedDomain: () => undefined,
    ...overrides,
  };
}

describe('campaign brief assistant intent router', () => {
  it('routes list prompts (DE/EN)', () => {
    expect(routeAssistantIntent('Kampagnenbriefe auflisten').type).toBe('campaign_brief_list');
    expect(routeAssistantIntent('Zeige die Campaign Briefs').type).toBe('campaign_brief_list');
    expect(routeAssistantIntent('List campaign briefs').type).toBe('campaign_brief_list');
  });

  it('routes create prompts with optional title', () => {
    const intent = routeAssistantIntent('Lege Kampagnenbrief „Frühjahr 2026“ an');
    expect(intent.type).toBe('campaign_brief_create');
    if (intent.type === 'campaign_brief_create') {
      expect(intent.title).toBe('Frühjahr 2026');
    }
    expect(routeAssistantIntent('Brief anlegen').type).toBe('campaign_brief_create');
    expect(routeAssistantIntent('Create campaign brief titled Launch').type).toBe(
      'campaign_brief_create',
    );
  });

  it('defaults bare Kampagnenbrief mention to list', () => {
    expect(routeAssistantIntent('Kampagnenbrief').type).toBe('campaign_brief_list');
  });
});

describe('campaign brief assistant handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordSuiteAuditEventMock.mockResolvedValue({ ok: true, id: 'audit-1' });
  });

  it('list requires collection context', async () => {
    const result = await handleCampaignBriefListIntent(baseCtx({ platformProjectId: undefined }), {
      type: 'campaign_brief_list',
    });
    expect(result.assistantText).toMatch(/Collection wählen/);
    expect(listCampaignBriefsMock).not.toHaveBeenCalled();
  });

  it('list returns markdown table', async () => {
    listCampaignBriefsMock.mockResolvedValue([
      {
        id: 'brief-1',
        platformProjectId: 'pp-1',
        title: 'Launch Q1',
        status: 'draft',
        marketRef: null,
        personaRefs: [],
        guidelineId: null,
        pageRefs: [],
        sceneId: null,
        mediaRefs: [],
        kpiRefs: [],
        spirionRefs: [],
        createdByUserId: 'user-1',
        createdAt: '2026-09-25T10:00:00.000Z',
        updatedAt: '2026-09-25T12:00:00.000Z',
      },
    ]);

    const result = await handleCampaignBriefListIntent(baseCtx(), { type: 'campaign_brief_list' });
    expect(listCampaignBriefsMock).toHaveBeenCalledWith('pp-1');
    expect(result.assistantText).toContain('| Titel | Status |');
    expect(result.assistantText).toContain('Launch Q1');
    expect(result.assistantText).toContain('brief-1');
  });

  it('create uses default title and publishes audit', async () => {
    createCampaignBriefMock.mockResolvedValue({
      id: 'brief-new',
      platformProjectId: 'pp-1',
      title: 'Kampagnenbrief',
      status: 'draft',
      marketRef: null,
      personaRefs: [],
      guidelineId: null,
      pageRefs: [],
      sceneId: null,
      mediaRefs: [],
      kpiRefs: [],
      spirionRefs: [],
      createdByUserId: 'user-1',
      createdAt: '2026-09-25T10:00:00.000Z',
      updatedAt: '2026-09-25T10:00:00.000Z',
    });

    const result = await handleCampaignBriefCreateIntent(baseCtx(), { type: 'campaign_brief_create' });
    expect(createCampaignBriefMock).toHaveBeenCalledWith({
      platformProjectId: 'pp-1',
      title: 'Kampagnenbrief',
      createdByUserId: 'user-1',
      status: 'draft',
    });
    expect(recordSuiteAuditEventMock).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      platformProjectId: 'pp-1',
      productId: 'plexon',
      action: 'published',
      subjectRef: 'brief-new',
      meta: { kind: 'campaign_brief' },
    });
    expect(result.assistantText).toMatch(/angelegt/);
  });

  it('create uses intent title when provided', async () => {
    createCampaignBriefMock.mockResolvedValue({
      id: 'brief-2',
      platformProjectId: 'pp-1',
      title: 'Sommer',
      status: 'draft',
      marketRef: null,
      personaRefs: [],
      guidelineId: null,
      pageRefs: [],
      sceneId: null,
      mediaRefs: [],
      kpiRefs: [],
      spirionRefs: [],
      createdByUserId: 'user-1',
      createdAt: '2026-09-25T10:00:00.000Z',
      updatedAt: '2026-09-25T10:00:00.000Z',
    });

    await handleCampaignBriefCreateIntent(baseCtx(), {
      type: 'campaign_brief_create',
      title: 'Sommer',
    });
    expect(createCampaignBriefMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sommer' }),
    );
  });
});
