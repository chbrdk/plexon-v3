'use client';

import { Chip, Dialog, Text } from '@msqdx/ui';
import type { EventQuickCheckReportCitationQueryRun } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import { formatGeoLlmAnswerForDisplay } from '@/lib/integrations/format-geo-llm-answer';

type Props = {
  open: boolean;
  onClose: () => void;
  run: EventQuickCheckReportCitationQueryRun | null;
  modelLabel?: string;
};

export function EventQuickCheckLlmAnswerDialog({ open, onClose, run, modelLabel }: Props) {
  if (!run) return null;

  const answerText = formatGeoLlmAnswerForDisplay(run);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={EQC_REPORT_COPY.geoLlmAnswerDialogTitle}
      aria-labelledby="event-quick-check-llm-answer-dialog-title"
    >
      <div className="plexon-eqc-stack">
        {modelLabel ? (
          <Chip static size="sm">
            {modelLabel}
          </Chip>
        ) : null}
        <div className="plexon-eqc-stack-sm">
          <Text role="hint">{EQC_REPORT_COPY.colQuery}</Text>
          <Text role="body">{run.query}</Text>
        </div>

        <div className="plexon-eqc-stack-sm">
          <Text role="hint">{EQC_REPORT_COPY.geoLlmAnswerExcerpt}</Text>
          <pre className="plexon-eqc-llm-answer-pre">
            {answerText || EQC_REPORT_COPY.geoLlmAnswerMissing}
          </pre>
        </div>

        {run.citations.length > 0 ? (
          <div className="plexon-eqc-stack-sm">
            <Text role="hint">{EQC_REPORT_COPY.geoLlmAnswerCitations}</Text>
            <ul className="plexon-eqc-llm-citations">
              {run.citations.map((citation, index) => (
                <li key={`${citation.domain}-${citation.position}-${index}`}>
                  <Text role="body" as="span">
                    {citation.position}. {citation.domain}
                    {citation.context ? ` — ${citation.context}` : ''}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
