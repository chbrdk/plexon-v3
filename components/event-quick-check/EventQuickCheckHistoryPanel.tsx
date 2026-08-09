'use client';

import { Chip, Spinner, Text, Alert } from '@msqdx/ui';
import {
  eventQuickCheckHistoryStatusLabel,
  type EventQuickCheckHistoryItem,
} from '@/lib/assistant/event-quick-check/event-quick-check-history';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import { formatConversationUpdatedAt } from '@/lib/assistant/conversation-history';

type Props = {
  items: EventQuickCheckHistoryItem[];
  activeRunId: string | null;
  loading: boolean;
  error: string | null;
  locale?: string;
  showTitle?: boolean;
  embedded?: boolean;
  onSelect: (item: EventQuickCheckHistoryItem) => void;
};

export function EventQuickCheckHistoryPanel({
  items,
  activeRunId,
  loading,
  error,
  locale = 'de',
  showTitle = true,
  embedded = false,
  onSelect,
}: Props) {
  return (
    <div
      className="plexon-eqc-history"
      data-plexon-event-quick-check-history
      data-embedded={embedded ? 'true' : 'false'}
    >
      {showTitle ? (
        <Text role="title" as="h2">
          {EQC_PAGE_COPY.historyTitle}
        </Text>
      ) : null}

      {loading ? (
        <div className="plexon-eqc-center">
          <Spinner size="sm" />
        </div>
      ) : null}

      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <Text role="body">{EQC_PAGE_COPY.historyEmpty}</Text>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="plexon-eqc-history-list">
          {items.map((item) => {
            const selected = item.workflowRunId === activeRunId;
            return (
              <li key={item.workflowRunId}>
                <button
                  type="button"
                  className={`plexon-eqc-history-item${selected ? ' is-active' : ''}`}
                  onClick={() => onSelect(item)}
                >
                  <div className="plexon-eqc-history-item-head">
                    <span className="plexon-eqc-history-item-domain">{item.domain}</span>
                    <div className="plexon-eqc-mag-chips">
                      {item.shared ? (
                        <Chip static size="sm">
                          {EQC_PAGE_COPY.historySharedBadge}
                        </Chip>
                      ) : null}
                      <Chip static size="sm">
                        {eventQuickCheckHistoryStatusLabel(item.status)}
                      </Chip>
                    </div>
                  </div>
                  <Text role="hint" className="plexon-eqc-history-item-url">
                    {item.url}
                  </Text>
                  <div className="plexon-eqc-history-item-meta">
                    <Text role="hint">{formatConversationUpdatedAt(item.updatedAt, locale)}</Text>
                    {item.shared && item.ownerLabel ? (
                      <Text role="hint">
                        · {EQC_PAGE_COPY.historyOwnerLabel(item.ownerLabel)}
                      </Text>
                    ) : null}
                    {item.domainScore != null ? (
                      <Text role="hint">
                        · {EQC_PAGE_COPY.historyDomainScore} {item.domainScore}
                      </Text>
                    ) : null}
                    {!item.hasReport ? (
                      <Text role="hint">· {EQC_PAGE_COPY.historyNoReport}</Text>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
