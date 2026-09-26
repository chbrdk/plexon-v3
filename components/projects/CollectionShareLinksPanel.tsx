'use client'

/**
 * Collection Share Links hub — cross-product inventory.
 * Spec: specs/domain/collection-share-links.md
 */

import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Chip, SectionChrome, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { CollectionClientSharesPanel } from '@/components/projects/CollectionClientSharesPanel'
import {
  apiPlatformProvisioningCollectionShareLink,
  apiPlatformProvisioningCollectionShareLinks,
} from '@/lib/constants'

type ShareLinkItem = {
  productId: string
  shareId: string
  kind: string
  title: string
  href: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export function CollectionShareLinksPanel({
  platformProjectId,
  canManage = true,
}: {
  platformProjectId: string
  canManage?: boolean
}) {
  const { t } = useI18n()
  const [items, setItems] = useState<ShareLinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProvisioningCollectionShareLinks(platformProjectId), {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as { items?: ShareLinkItem[] }
      setItems(Array.isArray(json.items) ? json.items : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.shareLinks.loadError'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [platformProjectId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function revoke(item: ShareLinkItem) {
    if (!canManage) return
    if (!window.confirm(t('projects.detail.shareLinks.revokeConfirm'))) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        apiPlatformProvisioningCollectionShareLink(
          platformProjectId,
          item.shareId,
          item.productId
        ),
        { method: 'DELETE', credentials: 'same-origin' }
      )
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.shareLinks.revokeError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="plexon-dash-band"
      data-section="collection-share-links"
      data-testid="collection-share-links-panel"
      aria-label={t('projects.detail.shareLinks.title')}
    >
      <SectionChrome
        title={t('projects.detail.shareLinks.title')}
        meta={<Text role="meta">{t('projects.detail.shareLinks.subtitle')}</Text>}
      />

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      {!loading && items.length === 0 ? (
        <Text role="meta">{t('projects.detail.shareLinks.empty')}</Text>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="plexon-project-bindings">
          {items.map((item) => (
            <li
              key={`${item.productId}:${item.shareId}`}
              className="plexon-project-binding"
              data-testid={`share-link-row-${item.productId}-${item.shareId}`}
            >
              <div className="plexon-project-binding__main">
                <Text role="title" as="h4">
                  {item.title}
                </Text>
                <Text role="meta">
                  {item.productId} · {item.kind}
                  {item.expiresAt
                    ? ` · ${t('projects.detail.clientShares.expires')} ${new Date(item.expiresAt).toLocaleDateString()}`
                    : ''}
                </Text>
                {item.href ? (
                  <Text role="meta" as="p">
                    <a href={item.href} target="_blank" rel="noreferrer">
                      {item.href}
                    </a>
                  </Text>
                ) : null}
              </div>
              <div className="plexon-project-detail-actions">
                <Chip static size="sm">
                  {item.productId}
                </Chip>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void revoke(item)}
                    data-testid={`share-link-revoke-${item.shareId}`}
                  >
                    {t('projects.detail.shareLinks.revoke')}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <CollectionClientSharesPanel
        platformProjectId={platformProjectId}
        canManage={canManage}
        policyOnly
      />
    </section>
  )
}
