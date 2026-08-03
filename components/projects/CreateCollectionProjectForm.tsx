'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Dialog, Field, Input, Select, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  API_PLATFORM_ME_COMPANIES,
  apiPlatformCompanyPlatformProjects,
  pathPlatformProjectDashboard,
} from '@/lib/constants'

type CompanyOption = { id: string; name: string }

type CreateCollectionProjectFormProps = {
  onCreated?: (platformProjectId: string) => void
  onClose?: () => void
  /** Hide chrome when embedded in Dialog (actions live in Dialog footer). */
  embedded?: boolean
  submitting?: boolean
  onSubmittingChange?: (submitting: boolean) => void
  formId?: string
}

export function CreateCollectionProjectForm({
  onCreated,
  onClose,
  embedded = false,
  submitting: controlledSubmitting,
  onSubmittingChange,
  formId = 'plexon-collection-create-form',
}: CreateCollectionProjectFormProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [companyId, setCompanyId] = useState('')
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [localSubmitting, setLocalSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitting = controlledSubmitting ?? localSubmitting

  function setSubmitting(next: boolean) {
    setLocalSubmitting(next)
    onSubmittingChange?.(next)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCompaniesLoading(true)
      try {
        const res = await fetch(API_PLATFORM_ME_COMPANIES, { credentials: 'same-origin' })
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
        const data = (await res.json()) as { items?: CompanyOption[] }
        const items = Array.isArray(data.items) ? data.items : []
        if (cancelled) return
        setCompanies(items)
        if (items.length >= 1) setCompanyId(items[0].id)
      } catch (e) {
        if (!cancelled) {
          setCompanies([])
          setError(e instanceof Error ? e.message : t('projects.hub.companiesError'))
        }
      } finally {
        if (!cancelled) setCompaniesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  const canSubmit =
    Boolean(name.trim()) && Boolean(companyId) && !submitting && !companiesLoading

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformCompanyPlatformProjects(companyId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim() || null,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        id?: string
        error?: string
      }
      if (!res.ok || !body.id) {
        throw new Error(body.error || t('projects.hub.createError'))
      }
      onCreated?.(body.id)
      onClose?.()
      router.push(pathPlatformProjectDashboard(body.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.hub.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!companiesLoading && companies.length === 0) {
    return (
      <Alert tone="info" className="plexon-collection-create-blocked">
        {t('projects.hub.noCompany')}
      </Alert>
    )
  }

  return (
    <form
      id={formId}
      className={embedded ? 'plexon-edit-form' : 'plexon-settings-fields plexon-collection-create'}
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <p className="plexon-edit-lede">{t('projects.hub.createHint')}</p>

      {companies.length > 1 ? (
        <Field
          label={t('projects.hub.company')}
          size="md"
          htmlFor="collection-create-company"
          className="plexon-edit-field"
        >
          <Select
            id="collection-create-company"
            value={companyId}
            disabled={companiesLoading || submitting}
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(value) => setCompanyId(value)}
          />
        </Field>
      ) : null}

      <Field
        label={t('projects.hub.name')}
        size="md"
        htmlFor="collection-create-name"
        className="plexon-edit-field plexon-edit-field--hero"
      >
        <Input
          id="collection-create-name"
          size="md"
          block
          value={name}
          disabled={submitting}
          autoComplete="off"
          placeholder={t('projects.hub.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field
        label={t('projects.hub.domain')}
        size="md"
        htmlFor="collection-create-domain"
        className="plexon-edit-field"
      >
        <Input
          id="collection-create-domain"
          size="md"
          block
          value={domain}
          disabled={submitting}
          autoComplete="off"
          placeholder={t('projects.hub.domainPlaceholder')}
          onChange={(e) => setDomain(e.target.value)}
        />
      </Field>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {!embedded ? (
        <div className="plexon-collection-create-actions">
          <Button type="submit" variant="primary" size="md" disabled={!canSubmit}>
            {submitting ? t('common.loading') : t('projects.hub.createSubmit')}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

/** First grid tile — Audion-style create card that opens the create dialog. */
export function CreateCollectionProjectCard({
  onCreated,
}: {
  onCreated?: (platformProjectId: string) => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formId = 'plexon-collection-create-dialog-form'

  return (
    <>
      <button
        type="button"
        className="plexon-collection-card plexon-collection-card--create"
        onClick={() => setOpen(true)}
      >
        <span className="plexon-collection-card-kicker">{'\u00a0'}</span>
        <Text role="headline" as="span" className="plexon-collection-card-title">
          {t('projects.hub.createTitle')}
        </Text>
        <Text role="meta" as="span" className="plexon-collection-card-hint">
          {t('projects.hub.createHint')}
        </Text>
      </button>

      <Dialog
        open={open}
        onClose={() => {
          if (!submitting) setOpen(false)
        }}
        title={t('projects.hub.createTitle')}
        className="plexon-edit-dialog"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" form={formId} variant="primary" size="md" disabled={submitting}>
              {submitting ? t('common.loading') : t('projects.hub.createSubmit')}
            </Button>
          </>
        }
      >
        <CreateCollectionProjectForm
          embedded
          formId={formId}
          submitting={submitting}
          onSubmittingChange={setSubmitting}
          onCreated={onCreated}
          onClose={() => setOpen(false)}
        />
      </Dialog>
    </>
  )
}
