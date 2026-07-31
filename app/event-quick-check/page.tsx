'use client';

import { Suspense } from 'react';
import { EmptyState, Spinner } from '@msqdx/ui';
import { EventQuickCheckPageClient } from '@/components/event-quick-check/EventQuickCheckPageClient';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

export default function EventQuickCheckPage() {
  return (
    <div className="plexon-eqc-stage" data-section="event-quick-check">
      <Suspense
        fallback={
          <EmptyState className="plexon-eqc-center">
            <Spinner size="sm" /> {EQC_PAGE_COPY.historyOpenRun}
          </EmptyState>
        }
      >
        <EventQuickCheckPageClient />
      </Suspense>
    </div>
  );
}
