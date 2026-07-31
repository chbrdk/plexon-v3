'use client'

import { Field, Select } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'

export type ProjectInsightOption = {
  platformProjectId: string
  name: string
  domain?: string | null
}

type ProjectContextChipProps = {
  projects: ProjectInsightOption[]
  value: string | null
  onChange: (platformProjectId: string | null) => void
}

/** Collection picker for assistant — always `platform_projects.id`, never product-local ids. */
export function ProjectContextChip({ projects, value, onChange }: ProjectContextChipProps) {
  const { t } = useI18n()

  const options = [
    { value: '', label: t('assistant.noProjects') },
    ...projects.map((p) => ({
      value: p.platformProjectId,
      label: p.domain ? `${p.name} · ${p.domain}` : p.name,
    })),
  ]

  return (
    <div className="plexon-assistant-project-context">
      <Field label={t('assistant.projectContext')} layout="inline" size="sm">
        <Select
          options={options}
          value={value ?? ''}
          onChange={(next) => onChange(next.trim() ? next : null)}
          aria-label={t('assistant.projectContext')}
          placeholder={t('assistant.noProjects')}
        />
      </Field>
    </div>
  )
}
