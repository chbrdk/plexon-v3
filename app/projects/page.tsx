'use client'

import { useCallback, useState } from 'react'
import { SectionChrome, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { CollectionProjectsList } from '@/components/projects/CollectionProjectsList'

export default function ProjectsHubPage() {
  const { t } = useI18n()
  const [refreshKey, setRefreshKey] = useState(0)

  const bumpList = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="plexon-magazine" data-section="projects-hub">
      <SectionChrome
        title={t('projects.hub.title')}
        meta={<Text role="meta">{t('projects.hub.subtitle')}</Text>}
      />

      <CollectionProjectsList
        refreshKey={refreshKey}
        showCreateCard
        enableLifecycle
        onCreated={() => bumpList()}
        onLifecycleChange={bumpList}
      />
    </div>
  )
}
