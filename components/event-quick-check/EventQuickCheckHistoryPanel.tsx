'use client';

import {
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  eventQuickCheckHistoryStatusLabel,
  type EventQuickCheckHistoryItem,
} from '@/lib/assistant/event-quick-check/event-quick-check-history';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import { formatConversationUpdatedAt } from '@/lib/assistant/conversation-history';
import { plexonLightCardSx } from '@/lib/plexon-surface-styles';

type Props = {
  items: EventQuickCheckHistoryItem[];
  activeRunId: string | null;
  loading: boolean;
  error: string | null;
  locale?: string;
  showTitle?: boolean;
  onSelect: (item: EventQuickCheckHistoryItem) => void;
};

function statusChipColor(
  status: EventQuickCheckHistoryItem['status']
): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'running') return 'warning';
  return 'default';
}

export function EventQuickCheckHistoryPanel({
  items,
  activeRunId,
  loading,
  error,
  locale = 'de',
  showTitle = true,
  onSelect,
}: Props) {
  return (
    <Box
      data-plexon-event-quick-check-history
      sx={{
        ...plexonLightCardSx,
        p: 2,
        minHeight: showTitle ? 280 : 0,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: showTitle ? undefined : 'none',
        border: showTitle ? undefined : 'none',
        bgcolor: showTitle ? undefined : 'transparent',
      }}
    >
      {showTitle ? (
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {EQC_PAGE_COPY.historyTitle}
        </Typography>
      ) : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : null}

      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {EQC_PAGE_COPY.historyEmpty}
        </Typography>
      ) : null}

      {!loading && items.length > 0 ? (
        <List dense disablePadding sx={{ overflow: 'auto', flex: 1 }}>
          {items.map((item) => {
            const selected = item.workflowRunId === activeRunId;
            return (
              <ListItemButton
                key={item.workflowRunId}
                selected={selected}
                onClick={() => onSelect(item)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 0.5,
                  py: 1,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {item.domain}
                  </Typography>
                  <Chip
                    size="small"
                    label={eventQuickCheckHistoryStatusLabel(item.status)}
                    color={statusChipColor(item.status)}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '100%' }}>
                  {item.url}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="caption" color="text.secondary">
                    {formatConversationUpdatedAt(item.updatedAt, locale)}
                  </Typography>
                  {item.domainScore != null ? (
                    <Typography variant="caption" color="text.secondary">
                      · {EQC_PAGE_COPY.historyDomainScore} {item.domainScore}
                    </Typography>
                  ) : null}
                  {!item.hasReport ? (
                    <Typography variant="caption" color="warning.main">
                      · {EQC_PAGE_COPY.historyNoReport}
                    </Typography>
                  ) : null}
                </Stack>
              </ListItemButton>
            );
          })}
        </List>
      ) : null}
    </Box>
  );
}
