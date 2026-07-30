'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Collapse, Drawer, List, ListItemButton, Stack } from '@mui/material';
import { MsqdxInput, MsqdxTypography } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  AssistantSurfaceIconButton,
} from '@/components/assistant/AssistantSurfaceIconButton';
import {
  ASSISTANT_HISTORY_COLLAPSED_STORAGE_KEY,
  ASSISTANT_HISTORY_COLLAPSED_WIDTH_PX,
  ASSISTANT_HISTORY_EXPANDED_WIDTH_PX,
  ASSISTANT_HISTORY_TITLE_MAX_LINES,
  conversationDisplayTitle,
  filterConversationsByQuery,
  formatConversationUpdatedAt,
  type AssistantConversationSummary,
} from '@/lib/assistant/conversation-history';
import {
  plexonAssistantChatShellSx,
  plexonAssistantDrawerBackdropSx,
  plexonAssistantDrawerPaperSx,
  plexonLightCardSx,
  plexonLightInputSx,
} from '@/lib/plexon-surface-styles';
import { INPUT_ACCENT_SX } from '@/lib/theme-accent';

type AssistantConversationHistoryProps = {
  conversations: AssistantConversationSummary[];
  activeConversationId: string | null;
  loading: boolean;
  onSelect: (conversation: AssistantConversationSummary) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function readCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ASSISTANT_HISTORY_COLLAPSED_STORAGE_KEY) === '1';
}

export function AssistantHistoryMobileButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Box sx={{ display: { xs: 'flex', md: 'none' }, flexShrink: 0 }}>
      <AssistantSurfaceIconButton aria-label={label} onClick={onClick} icon="history" />
    </Box>
  );
}

function ConversationRow({
  conversation,
  selected,
  untitled,
  locale,
  compact,
  onSelect,
  onNavigate,
  onRename,
  onDelete,
}: {
  conversation: AssistantConversationSummary;
  selected: boolean;
  untitled: string;
  locale: string;
  compact?: boolean;
  onSelect: () => void;
  onNavigate?: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const displayTitle = conversationDisplayTitle(conversation.title, untitled);
  const updatedLabel = formatConversationUpdatedAt(conversation.updatedAt, locale);

  const startEditing = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setDraftTitle(conversation.title?.trim() ?? '');
      setEditing(true);
    },
    [conversation.title]
  );

  const cancelEditing = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();
    setEditing(false);
    setDraftTitle('');
  }, []);

  const saveTitle = useCallback(
    async (event?: React.MouseEvent | React.KeyboardEvent) => {
      event?.stopPropagation();
      if (saving) return;
      setSaving(true);
      try {
        const ok = await onRename(conversation.id, draftTitle.trim());
        if (ok) setEditing(false);
      } finally {
        setSaving(false);
      }
    },
    [conversation.id, draftTitle, onRename, saving]
  );

  const handleDelete = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!window.confirm(t('assistant.history.deleteConfirm'))) return;
      await onDelete(conversation.id);
    },
    [conversation.id, onDelete, t]
  );

  return (
    <ListItemButton
      selected={selected}
      onClick={() => {
        if (editing) return;
        onSelect();
        onNavigate?.();
      }}
      sx={{
        borderRadius: '4px',
        mb: 0.25,
        py: 0.75,
        px: 0.75,
        minHeight: 0,
        alignItems: 'flex-start',
        overflow: 'visible',
        '&:hover .conversation-row-actions': { opacity: 1 },
        ...(selected
          ? {
              bgcolor: 'var(--color-theme-accent-tint) !important',
              borderLeft: '2px solid var(--color-theme-accent)',
            }
          : {
              ...plexonLightCardSx,
              borderLeft: '2px solid transparent',
            }),
      }}
    >
      {editing ? (
        <Stack
          direction="row"
          spacing={0.25}
          sx={{ width: '100%', alignItems: 'center' }}
          onClick={(event) => event.stopPropagation()}
        >
          <MsqdxInput
            value={draftTitle}
            onChange={(e) => setDraftTitle((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveTitle(e);
              if (e.key === 'Escape') cancelEditing();
            }}
            placeholder={untitled}
            size="small"
            fullWidth
            autoFocus
            disabled={saving}
            sx={{ ...plexonLightInputSx, ...INPUT_ACCENT_SX, flex: 1 }}
          />
          <AssistantSurfaceIconButton
            aria-label={t('assistant.history.renameSave')}
            size="small"
            icon="check"
            onClick={(e) => void saveTitle(e)}
            disabled={saving}
          />
          <AssistantSurfaceIconButton
            aria-label={t('assistant.history.renameCancel')}
            size="small"
            icon="close"
            onClick={cancelEditing}
            disabled={saving}
          />
        </Stack>
      ) : (
        <Box sx={{ position: 'relative', width: '100%', minWidth: 0 }}>
          <MsqdxTypography
            variant="body2"
            title={displayTitle}
            sx={{
              fontWeight: selected ? 600 : 500,
              fontSize: compact ? '0.8125rem' : '0.875rem',
              lineHeight: 1.4,
              color: 'var(--color-text-on-light)',
              display: '-webkit-box',
              WebkitLineClamp: ASSISTANT_HISTORY_TITLE_MAX_LINES,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              width: '100%',
            }}
          >
            {displayTitle}
          </MsqdxTypography>
          <MsqdxTypography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.375,
              fontSize: '0.625rem',
              lineHeight: 1.2,
              color: 'var(--color-text-muted-on-light)',
              opacity: 0.65,
              width: '100%',
            }}
          >
            {updatedLabel}
          </MsqdxTypography>
          <Stack
            direction="row"
            className="conversation-row-actions"
            onClick={(event) => event.stopPropagation()}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 0,
              opacity: { xs: 1, md: 0 },
              transition: 'opacity 0.15s ease',
              pl: 1.5,
              py: 0.125,
              borderRadius: '4px',
              background: selected
                ? 'linear-gradient(to left, var(--color-theme-accent-tint) 55%, transparent)'
                : 'linear-gradient(to left, var(--color-bg-subtle) 55%, transparent)',
              '& .MuiIconButton-root': { p: 0.25 },
            }}
          >
            <AssistantSurfaceIconButton
              aria-label={t('assistant.history.rename')}
              size="small"
              icon="edit"
              onClick={startEditing}
            />
            <AssistantSurfaceIconButton
              aria-label={t('assistant.history.delete')}
              size="small"
              icon="delete"
              onClick={(e) => void handleDelete(e)}
            />
          </Stack>
        </Box>
      )}
    </ListItemButton>
  );
}

function HistoryPanel({
  conversations,
  activeConversationId,
  loading,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onNavigate,
  compact,
}: {
  conversations: AssistantConversationSummary[];
  activeConversationId: string | null;
  loading: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onSelect: (conversation: AssistantConversationSummary) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const untitled = t('assistant.history.untitled');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredConversations = useMemo(
    () => filterConversationsByQuery(conversations, searchQuery, untitled),
    [conversations, searchQuery, untitled]
  );

  if (collapsed) {
    return (
      <Stack
        alignItems="center"
        spacing={0.75}
        data-plexon-assistant-ui
        sx={{
          height: '100%',
          py: 0.75,
          ...plexonAssistantChatShellSx,
          borderRadius: '8px',
          border: '1px solid var(--color-secondary-dx-grey-light-tint)',
        }}
      >
        <AssistantSurfaceIconButton
          aria-label={t('assistant.history.expand')}
          size="small"
          icon="chevron_right"
          onClick={onToggleCollapsed}
        />
        <AssistantSurfaceIconButton
          aria-label={t('assistant.newConversation')}
          size="small"
          icon="add"
          onClick={() => {
            onNewChat();
            onNavigate?.();
          }}
        />
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', width: '100%', px: 0.25 }}>
          {conversations.slice(0, 12).map((conversation) => {
            const selected = conversation.id === activeConversationId;
            return (
              <Box
                key={conversation.id}
                component="button"
                type="button"
                title={conversationDisplayTitle(conversation.title, untitled)}
                onClick={() => {
                  onSelect(conversation);
                  onNavigate?.();
                }}
                sx={{
                  display: 'block',
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  p: 0.5,
                  mb: 0.25,
                  bgcolor: selected ? 'var(--color-theme-accent-tint)' : 'transparent',
                  borderLeft: selected
                    ? '2px solid var(--color-theme-accent)'
                    : '2px solid transparent',
                  '&:hover': { bgcolor: 'var(--color-theme-accent-tint)' },
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    mx: 'auto',
                    bgcolor: selected ? 'var(--color-theme-accent)' : 'var(--color-text-muted-on-light)',
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack
      data-plexon-assistant-ui
      sx={{
        height: '100%',
        minHeight: 0,
        ...plexonAssistantChatShellSx,
        borderRadius: '8px',
        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
      }}
    >
      <Box
        sx={{
          px: 0.75,
          py: 0.75,
          flexShrink: 0,
          borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.75 }}>
          {onToggleCollapsed ? (
            <AssistantSurfaceIconButton
              aria-label={t('assistant.history.collapse')}
              size="small"
              icon="chevron_left"
              onClick={onToggleCollapsed}
              sx={{ flexShrink: 0 }}
            />
          ) : null}
          <MsqdxTypography
            variant="caption"
            sx={{ fontWeight: 700, flex: 1, fontSize: '0.75rem', letterSpacing: '0.02em' }}
          >
            {t('assistant.history.title')}
          </MsqdxTypography>
          <AssistantSurfaceIconButton
            aria-label={t('assistant.history.searchPlaceholder')}
            size="small"
            icon="search"
            onClick={() => setSearchOpen((open) => !open)}
            sx={{
              flexShrink: 0,
              ...(searchOpen || searchQuery
                ? {
                    backgroundColor: 'var(--color-theme-accent-tint) !important',
                    borderColor: 'var(--color-theme-accent) !important',
                  }
                : {}),
            }}
          />
          <AssistantSurfaceIconButton
            aria-label={t('assistant.newConversation')}
            size="small"
            icon="add"
            onClick={() => {
              onNewChat();
              onNavigate?.();
            }}
            sx={{ flexShrink: 0 }}
          />
        </Box>

        <Collapse in={searchOpen || Boolean(searchQuery)}>
          <MsqdxInput
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            placeholder={t('assistant.history.searchPlaceholder')}
            size="small"
            fullWidth
            sx={{ ...plexonLightInputSx, ...INPUT_ACCENT_SX, mb: 0.5 }}
          />
        </Collapse>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 0.375, py: 0.375 }}>
        {loading && conversations.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : null}

        {!loading && conversations.length === 0 ? (
          <Box sx={{ px: 0.75, py: 1.5 }}>
            <MsqdxTypography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {t('assistant.history.empty')}
            </MsqdxTypography>
          </Box>
        ) : null}

        {!loading && conversations.length > 0 && filteredConversations.length === 0 ? (
          <Box sx={{ px: 0.75, py: 1.5 }}>
            <MsqdxTypography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {t('assistant.history.noResults')}
            </MsqdxTypography>
          </Box>
        ) : null}

        <List dense disablePadding sx={{ py: 0 }}>
          {filteredConversations.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              selected={conversation.id === activeConversationId}
              untitled={untitled}
              locale={locale}
              compact={compact}
              onSelect={() => onSelect(conversation)}
              onNavigate={onNavigate}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </List>
      </Box>
    </Stack>
  );
}

export function AssistantConversationHistory({
  conversations,
  activeConversationId,
  loading,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  mobileOpen,
  onMobileClose,
}: AssistantConversationHistoryProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedPreference());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(ASSISTANT_HISTORY_COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  return (
    <>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          width: collapsed ? ASSISTANT_HISTORY_COLLAPSED_WIDTH_PX : ASSISTANT_HISTORY_EXPANDED_WIDTH_PX,
          flexShrink: 0,
          minHeight: 0,
          height: '100%',
          transition: 'width 0.2s ease',
        }}
      >
        <HistoryPanel
          conversations={conversations}
          activeConversationId={activeConversationId}
          loading={loading}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onSelect={onSelect}
          onNewChat={onNewChat}
          onRename={onRename}
          onDelete={onDelete}
          compact
        />
      </Box>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          backdrop: { sx: plexonAssistantDrawerBackdropSx },
        }}
        PaperProps={{ sx: { ...plexonAssistantDrawerPaperSx, width: 'min(100vw, 280px)' } }}
        sx={{ display: { md: 'none' } }}
      >
        <HistoryPanel
          conversations={conversations}
          activeConversationId={activeConversationId}
          loading={loading}
          onSelect={onSelect}
          onNewChat={onNewChat}
          onRename={onRename}
          onDelete={onDelete}
          onNavigate={onMobileClose}
          compact
        />
      </Drawer>
    </>
  );
}
