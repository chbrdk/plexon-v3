'use client'

import { useEffect, useState } from 'react'
import {
  HubIndexLayoutSwitch as DsHubIndexLayoutSwitch,
  type HubIndexLayout,
} from '@/lib/msqdx-ui'
import { HUB_INDEX_LAYOUT_KEY } from '@/lib/constants'
import { useI18n } from '@/components/i18n/I18nProvider'

export type { HubIndexLayout }

export function readHubIndexLayout(): HubIndexLayout {
  if (typeof window === 'undefined') return 'cards'
  try {
    const raw = window.sessionStorage.getItem(HUB_INDEX_LAYOUT_KEY)
    return raw === 'list' ? 'list' : 'cards'
  } catch {
    return 'cards'
  }
}

export function writeHubIndexLayout(next: HubIndexLayout): void {
  try {
    window.sessionStorage.setItem(HUB_INDEX_LAYOUT_KEY, next)
  } catch {
    /* ignore */
  }
}

export function useHubIndexLayout(): {
  layout: HubIndexLayout
  setLayout: (next: HubIndexLayout) => void
} {
  const [layout, setLayoutState] = useState<HubIndexLayout>('cards')

  useEffect(() => {
    setLayoutState(readHubIndexLayout())
  }, [])

  function setLayout(next: HubIndexLayout) {
    setLayoutState(next)
    writeHubIndexLayout(next)
  }

  return { layout, setLayout }
}

export function HubIndexLayoutSwitch({
  layout,
  onChange,
}: {
  layout: HubIndexLayout
  onChange: (next: HubIndexLayout) => void
}) {
  const { t } = useI18n()
  return (
    <DsHubIndexLayoutSwitch
      value={layout}
      onChange={onChange}
      aria-label={t('projects.hub.layoutAria')}
      cardsLabel={t('projects.hub.layoutCards')}
      listLabel={t('projects.hub.layoutList')}
    />
  )
}
