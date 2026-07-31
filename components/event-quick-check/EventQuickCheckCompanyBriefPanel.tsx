'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Field, Input, Text, Textarea } from '@msqdx/ui';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

export type EventQuickCheckCompanyBriefPanelProps = {
  brief: EventQuickCheckCompanyBrief;
  loading?: boolean;
  onConfirm: (edits: {
    displayName: string;
    industry: string;
    summary: string;
    targetAudienceHint: string;
    disambiguationNote: string;
  }) => void;
};

export function EventQuickCheckCompanyBriefPanel({
  brief,
  loading = false,
  onConfirm,
}: EventQuickCheckCompanyBriefPanelProps) {
  const [displayName, setDisplayName] = useState(brief.displayName);
  const [industry, setIndustry] = useState(brief.industry);
  const [summary, setSummary] = useState(brief.summary);
  const [targetAudienceHint, setTargetAudienceHint] = useState(brief.targetAudienceHint);
  const [disambiguationNote, setDisambiguationNote] = useState(brief.disambiguationNote);

  useEffect(() => {
    setDisplayName(brief.displayName);
    setIndustry(brief.industry);
    setSummary(brief.summary);
    setTargetAudienceHint(brief.targetAudienceHint);
    setDisambiguationNote(brief.disambiguationNote);
  }, [brief]);

  return (
    <div className="plexon-eqc-stack">
      <Text role="title" as="h2">
        {EQC_PAGE_COPY.reviewTitle}
      </Text>
      <Text role="body">{EQC_PAGE_COPY.reviewLead}</Text>
      {brief.sources.fetchError ? (
        <Alert tone="info">{EQC_PAGE_COPY.reviewFetchWarning}</Alert>
      ) : null}
      <Field label={EQC_PAGE_COPY.reviewDisplayName}>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          block
          disabled={loading}
        />
      </Field>
      <Field label={EQC_PAGE_COPY.reviewIndustry}>
        <Input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          block
          disabled={loading}
        />
      </Field>
      <Field label={EQC_PAGE_COPY.reviewSummary}>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          block
          disabled={loading}
        />
      </Field>
      <Field label={EQC_PAGE_COPY.reviewTargetAudience}>
        <Textarea
          value={targetAudienceHint}
          onChange={(e) => setTargetAudienceHint(e.target.value)}
          rows={2}
          block
          disabled={loading}
        />
      </Field>
      <Field label={EQC_PAGE_COPY.reviewDisambiguation}>
        <Textarea
          value={disambiguationNote}
          onChange={(e) => setDisambiguationNote(e.target.value)}
          rows={2}
          block
          disabled={loading}
        />
      </Field>
      <div>
        <Button
          variant="primary"
          disabled={loading || !summary.trim()}
          onClick={() =>
            onConfirm({
              displayName,
              industry,
              summary,
              targetAudienceHint,
              disambiguationNote,
            })
          }
        >
          {loading ? EQC_PAGE_COPY.reviewConfirming : EQC_PAGE_COPY.reviewConfirm}
        </Button>
      </div>
    </div>
  );
}
