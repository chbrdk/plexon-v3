'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Checkbox, Collapse, Drawer, FormControlLabel, Stack } from '@mui/material';
import {
  MsqdxButton,
  MsqdxCard,
  MsqdxInput,
  MsqdxTypography,
} from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton';
import { ReportPdfDownloadButton } from '@/components/assistant/ReportPdfDownloadButton';
import { AssistantSurfaceIcon, AssistantSurfaceIconButton } from '@/components/assistant/AssistantSurfaceIconButton';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  apiAssistantConversationReportGenerate,
  apiAssistantConversationReportPins,
  apiPublicReportPdf,
  apiPublicReportPptx,
} from '@/lib/constants';
import { blockPinLabel } from '@/lib/assistant/reports/block-pin-label';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { uiListRowSx } from '@/lib/assistant/ui-visual';
import {
  plexonAssistantDrawerBackdropSx,
  plexonAssistantDrawerPaperSx,
  plexonLightCardSx,
} from '@/lib/plexon-surface-styles';
import { INPUT_ACCENT_SX } from '@/lib/theme-accent';

export type ReportPinItem = {
  id: string;
  messageId: string;
  blockId: string;
  blockSnapshot: UiBlock;
};

type ReportCollectionBarProps = {
  conversationId: string | null;
  pins: ReportPinItem[];
  onPinsChange: (pins: ReportPinItem[]) => void;
};

export function ReportCollectionBar({ conversationId, pins, onPinsChange }: ReportCollectionBarProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPinIds, setSelectedPinIds] = useState<Set<string>>(() => new Set(pins.map((p) => p.id)));

  useEffect(() => {
    setSelectedPinIds(new Set(pins.map((p) => p.id)));
  }, [pins]);

  const allSelected = useMemo(
    () => pins.length > 0 && pins.every((p) => selectedPinIds.has(p.id)),
    [pins, selectedPinIds]
  );
  const selectedCount = useMemo(
    () => pins.filter((p) => selectedPinIds.has(p.id)).length,
    [pins, selectedPinIds]
  );

  const togglePinSelection = useCallback((pinId: string) => {
    setSelectedPinIds((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
  }, []);

  const toggleAllPins = useCallback(() => {
    setSelectedPinIds(allSelected ? new Set() : new Set(pins.map((p) => p.id)));
  }, [allSelected, pins]);

  const removePin = useCallback(
    async (pinId: string) => {
      if (!conversationId) return;
      const res = await fetch(
        `${apiAssistantConversationReportPins(conversationId)}?pinId=${encodeURIComponent(pinId)}`,
        { method: 'DELETE', credentials: 'same-origin' }
      );
      if (!res.ok) return;
      onPinsChange(pins.filter((p) => p.id !== pinId));
    },
    [conversationId, onPinsChange, pins]
  );

  const generateReport = useCallback(async () => {
    if (!conversationId || pins.length === 0 || selectedCount === 0) return;
    setGenerating(true);
    setError(null);
    setShareUrl(null);
    try {
      const pinIds =
        selectedCount < pins.length ? pins.filter((p) => selectedPinIds.has(p.id)).map((p) => p.id) : undefined;
      const res = await fetch(apiAssistantConversationReportGenerate(conversationId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || undefined, pinIds }),
      });
      const data = (await res.json()) as {
        shareUrl?: string;
        shareToken?: string;
        sharePath?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? t('common.error'));
      }
      if (data.shareUrl) {
        setShareUrl(data.shareUrl);
        const tokenFromPath = data.sharePath?.split('/').pop() ?? data.shareToken ?? null;
        setShareToken(tokenFromPath);
        setOpen(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setGenerating(false);
    }
  }, [conversationId, pins, selectedCount, selectedPinIds, t, title]);

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  if (!conversationId || pins.length === 0) return null;

  return (
    <>
      <Box
        data-plexon-assistant-ui
        sx={{
          flexShrink: 0,
          px: { xs: 1, md: 2 },
          py: 1,
          borderTop: '1px solid var(--color-secondary-dx-grey-light-tint)',
          bgcolor: 'var(--color-bg-subtle)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <MsqdxTypography variant="body2" weight="semibold">
            {t('assistant.report.cartCount', { count: pins.length })}
          </MsqdxTypography>
          <Stack direction="row" spacing={1}>
            <MsqdxButton variant="outlined" size="small" onClick={() => setOpen(true)}>
              {t('assistant.report.openCart')}
            </MsqdxButton>
            <MsqdxButton
              variant="contained"
              size="small"
              disabled={generating || selectedCount === 0}
              onClick={() => void generateReport()}
            >
              {generating ? t('assistant.report.generating') : t('assistant.report.generate')}
            </MsqdxButton>
          </Stack>
        </Stack>
      </Box>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          backdrop: { sx: plexonAssistantDrawerBackdropSx },
          paper: { sx: plexonAssistantDrawerPaperSx },
        }}
      >
        <Box
          data-plexon-assistant-ui
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            bgcolor: 'var(--color-bg-subtle)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: `${MSQDX_SPACING.scale.md}px`,
              py: `${MSQDX_SPACING.scale.sm}px`,
              borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
              flexShrink: 0,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <AssistantSurfaceIcon name="bookmark" />
              <MsqdxTypography variant="subtitle1" weight="semibold">
                {t('assistant.report.cartTitle')}
              </MsqdxTypography>
            </Stack>
            <AssistantSurfaceIconButton
              size="small"
              onClick={() => setOpen(false)}
              aria-label={t('common.close')}
              icon="close"
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              px: `${MSQDX_SPACING.scale.md}px`,
              py: `${MSQDX_SPACING.scale.md}px`,
            }}
          >
            <MsqdxInput
              label={t('assistant.report.titleOptional')}
              value={title}
              onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
              fullWidth
              size="small"
              sx={{ mb: 2, ...INPUT_ACCENT_SX }}
            />

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('assistant.report.selectedCount', { selected: selectedCount, total: pins.length })}
              </MsqdxTypography>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={selectedCount > 0 && !allSelected}
                    onChange={() => toggleAllPins()}
                  />
                }
                label={
                  <MsqdxTypography variant="caption">{t('assistant.report.selectAllPins')}</MsqdxTypography>
                }
                sx={{ m: 0 }}
              />
            </Stack>

            <Stack spacing={1} sx={{ mb: 2 }}>
              {pins.map((pin, index) => (
                <Box
                  key={pin.id}
                  sx={{
                    ...uiListRowSx('neutral', index),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={selectedPinIds.has(pin.id)}
                    onChange={() => togglePinSelection(pin.id)}
                    sx={{ p: 0.5, flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <MsqdxTypography variant="body2" weight="semibold" sx={{ display: 'block' }}>
                      {blockPinLabel(pin.blockSnapshot)}
                    </MsqdxTypography>
                    <MsqdxTypography
                      variant="caption"
                      sx={{ color: 'var(--color-text-muted-on-light)', textTransform: 'uppercase' }}
                    >
                      {pin.blockSnapshot.type}
                    </MsqdxTypography>
                  </Box>
                  <AssistantSurfaceIconButton
                    size="small"
                    onClick={() => void removePin(pin.id)}
                    aria-label={t('assistant.report.remove')}
                    icon="delete"
                  />
                </Box>
              ))}
            </Stack>

            <Collapse in={Boolean(shareUrl)}>
              <MsqdxCard
                data-msqdx-surface="light"
                variant="flat"
                borderRadius="button"
                sx={{
                  ...plexonLightCardSx,
                  border: '1px solid var(--color-theme-accent-tint)',
                  bgcolor: 'var(--color-theme-accent-tint) !important',
                }}
              >
                <MsqdxTypography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                  {t('assistant.report.shareReady')}
                </MsqdxTypography>
                <MsqdxTypography
                  variant="body2"
                  sx={{ wordBreak: 'break-all', mb: 1.5, color: 'var(--color-text-on-light)' }}
                >
                  {shareUrl}
                </MsqdxTypography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <MsqdxButton variant="outlined" size="small" onClick={() => void copyShareUrl()}>
                    {t('assistant.report.copyLink')}
                  </MsqdxButton>
                  {shareToken ? (
                    <>
                      <ReportPdfDownloadButton
                        pdfUrl={apiPublicReportPdf(shareToken)}
                        label={t('assistant.report.downloadPdf')}
                        errorLabel={t('common.error')}
                      />
                      <ReportBinaryDownloadButton
                        downloadUrl={apiPublicReportPptx(shareToken)}
                        label={t('assistant.report.downloadPptx')}
                        format="pptx"
                        loadingLabel={t('assistant.report.exportingPptx')}
                        errorLabel={t('common.error')}
                      />
                    </>
                  ) : null}
                </Stack>
              </MsqdxCard>
            </Collapse>

            {error ? (
              <MsqdxTypography variant="body2" sx={{ mt: 2, color: 'var(--color-secondary-dx-pink-on-light)' }}>
                {error}
              </MsqdxTypography>
            ) : null}
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              px: `${MSQDX_SPACING.scale.md}px`,
              py: `${MSQDX_SPACING.scale.md}px`,
              borderTop: '1px solid var(--color-secondary-dx-grey-light-tint)',
              bgcolor: 'var(--color-bg-subtle)',
            }}
          >
            <MsqdxButton
              fullWidth
              variant="contained"
              disabled={generating || selectedCount === 0}
              onClick={() => void generateReport()}
            >
              {generating ? t('assistant.report.generating') : t('assistant.report.generate')}
            </MsqdxButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
