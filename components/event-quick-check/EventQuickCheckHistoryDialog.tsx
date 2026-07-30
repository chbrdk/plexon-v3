'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from '@mui/material';
import { MsqdxIcon } from '@msqdx/react';
import { EventQuickCheckHistoryPanel } from '@/components/event-quick-check/EventQuickCheckHistoryPanel';
import type { EventQuickCheckHistoryItem } from '@/lib/assistant/event-quick-check/event-quick-check-history';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

type Props = {
  open: boolean;
  onClose: () => void;
  items: EventQuickCheckHistoryItem[];
  activeRunId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (item: EventQuickCheckHistoryItem) => void;
};

export function EventQuickCheckHistoryDialog({
  open,
  onClose,
  items,
  activeRunId,
  loading,
  error,
  onSelect,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="event-quick-check-history-dialog-title"
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'var(--color-bg-subtle)',
            color: 'var(--color-text-on-light)',
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle id="event-quick-check-history-dialog-title" sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          {EQC_PAGE_COPY.historyTitle}
          <IconButton
            aria-label={EQC_PAGE_COPY.historyCloseButton}
            onClick={onClose}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <MsqdxIcon name="close" customSize={20} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <EventQuickCheckHistoryPanel
          items={items}
          activeRunId={activeRunId}
          loading={loading}
          error={error}
          showTitle={false}
          onSelect={(item) => {
            onSelect(item);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
