'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Checkbox, Dialog, Field, Input, Text } from '@msqdx/ui'
import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton'
import { ReportPdfDownloadButton } from '@/components/assistant/ReportPdfDownloadButton'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  apiAssistantConversationReportGenerate,
  apiAssistantConversationReportPins,
  apiPublicReportPdf,
  apiPublicReportPptx,
} from '@/lib/constants'
import { blockPinLabel } from '@/lib/assistant/reports/block-pin-label'
import type { UiBlock } from '@/lib/assistant/ui-blocks/types'

export type ReportPinItem = {
  id: string
  messageId: string
  blockId: string
  blockSnapshot: UiBlock
}

type ReportCollectionBarProps = {
  conversationId: string | null
  pins: ReportPinItem[]
  onPinsChange: (pins: ReportPinItem[]) => void
}

export function ReportCollectionBar({ conversationId, pins, onPinsChange }: ReportCollectionBarProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPinIds, setSelectedPinIds] = useState<Set<string>>(() => new Set(pins.map((p) => p.id)))

  useEffect(() => {
    setSelectedPinIds(new Set(pins.map((p) => p.id)))
  }, [pins])

  const allSelected = useMemo(
    () => pins.length > 0 && pins.every((p) => selectedPinIds.has(p.id)),
    [pins, selectedPinIds],
  )
  const selectedCount = useMemo(
    () => pins.filter((p) => selectedPinIds.has(p.id)).length,
    [pins, selectedPinIds],
  )

  const togglePinSelection = useCallback((pinId: string) => {
    setSelectedPinIds((prev) => {
      const next = new Set(prev)
      if (next.has(pinId)) next.delete(pinId)
      else next.add(pinId)
      return next
    })
  }, [])

  const toggleAllPins = useCallback(() => {
    setSelectedPinIds(allSelected ? new Set() : new Set(pins.map((p) => p.id)))
  }, [allSelected, pins])

  const removePin = useCallback(
    async (pinId: string) => {
      if (!conversationId) return
      const res = await fetch(
        `${apiAssistantConversationReportPins(conversationId)}?pinId=${encodeURIComponent(pinId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      if (!res.ok) return
      onPinsChange(pins.filter((p) => p.id !== pinId))
    },
    [conversationId, onPinsChange, pins],
  )

  const generateReport = useCallback(async () => {
    if (!conversationId || pins.length === 0 || selectedCount === 0) return
    setGenerating(true)
    setError(null)
    setShareUrl(null)
    try {
      const pinIds =
        selectedCount < pins.length
          ? pins.filter((p) => selectedPinIds.has(p.id)).map((p) => p.id)
          : undefined
      const res = await fetch(apiAssistantConversationReportGenerate(conversationId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || undefined, pinIds }),
      })
      const data = (await res.json()) as {
        shareUrl?: string
        shareToken?: string
        sharePath?: string
        error?: string
        message?: string
      }
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? t('common.error'))
      }
      if (data.shareUrl) {
        setShareUrl(data.shareUrl)
        const tokenFromPath = data.sharePath?.split('/').pop() ?? data.shareToken ?? null
        setShareToken(tokenFromPath)
        setOpen(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setGenerating(false)
    }
  }, [conversationId, pins, selectedCount, selectedPinIds, t, title])

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl || typeof navigator === 'undefined') return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      /* ignore */
    }
  }, [shareUrl])

  if (!conversationId || pins.length === 0) return null

  return (
    <>
      <div className="plexon-report-cart-bar" data-plexon-assistant-ui data-section="report-collection-bar">
        <Text role="meta">{t('assistant.report.cartCount', { count: pins.length })}</Text>
        <div className="plexon-report-cart-bar-actions">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            {t('assistant.report.openCart')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={generating || selectedCount === 0}
            onClick={() => void generateReport()}
          >
            {generating ? t('assistant.report.generating') : t('assistant.report.generate')}
          </Button>
        </div>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('assistant.report.cartTitle')}
        className="plexon-report-cart-dialog"
        actions={
          <Button
            variant="primary"
            block
            disabled={generating || selectedCount === 0}
            onClick={() => void generateReport()}
          >
            {generating ? t('assistant.report.generating') : t('assistant.report.generate')}
          </Button>
        }
      >
        <div className="plexon-report-cart-body">
          <Field label={t('assistant.report.titleOptional')} size="md">
            <Input size="md" block value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <div className="plexon-report-cart-select-row">
            <Text role="meta">
              {t('assistant.report.selectedCount', {
                selected: selectedCount,
                total: pins.length,
              })}
            </Text>
            <Checkbox
              checked={allSelected}
              indeterminate={selectedCount > 0 && !allSelected}
              onChange={() => toggleAllPins()}
              label={t('assistant.report.selectAllPins')}
            />
          </div>

          <ul className="plexon-report-cart-pins">
            {pins.map((pin) => (
              <li key={pin.id} className="plexon-report-cart-pin">
                <Checkbox
                  checked={selectedPinIds.has(pin.id)}
                  onChange={() => togglePinSelection(pin.id)}
                  label={
                    <span className="plexon-report-cart-pin-main">
                      <Text role="body" as="span">
                        {blockPinLabel(pin.blockSnapshot)}
                      </Text>
                      <Text role="meta" as="span">
                        {pin.blockSnapshot.type}
                      </Text>
                    </span>
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void removePin(pin.id)}
                  aria-label={t('assistant.report.remove')}
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>

          {shareUrl ? (
            <div className="plexon-report-cart-share">
              <Text role="meta">{t('assistant.report.shareReady')}</Text>
              <Text role="body">{shareUrl}</Text>
              <div className="plexon-report-cart-share-actions">
                <Button variant="ghost" size="sm" onClick={() => void copyShareUrl()}>
                  {t('assistant.report.copyLink')}
                </Button>
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
              </div>
            </div>
          ) : null}

          {error ? <Alert tone="error">{error}</Alert> : null}
        </div>
      </Dialog>
    </>
  )
}
