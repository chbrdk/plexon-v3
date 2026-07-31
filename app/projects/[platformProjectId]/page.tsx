'use client'

import { useParams } from 'next/navigation'
import { PlatformProjectDashboard } from '@/components/products/PlatformProjectDashboard'
import { Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function PlatformProjectDashboardPage() {
  const { t } = useI18n()
  const params = useParams<{ platformProjectId: string }>()
  const platformProjectId = params.platformProjectId

  if (!platformProjectId) {
    return (
      <div className="plexon-magazine">
        <Text role="meta">{t('projects.detail.missingId')}</Text>
      </div>
    )
  }

  return <PlatformProjectDashboard platformProjectId={platformProjectId} />
}
