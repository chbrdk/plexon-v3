'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
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
    <Stack spacing={MSQDX_SPACING.scale.md}>
      <Typography variant="h6">{EQC_PAGE_COPY.reviewTitle}</Typography>
      <Typography variant="body2" color="text.secondary">
        {EQC_PAGE_COPY.reviewLead}
      </Typography>
      {brief.sources.fetchError ? (
        <Alert severity="warning">{EQC_PAGE_COPY.reviewFetchWarning}</Alert>
      ) : null}
      <TextField
        label={EQC_PAGE_COPY.reviewDisplayName}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        fullWidth
        disabled={loading}
      />
      <TextField
        label={EQC_PAGE_COPY.reviewIndustry}
        value={industry}
        onChange={(e) => setIndustry(e.target.value)}
        fullWidth
        disabled={loading}
      />
      <TextField
        label={EQC_PAGE_COPY.reviewSummary}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        disabled={loading}
      />
      <TextField
        label={EQC_PAGE_COPY.reviewTargetAudience}
        value={targetAudienceHint}
        onChange={(e) => setTargetAudienceHint(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        disabled={loading}
      />
      <TextField
        label={EQC_PAGE_COPY.reviewDisambiguation}
        value={disambiguationNote}
        onChange={(e) => setDisambiguationNote(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        disabled={loading}
      />
      <Box>
        <MsqdxButton
          variant="contained"
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
        </MsqdxButton>
      </Box>
    </Stack>
  );
}
