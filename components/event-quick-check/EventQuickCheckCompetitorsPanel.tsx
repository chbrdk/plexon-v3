'use client';

import { useEffect, useState } from 'react';
import { Button, Chip, Field, Input, Text } from '@msqdx/ui';
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
    <div className="plexon-eqc-stack">
      <Text role="title" as="h2">
        {EQC_PAGE_COPY.competitorsReviewTitle}
      </Text>
      <Text role="body">{EQC_PAGE_COPY.competitorsReviewLead}</Text>
      <Text role="hint">{EQC_PAGE_COPY.competitorsReviewHint(maxCompetitors)}</Text>
      {items.map((domain, index) => (
        <div key={`competitor-${index}`} className="plexon-eqc-stack-sm">
          <Field label={EQC_PAGE_COPY.competitorsReviewLabel(index)}>
            <Input
              value={domain}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder="wettbewerber.de"
              block
              disabled={loading}
            />
          </Field>
          <div>
            <Button
              variant="link"
              size="sm"
              onClick={() => removeItem(index)}
              disabled={loading || items.length <= 1}
            >
              {EQC_PAGE_COPY.competitorsReviewRemove}
            </Button>
          </div>
        </div>
      ))}
      <div className="plexon-eqc-chip-row">
        {items.filter(Boolean).map((domain) => (
          <Chip key={domain} static>
            {domain}
          </Chip>
        ))}
      </div>
      {items.filter(Boolean).length < maxCompetitors ? (
        <div className="plexon-eqc-row">
          <Field label={EQC_PAGE_COPY.competitorsReviewAddLabel} className="plexon-eqc-form">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="domain.de"
              block
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addManual();
                }
              }}
            />
          </Field>
          <Button variant="ghost" onClick={addManual} disabled={loading || !manual.trim()}>
            {EQC_PAGE_COPY.competitorsReviewAdd}
          </Button>
        </div>
      ) : null}
      <Button variant="primary" onClick={handleConfirm} disabled={loading}>
        {loading ? EQC_PAGE_COPY.competitorsReviewConfirming : EQC_PAGE_COPY.competitorsReviewConfirm}
      </Button>
    </div>
  );
}
