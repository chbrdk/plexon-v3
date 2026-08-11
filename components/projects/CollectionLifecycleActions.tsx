'use client'

import { useState } from 'react'
import { Button } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiPlatformProject } from '@/lib/constants'
import { PLATFORM_PROJECT_STATUS } from '@/lib/platform-companies'

type CollectionLifecycleActionsProps = {
  platformProjectId: string
  status: string
  onChanged?: () => void
  size?: 'sm' | 'md'
}

/** Archive / restore Collection for company managers (federation upsert). */
export function CollectionLifecycleActions({
  platformProjectId,
  status,
  onChanged,
  size = 'sm',
}: CollectionLifecycleActionsProps) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const archived = status === PLATFORM_PROJECT_STATUS.ARCHIVED

  const run = async (next: typeof PLATFORM_PROJECT_STATUS.ACTIVE | typeof PLATFORM_PROJECT_STATUS.ARCHIVED) => {
    const confirmKey =
      next === PLATFORM_PROJECT_STATUS.ARCHIVED
        ? 'projects.lifecycle.archiveConfirm'
        : 'projects.lifecycle.restoreConfirm'
    if (!window.confirm(t(confirmKey))) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProject(platformProjectId), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || t('projects.lifecycle.error'))
      }
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.lifecycle.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="plexon-collection-lifecycle">
      {archived ? (
        <Button
          variant="primary"
          size={size}
          disabled={busy}
          onClick={() => void run(PLATFORM_PROJECT_STATUS.ACTIVE)}
        >
          {busy ? t('common.loading') : t('projects.lifecycle.restore')}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size={size}
          disabled={busy}
          onClick={() => void run(PLATFORM_PROJECT_STATUS.ARCHIVED)}
        >
          {busy ? t('common.loading') : t('projects.lifecycle.archive')}
        </Button>
      )}
      {error ? (
        <span className="plexon-collection-lifecycle-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
