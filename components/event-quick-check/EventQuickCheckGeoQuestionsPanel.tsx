'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Field, Text, Textarea } from '@msqdx/ui';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';

export type EventQuickCheckGeoQuestionsPanelProps = {
  questions: string[];
  groups?: PersonaGeoQuestionGroup[];
  /** When false, flat questions came from company-brief / CHECKION fallback (no Audion persona). */
  hasPersona?: boolean;
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
  hasPersona = true,
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
    <div className="plexon-eqc-stack">
      <Text role="title" as="h2">
        {EQC_PAGE_COPY.geoReviewTitle}
      </Text>
      <Text role="body">{EQC_PAGE_COPY.geoReviewLead}</Text>
      <Text role="hint">
        {grouped
          ? EQC_PAGE_COPY.geoReviewMultiPersonaHint
          : hasPersona
            ? EQC_PAGE_COPY.geoReviewPersonaHint
            : EQC_PAGE_COPY.geoReviewFallbackHint}
      </Text>

      {grouped
        ? groupItems.map((group, groupIndex) => (
            <div key={group.personaId || `persona-${groupIndex}`} className="plexon-eqc-stack-sm">
              <Text role="label" as="h3">
                {EQC_PAGE_COPY.geoReviewPersonaGroupLabel(group.personaName, group.segment)}
              </Text>
              {group.questions.map((question, questionIndex) => (
                <Field
                  key={`geo-g-${groupIndex}-q-${questionIndex}`}
                  label={EQC_PAGE_COPY.geoReviewQuestionLabel(questionIndex)}
                >
                  <Textarea
                    value={question}
                    onChange={(e) => updateGroupQuestion(groupIndex, questionIndex, e.target.value)}
                    rows={2}
                    block
                    disabled={loading}
                  />
                </Field>
              ))}
            </div>
          ))
        : flatItems.map((question, index) => (
            <div key={`geo-q-${index}`} className="plexon-eqc-stack-sm">
              <Field label={EQC_PAGE_COPY.geoReviewQuestionLabel(index)}>
                <Textarea
                  value={question}
                  onChange={(e) => updateFlatItem(index, e.target.value)}
                  rows={2}
                  block
                  disabled={loading}
                />
              </Field>
              <div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => removeFlatItem(index)}
                  disabled={loading || flatItems.length <= 1}
                >
                  {EQC_PAGE_COPY.geoReviewRemoveQuestion}
                </Button>
              </div>
            </div>
          ))}

      {!grouped ? (
        <div>
          <Button
            variant="ghost"
            onClick={addFlatItem}
            disabled={loading || flatItems.length >= maxQuestions}
          >
            {EQC_PAGE_COPY.geoReviewAddQuestion}
          </Button>
        </div>
      ) : null}

      <Button variant="primary" onClick={handleConfirm} disabled={loading || totalCount < 1}>
        {loading
          ? (confirmingLabel ?? EQC_PAGE_COPY.geoReviewConfirming)
          : (confirmLabel ?? EQC_PAGE_COPY.geoReviewConfirm)}
      </Button>
      {onCancel ? (
        <Button variant="link" onClick={onCancel} disabled={loading}>
          {cancelLabel ?? EQC_PAGE_COPY.geoReviewCancel}
        </Button>
      ) : null}
    </div>
  );
}
