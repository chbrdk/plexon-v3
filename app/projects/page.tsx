'use client'

import { useCallback, useState } from 'react'
import { SectionChrome, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { CollectionProjectsList } from '@/components/projects/CollectionProjectsList'
import { CreateCollectionProjectForm } from '@/components/projects/CreateCollectionProjectForm'

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

      <section className="plexon-settings-section" aria-label={t('projects.hub.createTitle')}>
        <CreateCollectionProjectForm onCreated={() => bumpList()} />
      </section>

      <section className="plexon-settings-section" aria-label={t('projects.hub.listTitle')}>
        <SectionChrome quiet title={t('projects.hub.listTitle')} as="h3" />
        <CollectionProjectsList refreshKey={refreshKey} />
      </section>
    </div>
  )
}
