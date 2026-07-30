'use client';

import { useEffect, useState } from 'react';
import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

export type EventQuickCheckCompetitorsPanelProps = {
  competitors: string[];
  maxCompetitors: number;
  loading?: boolean;
  onConfirm: (competitors: string[]) => void;
};

export function EventQuickCheckCompetitorsPanel({
  competitors,
  maxCompetitors,
  loading = false,
  onConfirm,
}: EventQuickCheckCompetitorsPanelProps) {
  const [items, setItems] = useState<string[]>(competitors.length ? competitors : ['']);
  const [manual, setManual] = useState('');

  useEffect(() => {
    setItems(competitors.length ? competitors : ['']);
  }, [competitors]);

  const updateItem = (index: number, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const addManual = () => {
    const value = manual.trim();
    if (!value) return;
    setItems((prev) => {
      if (prev.length >= maxCompetitors) return prev;
      return [...prev.filter(Boolean), value];
    });
    setManual('');
  };

  const handleConfirm = () => {
    onConfirm(items.map((c) => c.trim()).filter(Boolean).slice(0, maxCompetitors));
  };

  return (
    <Stack spacing={MSQDX_SPACING.scale.md}>
      <Typography variant="h6">{EQC_PAGE_COPY.competitorsReviewTitle}</Typography>
      <Typography variant="body2" color="text.secondary">
        {EQC_PAGE_COPY.competitorsReviewLead}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {EQC_PAGE_COPY.competitorsReviewHint(maxCompetitors)}
      </Typography>
      {items.map((domain, index) => (
        <Stack key={`competitor-${index}`} spacing={1}>
          <TextField
            label={EQC_PAGE_COPY.competitorsReviewLabel(index)}
            value={domain}
            onChange={(e) => updateItem(index, e.target.value)}
            fullWidth
            placeholder="wettbewerber.de"
            disabled={loading}
          />
          <Box>
            <MsqdxButton
              variant="text"
              size="small"
              onClick={() => removeItem(index)}
              disabled={loading || items.length <= 1}
            >
              {EQC_PAGE_COPY.competitorsReviewRemove}
            </MsqdxButton>
          </Box>
        </Stack>
      ))}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {items.filter(Boolean).map((domain) => (
          <Chip key={domain} label={domain} size="small" variant="outlined" />
        ))}
      </Stack>
      {items.filter(Boolean).length < maxCompetitors ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            label={EQC_PAGE_COPY.competitorsReviewAddLabel}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            fullWidth
            placeholder="domain.de"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addManual();
              }
            }}
          />
          <MsqdxButton variant="outlined" onClick={addManual} disabled={loading || !manual.trim()}>
            {EQC_PAGE_COPY.competitorsReviewAdd}
          </MsqdxButton>
        </Stack>
      ) : null}
      <MsqdxButton variant="contained" onClick={handleConfirm} loading={loading} disabled={loading}>
        {loading ? EQC_PAGE_COPY.competitorsReviewConfirming : EQC_PAGE_COPY.competitorsReviewConfirm}
      </MsqdxButton>
    </Stack>
  );
}
