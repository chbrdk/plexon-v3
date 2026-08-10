'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, EmptyState, Text } from '@msqdx/ui';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  API_ASSISTANT_CONVERSATIONS,
  API_PLATFORM_ME_PROJECT_INSIGHTS,
  ASSISTANT_CONVERSATION_QUERY_PARAM,
  ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM,
  PATH_ASSISTANT,
  apiAssistantConversation,
  apiAssistantConversationMessages,
  apiAssistantConversationReportPins,
  pathAssistantChat,
} from '@/lib/constants';
import { isSyntheticInsightPlatformProjectId } from '@/lib/platform-me-project-insights-standalone';
import type { AssistantConversationSummary } from '@/lib/assistant/conversation-history';
import { postAssistantCompleteStream } from '@/lib/assistant/assistant-stream-client';
import { subscribeAssistantWorkflowStream } from '@/lib/assistant/workflow-stream-client';
import { applyWorkflowStepsToMessages } from '@/lib/assistant/workflow-ui-client';
import { AssistantMessageList, type AssistantChatMessage } from '@/components/assistant/AssistantMessageList';
import { AssistantConversationHistory } from '@/components/assistant/AssistantConversationHistory';
import {
  ProjectContextChip,
  type ProjectInsightOption,
} from '@/components/assistant/ProjectContextChip';
import {
  AgentActivityTrace,
  emptyAgentActivityTrace,
  type AgentActivityTraceState,
} from '@/components/assistant/AgentActivityTrace';
import type { PlannerMetadata } from '@/components/assistant/PlannerStepCard';
import type { UiBlock, UiPanelState } from '@/lib/assistant/ui-blocks/types';
import { isUiBlockType } from '@/lib/assistant/ui-blocks/validate';
import { getMessageUiPanel } from '@/lib/assistant/ui-blocks/parse-metadata';
import {
  mergeStreamingUiBlockUpdate,
  patchStreamingMessageMetadata,
} from '@/lib/assistant/streaming-ui-layout';
import { AssistantPanel } from '@/components/assistant-ui/AssistantPanel';
import { AssistantChatComposer } from '@/components/assistant/AssistantChatComposer';
import { ReportCollectionBar, type ReportPinItem } from '@/components/assistant/ReportCollectionBar';
import { pinKey } from '@/lib/assistant/reports/block-pin-label';
import { extractPendingProjectNameFromHistory } from '@/lib/assistant/conversation-context';
import { resolveConversationTargetUrl } from '@/lib/assistant/conversation-target-url';
import { postAssistantEmbedMessage } from '@/lib/assistant/embed-protocol';

const SUGGESTIONS = [
  'assistant.suggestCreateProject',
  'assistant.suggestProjectStatus',
  'assistant.suggestCapabilities',
  'assistant.suggestUiShowcase',
] as const;

export function AssistantChat({ presentation = 'expand' }: { presentation?: 'overlay' | 'expand' }) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectInsightOption[]>([]);
  const [platformProjectId, setPlatformProjectId] = useState<string | null>(null);
  const [agentTrace, setAgentTrace] = useState<AgentActivityTraceState>(emptyAgentActivityTrace);
  const [showActivityTrace, setShowActivityTrace] = useState(false);
  const [isStreamingText, setIsStreamingText] = useState(false);
  const [livePanel, setLivePanel] = useState<UiPanelState | null>(null);
  const [reportPins, setReportPins] = useState<ReportPinItem[]>([]);
  const streamingMessageIdRef = useRef<string | null>(null);
  const workflowStreamRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const urlConversationLoadedRef = useRef(false);

  const refreshConversations = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(API_ASSISTANT_CONVERSATIONS, { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: AssistantConversationSummary[] };
      setConversations(
        (data.items ?? []).map((row) => ({
          ...row,
          createdAt: String(row.createdAt),
          updatedAt: String(row.updatedAt),
        }))
      );
    } catch {
      /* ignore */
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 96;
  }, []);

  useEffect(() => {
    scrollToBottom(isStreamingText ? 'auto' : 'smooth');
  }, [messages, isStreamingText, showActivityTrace, scrollToBottom]);

  useEffect(() => {
    return () => {
      workflowStreamRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (presentation !== 'overlay') return
    if (typeof window === 'undefined' || window.parent === window) return
    let targetOrigin = ''
    try {
      if (document.referrer) targetOrigin = new URL(document.referrer).origin
    } catch {
      return
    }
    if (!targetOrigin) return
    postAssistantEmbedMessage(window.parent, targetOrigin, {
      type: 'assistant:ready',
      conversationId: conversationId ?? undefined,
    })
  }, [presentation, conversationId])

  useEffect(() => {
    if (presentation !== 'overlay' || !conversationId) return
    if (typeof window === 'undefined' || window.parent === window) return
    let targetOrigin = ''
    try {
      if (document.referrer) targetOrigin = new URL(document.referrer).origin
    } catch {
      return
    }
    if (!targetOrigin) return
    postAssistantEmbedMessage(window.parent, targetOrigin, {
      type: 'assistant:conversation',
      conversationId,
    })
  }, [presentation, conversationId])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_PLATFORM_ME_PROJECT_INSIGHTS, { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          projects?: Array<{
            platformProject: { id: string; name: string; domain?: string | null };
            openPlatformProject?: boolean;
          }>;
        };
        // Phase 2: assistant context is Collections only (never synthetic product-only cards).
        const items = (data.projects ?? [])
          .filter(
            (p) =>
              p.openPlatformProject !== false &&
              !isSyntheticInsightPlatformProjectId(p.platformProject.id)
          )
          .map((p) => ({
            platformProjectId: p.platformProject.id,
            name: p.platformProject.name,
            domain: p.platformProject.domain ?? null,
          }));
        setProjects(items);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get(ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM)?.trim();
    if (fromUrl) setPlatformProjectId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetch(apiAssistantConversationMessages(id), { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = (await res.json()) as { items: AssistantChatMessage[] };
    setMessages(data.items);
  }, []);

  const openConversation = useCallback(
    async (id: string, meta?: AssistantConversationSummary) => {
      if (loading) return;
      workflowStreamRef.current?.close();
      setConversationId(id);
      router.replace(pathAssistantChat(id), { scroll: false });
      setLivePanel(null);
      setAgentTrace(emptyAgentActivityTrace());
      setShowActivityTrace(false);

      if (meta) {
        setPlatformProjectId(meta.platformProjectId ?? null);
      } else {
        try {
          const res = await fetch(apiAssistantConversation(id), { credentials: 'same-origin' });
          if (res.ok) {
            const row = (await res.json()) as { platformProjectId?: string | null };
            setPlatformProjectId(row.platformProjectId ?? null);
          }
        } catch {
          /* ignore */
        }
      }

      await loadConversation(id);
    },
    [loadConversation, loading, router]
  );

  const startNewChat = useCallback(() => {
    if (loading) return;
    workflowStreamRef.current?.close();
    setConversationId(null);
    setMessages([]);
    setReportPins([]);
    setLivePanel(null);
    setInput('');
    setAgentTrace(emptyAgentActivityTrace());
    setShowActivityTrace(false);
    router.replace(PATH_ASSISTANT, { scroll: false });
    setHistoryMobileOpen(false);
  }, [loading, router]);

  const renameConversation = useCallback(async (id: string, title: string): Promise<boolean> => {
    try {
      const res = await fetch(apiAssistantConversation(id), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return false;
      const row = (await res.json()) as AssistantConversationSummary;
      setConversations((prev) =>
        prev
          .map((conversation) =>
            conversation.id === id
              ? {
                  ...conversation,
                  title: row.title,
                  updatedAt: String(row.updatedAt),
                }
              : conversation
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(apiAssistantConversation(id), {
          method: 'DELETE',
          credentials: 'same-origin',
        });
        if (!res.ok) return false;
        setConversations((prev) => prev.filter((conversation) => conversation.id !== id));
        if (conversationId === id) startNewChat();
        return true;
      } catch {
        return false;
      }
    },
    [conversationId, startNewChat]
  );

  useEffect(() => {
    if (urlConversationLoadedRef.current) return;
    const id = searchParams.get(ASSISTANT_CONVERSATION_QUERY_PARAM)?.trim();
    if (!id) {
      urlConversationLoadedRef.current = true;
      return;
    }
    urlConversationLoadedRef.current = true;
    void openConversation(id);
  }, [openConversation, searchParams]);

  const loadReportPins = useCallback(async (id: string) => {
    const res = await fetch(apiAssistantConversationReportPins(id), { credentials: 'same-origin' });
    if (!res.ok) {
      setReportPins([]);
      return;
    }
    const data = (await res.json()) as { items: ReportPinItem[] };
    setReportPins(data.items ?? []);
  }, []);

  const pinnedKeys = useMemo(
    () => new Set(reportPins.map((p) => pinKey(p.messageId, p.blockId))),
    [reportPins]
  );

  const toggleReportPin = useCallback(
    async (messageId: string, block: UiBlock) => {
      if (!conversationId) return;
      const key = pinKey(messageId, block.id);
      const existing = reportPins.find((p) => pinKey(p.messageId, p.blockId) === key);
      if (existing) {
        const res = await fetch(
          `${apiAssistantConversationReportPins(conversationId)}?pinId=${encodeURIComponent(existing.id)}`,
          { method: 'DELETE', credentials: 'same-origin' }
        );
        if (!res.ok) return;
        setReportPins((prev) => prev.filter((p) => p.id !== existing.id));
        return;
      }
      const res = await fetch(apiAssistantConversationReportPins(conversationId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, blockId: block.id }),
      });
      if (!res.ok) return;
      const pin = (await res.json()) as ReportPinItem;
      setReportPins((prev) => [...prev, pin]);
    },
    [conversationId, reportPins]
  );

  useEffect(() => {
    if (!conversationId) {
      setReportPins([]);
      return;
    }
    void loadReportPins(conversationId);
  }, [conversationId, loadReportPins]);

  useEffect(() => {
    const onGateComplete = () => {
      if (conversationId) void loadConversation(conversationId);
    };
    window.addEventListener('plexon:quick-check-gate-complete', onGateComplete);
    return () => window.removeEventListener('plexon:quick-check-gate-complete', onGateComplete);
  }, [conversationId, loadConversation]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    const res = await fetch(API_ASSISTANT_CONVERSATIONS, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformProjectId }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    const row = (await res.json()) as { id: string };
    setConversationId(row.id);
    router.replace(pathAssistantChat(row.id), { scroll: false });
    void refreshConversations();
    return row.id;
  }, [conversationId, platformProjectId, refreshConversations, router]);

  const watchWorkflow = useCallback((runId: string) => {
    workflowStreamRef.current?.close();
    workflowStreamRef.current = subscribeAssistantWorkflowStream(runId, {
      onWorkflow: (payload) => {
        if (!payload.steps?.length) return;
        setMessages((prev) => applyWorkflowStepsToMessages(prev, runId, payload.steps));
        scrollToBottom('auto');
      },
      onDone: () => {
        workflowStreamRef.current = null;
        if (conversationId) void loadConversation(conversationId);
      },
    });
  }, [conversationId, loadConversation, scrollToBottom]);

  const appendStreamingUiBlock = useCallback((block: UiBlock) => {
    setMessages((prev) => {
      let streamId = streamingMessageIdRef.current;
      if (!streamId) {
        streamId = `stream-${Date.now()}`;
        streamingMessageIdRef.current = streamId;
        return [
          ...prev,
          {
            id: streamId,
            role: 'assistant' as const,
            content: '',
            metadata: {
              contentType: 'ui_composed',
              streaming: true,
              uiLayout: { version: 1, blocks: [block] },
            },
          },
        ];
      }
      const existingMsg = prev.find((m) => m.id === streamId);
      if (!existingMsg) {
        return [
          ...prev,
          {
            id: streamId,
            role: 'assistant' as const,
            content: '',
            metadata: {
              contentType: 'ui_composed',
              streaming: true,
              uiLayout: { version: 1, blocks: [block] },
            },
          },
        ];
      }
      return prev.map((m) => {
        if (m.id !== streamId) return m;
        const existing = (m.metadata?.uiLayout as { blocks?: UiBlock[] } | undefined)?.blocks ?? [];
        return {
          ...m,
          metadata: {
            ...m.metadata,
            contentType: 'ui_composed',
            streaming: true,
            uiLayout: { version: 1, blocks: [...existing, block] },
          },
        };
      });
    });
  }, []);

  const updateStreamingUiBlock = useCallback((block: UiBlock, extraMetadata?: Record<string, unknown>) => {
    setMessages((prev) => {
      const streamId = streamingMessageIdRef.current;
      if (!streamId) return prev;
      return mergeStreamingUiBlockUpdate(prev, streamId, block, extraMetadata);
    });
  }, []);

  const clearStreamingUiBlocks = useCallback(() => {
    setMessages((prev) => {
      const streamId = streamingMessageIdRef.current;
      if (!streamId) return prev;
      return prev.map((m) =>
        m.id === streamId
          ? {
              ...m,
              metadata: {
                ...m.metadata,
                uiLayout: { version: 1, blocks: [] },
              },
            }
          : m
      );
    });
  }, []);

  const sendMessage = useCallback(
    async (text: string, confirmToolCall?: { toolName: string; input: Record<string, unknown> }) => {
      const trimmed = text.trim();
      if (!trimmed && !confirmToolCall) return;

      setLoading(true);
      setIsStreamingText(false);
      setShowActivityTrace(true);
      stickToBottomRef.current = true;
      setAgentTrace({ ...emptyAgentActivityTrace(), phase: 'planning' });
      setLivePanel(null);
      streamingMessageIdRef.current = null;
      try {
        const cid = await ensureConversation();

        if (trimmed) {
          setMessages((prev) => [
            ...prev,
            { id: `local-${Date.now()}`, role: 'user', content: trimmed },
          ]);
        }

        const streamMessageId = `stream-${Date.now()}`;
        streamingMessageIdRef.current = streamMessageId;

        const done = await postAssistantCompleteStream(
          {
            prompt: trimmed,
            conversationId: cid,
            platformProjectId,
            ...(confirmToolCall ? { confirmToolCall } : {}),
          },
          {
            onPhase: (phase, detail) => {
              setAgentTrace((prev) => ({ ...prev, phase, phaseDetail: detail ?? null }));
            },
            onPlan: (plan) => {
              setAgentTrace((prev) => ({
                ...prev,
                plan: plan as PlannerMetadata,
              }));
            },
            onRetrieval: (data) => {
              setAgentTrace((prev) => ({
                ...prev,
                retrievalHits: data.hits,
                retrievalVectorHits: data.vectorHits,
                retrievalTerms: data.terms,
              }));
            },
            onUiReset: () => {
              clearStreamingUiBlocks();
            },
            onUiBlock: (event) => {
              const type = event.block.type;
              if (!isUiBlockType(type)) return;
              appendStreamingUiBlock({
                id: event.block.id,
                type,
                props: event.block.props,
              });
              scrollToBottom('auto');
            },
            onUiBlockUpdate: (event) => {
              const type = event.block.type;
              if (!isUiBlockType(type)) return;
              updateStreamingUiBlock({
                id: event.block.id,
                type,
                props: event.block.props,
              });
              if (type === 'step_list') {
                setShowActivityTrace(false);
              }
              scrollToBottom('auto');
            },
            onWorkflowRun: (event) => {
              setMessages((prev) => {
                const streamId = streamingMessageIdRef.current;
                if (!streamId) return prev;
                return patchStreamingMessageMetadata(prev, streamId, {
                  workflowRunId: event.workflowRunId,
                  workflowType: event.workflowType,
                });
              });
              watchWorkflow(event.workflowRunId);
            },
            onUiPanel: (event) => {
              const blocks = event.panel.blocks
                .map((b) => {
                  if (!isUiBlockType(b.type)) return null;
                  return { id: b.id, type: b.type, props: b.props };
                })
                .filter((b): b is UiBlock => b != null);
              setLivePanel({
                open: event.panel.open,
                title: event.panel.title,
                blocks,
              });
            },
            onTokenReset: () => {
              const streamId = `stream-${Date.now()}`;
              streamingMessageIdRef.current = streamId;
              setMessages((prev) => prev.filter((m) => !(m.metadata as { streaming?: boolean })?.streaming));
            },
            onThinkingReset: () => {
              setAgentTrace((prev) => ({ ...prev, thinking: '', thinkingLive: true }));
            },
            onThinking: (chunk) => {
              setAgentTrace((prev) => ({
                ...prev,
                thinking: prev.thinking + chunk,
                thinkingLive: true,
              }));
            },
            onToolCall: (event) => {
              setAgentTrace((prev) => {
                if (event.status === 'start') {
                  return {
                    ...prev,
                    tools: [
                      ...prev.tools,
                      { id: `${event.name}-${Date.now()}`, name: event.name, status: 'running' },
                    ],
                  };
                }
                const tools = [...prev.tools];
                for (let i = tools.length - 1; i >= 0; i -= 1) {
                  if (tools[i].name === event.name && tools[i].status === 'running') {
                    tools[i] = { ...tools[i], status: 'done', preview: event.preview };
                    break;
                  }
                }
                return { ...prev, tools };
              });
            },
            onToken: (token) => {
              setShowActivityTrace(false);
              setIsStreamingText(true);
              setAgentTrace((prev) => ({
                ...prev,
                phase: 'executing',
                thinkingLive: false,
              }));
              setMessages((prev) => {
                const streamId = streamingMessageIdRef.current;
                if (!streamId) return prev;
                const existing = prev.find((m) => m.id === streamId);
                if (existing) {
                  return prev.map((m) =>
                    m.id === streamId ? { ...m, content: m.content + token } : m
                  );
                }
                return [
                  ...prev,
                  {
                    id: streamId,
                    role: 'assistant',
                    content: token,
                    metadata: { contentType: 'markdown', streaming: true },
                  },
                ];
              });
            },
            onDone: (payload) => {
              const panel = getMessageUiPanel(payload.metadata);
              setLivePanel(panel);
            },
          }
        );

        if (!done) throw new Error(t('common.error'));

        setConversationId(done.conversationId);
        router.replace(pathAssistantChat(done.conversationId), { scroll: false });
        streamingMessageIdRef.current = null;
        await loadConversation(done.conversationId);
        void refreshConversations();
        setLivePanel(getMessageUiPanel(done.metadata));

        if (done.workflowRunId) {
          watchWorkflow(done.workflowRunId);
        }
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: e instanceof Error ? e.message : t('common.error'),
          },
        ]);
      } finally {
        setLoading(false);
        setIsStreamingText(false);
        setShowActivityTrace(false);
        setAgentTrace((prev) => ({ ...prev, phase: 'done', thinkingLive: false }));
        streamingMessageIdRef.current = null;
        setInput('');
      }
    },
    [appendStreamingUiBlock, clearStreamingUiBlocks, ensureConversation, loadConversation, platformProjectId, refreshConversations, router, scrollToBottom, t, updateStreamingUiBlock, watchWorkflow]
  );

  const showEmpty = messages.length === 0 && !loading;

  const selectedProject = useMemo(
    () => projects.find((p) => p.platformProjectId === platformProjectId) ?? null,
    [projects, platformProjectId]
  );

  const conversationTargetUrl = useMemo(
    () =>
      resolveConversationTargetUrl({
        messages,
        draftPrompt: input,
        projectDomain: selectedProject?.domain,
      }),
    [messages, input, selectedProject?.domain]
  );

  const conversationProjectName = useMemo(() => {
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    return (
      selectedProject?.name ??
      extractPendingProjectNameFromHistory(history, input) ??
      undefined
    );
  }, [messages, input, selectedProject?.name]);

  return (
    <div
      className="plexon-assistant-workspace"
      data-plexon-assistant-chat
      data-presentation={presentation}
    >
      <section
        className={[
          'chat-panel',
          presentation === 'overlay' ? 'chat-panel-compact' : 'chat-panel-open',
          'plexon-assistant-panel',
        ].join(' ')}
        aria-label={t('nav.assistant')}
      >
        <header className="plexon-assistant-topbar">
          <AssistantConversationHistory
            conversations={conversations}
            activeConversationId={conversationId}
            loading={historyLoading}
            onSelect={(conversation) => void openConversation(conversation.id, conversation)}
            onNewChat={startNewChat}
            onRename={renameConversation}
            onDelete={deleteConversation}
          />
          <div className="plexon-assistant-topbar-project">
            <ProjectContextChip
              projects={projects}
              value={platformProjectId}
              onChange={setPlatformProjectId}
            />
          </div>
          {presentation === 'overlay' ? (
            <Button
              variant="subtle"
              size="sm"
              className="plexon-assistant-expand"
              onClick={() => {
                const href = conversationId
                  ? pathAssistantChat(conversationId)
                  : platformProjectId
                    ? `${PATH_ASSISTANT}?${ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM}=${encodeURIComponent(platformProjectId)}`
                    : PATH_ASSISTANT
                if (typeof window !== 'undefined' && window.parent !== window) {
                  let targetOrigin = '*'
                  try {
                    if (document.referrer) targetOrigin = new URL(document.referrer).origin
                  } catch {
                    /* keep * only as last resort — prefer referrer */
                  }
                  if (targetOrigin === '*') {
                    /* Host must listen; origin unknown in some embeds */
                  } else {
                    postAssistantEmbedMessage(window.parent, targetOrigin, {
                      type: 'assistant:expand',
                      conversationId: conversationId ?? undefined,
                      project: platformProjectId ?? undefined,
                    })
                  }
                }
                if (typeof window !== 'undefined' && window.parent === window) {
                  router.push(href)
                } else if (typeof window !== 'undefined') {
                  window.open(href, '_top')
                }
              }}
              disabled={loading}
            >
              {t('assistant.openWorkspace')}
            </Button>
          ) : null}
          <Button
            variant="subtle"
            size="sm"
            className="plexon-assistant-new-chat"
            onClick={startNewChat}
            disabled={loading}
          >
            {t('assistant.newConversation')}
          </Button>
        </header>

        <div
          ref={scrollRef}
          className={['chat-turns', showEmpty ? 'is-empty' : undefined].filter(Boolean).join(' ')}
          onScroll={handleScroll}
        >
          {showEmpty ? (
            <EmptyState className="chat-empty plexon-assistant-empty">
              <Text role="title" as="h2">
                {t('assistant.emptyTitle')}
              </Text>
              <Text role="body" as="p">
                {t('assistant.emptyHint')}
              </Text>
              <div className="plexon-assistant-prompts" data-plexon-assistant-prompts>
                {SUGGESTIONS.map((key) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    onClick={() => void sendMessage(t(key))}
                  >
                    {t(key)}
                  </Button>
                ))}
                {platformProjectId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void sendMessage(t('assistant.suggestProjectKnowledge'))}
                  >
                    {t('assistant.suggestProjectKnowledge')}
                  </Button>
                ) : null}
              </div>
            </EmptyState>
          ) : (
            <>
              {showActivityTrace ? (
                <div className="plexon-assistant-trace">
                  <AgentActivityTrace trace={agentTrace} active />
                </div>
              ) : null}
              <AssistantMessageList
                messages={messages}
                conversationId={conversationId}
                pinnedKeys={pinnedKeys}
                onPinToggle={(messageId, block) => void toggleReportPin(messageId, block)}
                followUpDisabled={loading}
                onFollowUp={(prompt) => void sendMessage(prompt)}
                projectDomain={selectedProject?.domain}
                onConfirmTool={(pending) =>
                  void sendMessage('', { toolName: pending.toolName, input: pending.input })
                }
              />
            </>
          )}
        </div>

        <AssistantChatComposer
          value={input}
          loading={loading}
          onChange={setInput}
          onSubmit={() => void sendMessage(input)}
          onSuggestion={(prompt) => {
            setInput(prompt);
            void sendMessage(prompt);
          }}
          targetUrl={conversationTargetUrl}
          projectName={conversationProjectName}
        />
        <ReportCollectionBar
          conversationId={conversationId}
          pins={reportPins}
          onPinsChange={setReportPins}
        />
      </section>
      {livePanel?.open && livePanel.blocks.length > 0 ? (
        <AssistantPanel
          title={livePanel.title}
          blocks={livePanel.blocks}
          onClose={() => setLivePanel(null)}
        />
      ) : null}
    </div>
  );
}
