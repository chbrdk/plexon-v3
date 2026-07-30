'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';

export type EventQuickCheckGeoQuestionsPanelProps = {
  questions: string[];
  groups?: PersonaGeoQuestionGroup[];
  loading?: boolean;
  maxQuestions?: number;
  onConfirm: (questions: string[], groups?: PersonaGeoQuestionGroup[]) => void;
  onCancel?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmingLabel?: string;
};

type GroupState = PersonaGeoQuestionGroup;

function flattenGroups(groups: GroupState[]): string[] {
  return groups.flatMap((g) => g.questions.map((q) => q.trim()).filter(Boolean));
}

export function EventQuickCheckGeoQuestionsPanel({
  questions,
  groups,
  loading = false,
  maxQuestions = 8,
  onConfirm,
  onCancel,
  cancelLabel,
  confirmLabel,
  confirmingLabel,
}: EventQuickCheckGeoQuestionsPanelProps) {
  const grouped = Boolean(groups?.length);
  const [flatItems, setFlatItems] = useState<string[]>(questions.length ? questions : ['']);
  const [groupItems, setGroupItems] = useState<GroupState[]>(groups ?? []);

  useEffect(() => {
    if (grouped && groups?.length) {
      setGroupItems(groups);
    } else {
      setFlatItems(questions.length ? questions : ['']);
    }
  }, [questions, groups, grouped]);

  const totalCount = useMemo(
    () => (grouped ? flattenGroups(groupItems).length : flatItems.filter((q) => q.trim()).length),
    [grouped, groupItems, flatItems]
  );

  const updateFlatItem = (index: number, value: string) => {
    setFlatItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const removeFlatItem = (index: number) => {
    setFlatItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const addFlatItem = () => {
    setFlatItems((prev) => [...prev, '']);
  };

  const updateGroupQuestion = (groupIndex: number, questionIndex: number, value: string) => {
    setGroupItems((prev) =>
      prev.map((group, gi) =>
        gi === groupIndex
          ? {
              ...group,
              questions: group.questions.map((q, qi) => (qi === questionIndex ? value : q)),
            }
          : group
      )
    );
  };

  const handleConfirm = () => {
    if (grouped) {
      const nextGroups = groupItems.map((g) => ({
        ...g,
        questions: g.questions.map((q) => q.trim()).filter(Boolean),
      }));
      onConfirm(flattenGroups(nextGroups), nextGroups);
      return;
    }
    onConfirm(flatItems.map((q) => q.trim()).filter(Boolean));
  };

  return (
    <Stack spacing={MSQDX_SPACING.scale.md}>
      <Typography variant="h6">{EQC_PAGE_COPY.geoReviewTitle}</Typography>
      <Typography variant="body2" color="text.secondary">
        {EQC_PAGE_COPY.geoReviewLead}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {grouped ? EQC_PAGE_COPY.geoReviewMultiPersonaHint : EQC_PAGE_COPY.geoReviewPersonaHint}
      </Typography>

      {grouped
        ? groupItems.map((group, groupIndex) => (
            <Stack key={group.personaId || `persona-${groupIndex}`} spacing={MSQDX_SPACING.scale.sm}>
              <Typography variant="subtitle2">
                {EQC_PAGE_COPY.geoReviewPersonaGroupLabel(group.personaName, group.segment)}
              </Typography>
              {group.questions.map((question, questionIndex) => (
                <TextField
                  key={`geo-g-${groupIndex}-q-${questionIndex}`}
                  label={EQC_PAGE_COPY.geoReviewQuestionLabel(questionIndex)}
                  value={question}
                  onChange={(e) => updateGroupQuestion(groupIndex, questionIndex, e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  disabled={loading}
                />
              ))}
            </Stack>
          ))
        : flatItems.map((question, index) => (
            <Stack key={`geo-q-${index}`} spacing={1}>
              <TextField
                label={EQC_PAGE_COPY.geoReviewQuestionLabel(index)}
                value={question}
                onChange={(e) => updateFlatItem(index, e.target.value)}
                fullWidth
                multiline
                minRows={2}
                disabled={loading}
              />
              <Box>
                <MsqdxButton
                  variant="text"
                  size="small"
                  onClick={() => removeFlatItem(index)}
                  disabled={loading || flatItems.length <= 1}
                >
                  {EQC_PAGE_COPY.geoReviewRemoveQuestion}
                </MsqdxButton>
              </Box>
            </Stack>
          ))}

      {!grouped ? (
        <Box>
          <MsqdxButton
            variant="outlined"
            onClick={addFlatItem}
            disabled={loading || flatItems.length >= maxQuestions}
          >
            {EQC_PAGE_COPY.geoReviewAddQuestion}
          </MsqdxButton>
        </Box>
      ) : null}

      <MsqdxButton variant="contained" onClick={handleConfirm} loading={loading} disabled={loading || totalCount < 1}>
        {loading
          ? (confirmingLabel ?? EQC_PAGE_COPY.geoReviewConfirming)
          : (confirmLabel ?? EQC_PAGE_COPY.geoReviewConfirm)}
      </MsqdxButton>
      {onCancel ? (
        <MsqdxButton variant="text" onClick={onCancel} disabled={loading}>
          {cancelLabel ?? EQC_PAGE_COPY.geoReviewCancel}
        </MsqdxButton>
      ) : null}
    </Stack>
  );
}
