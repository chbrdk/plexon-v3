'use client';

import { Dialog } from '@msqdx/ui';
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
      title={EQC_PAGE_COPY.historyTitle}
      aria-labelledby="event-quick-check-history-dialog-title"
    >
      <EventQuickCheckHistoryPanel
        items={items}
        activeRunId={activeRunId}
        loading={loading}
        error={error}
        showTitle={false}
        embedded
        onSelect={(item) => {
          onSelect(item);
          onClose();
        }}
      />
    </Dialog>
  );
}
