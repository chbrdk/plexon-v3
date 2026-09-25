'use client'

/**
 * Collection team + invites on Collection home (Enterprise E1).
 * APIs: specs/api/collection-members.md · collection-invites.md
 */

import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Chip, Field, Input, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  apiPlatformProvisioningCollectionInvite,
  apiPlatformProvisioningCollectionInvites,
  apiPlatformProvisioningCollectionMember,
  apiPlatformProvisioningCollectionMembers,
} from '@/lib/constants'

type MemberItem = {
  userId: string
  email: string
  name: string | null
  role: string
  source: string
}

type InviteItem = {
  id: string
  role: string
  expiresAt: string
  useCount: number
  maxUses: number | null
  createdAt: string
}

export function CollectionTeamPanel({ platformProjectId }: { platformProjectId: string }) {
  const { t } = useI18n()
  const [members, setMembers] = useState<MemberItem[]>([])
  const [invites, setInvites] = useState<InviteItem[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(apiPlatformProvisioningCollectionMembers(platformProjectId), {
          credentials: 'same-origin',
        }),
        fetch(apiPlatformProvisioningCollectionInvites(platformProjectId), {
          credentials: 'same-origin',
        }),
      ])
      if (!membersRes.ok) {
        const body = await membersRes.text()
        throw new Error(body || membersRes.statusText)
      }
      const membersJson = (await membersRes.json()) as { items?: MemberItem[] }
      setMembers(Array.isArray(membersJson.items) ? membersJson.items : [])
      if (invitesRes.status === 403) {
        setCanManage(false)
        setInvites([])
      } else if (invitesRes.ok) {
        setCanManage(true)
        const invitesJson = (await invitesRes.json()) as { items?: InviteItem[] }
        setInvites(Array.isArray(invitesJson.items) ? invitesJson.items : [])
      } else {
        setCanManage(false)
        setInvites([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.teamLoadError'))
    } finally {
      setLoading(false)
    }
  }, [platformProjectId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function addMember() {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const res = await fetch(apiPlatformProvisioningCollectionMembers(platformProjectId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: 'member' }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; status?: string }
      if (!res.ok) throw new Error(body.error || res.statusText)
      setEmail('')
      setNotice(
        body.status === 'already_member'
          ? t('projects.detail.teamAlreadyMember')
          : t('projects.detail.teamMemberAdded'),
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.teamAddError'))
    } finally {
      setBusy(false)
    }
  }

  async function revokeMember(userId: string) {
    if (!window.confirm(t('projects.detail.teamRevokeConfirm'))) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProvisioningCollectionMember(platformProjectId, userId), {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || res.statusText)
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.teamRevokeError'))
    } finally {
      setBusy(false)
    }
  }

  async function createInvite() {
    setBusy(true)
    setInviteUrl(null)
    setNotice(null)
    setError(null)
    try {
      const payload: { role: string; toEmail?: string } = { role: 'member' }
      const trimmed = inviteEmail.trim()
      if (trimmed) payload.toEmail = trimmed
      const res = await fetch(apiPlatformProvisioningCollectionInvites(platformProjectId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        inviteUrl?: string
        emailedTo?: string
      }
      if (!res.ok) throw new Error(body.error || res.statusText)
      setInviteUrl(body.inviteUrl ?? null)
      setInviteEmail('')
      setNotice(
        body.emailedTo
          ? t('projects.detail.teamInviteEmailed').replace('{email}', body.emailedTo)
          : t('projects.detail.teamInviteCreated'),
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.teamInviteError'))
    } finally {
      setBusy(false)
    }
  }

  async function revokeInvite(inviteId: string) {
    if (!window.confirm(t('projects.detail.teamInviteRevokeConfirm'))) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProvisioningCollectionInvite(platformProjectId, inviteId), {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || res.statusText)
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.teamInviteRevokeError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="plexon-dash-band"
      data-section="collection-team"
      data-testid="collection-team-panel"
      aria-label={t('projects.detail.teamTitle')}
    >
      <header className="plexon-dash-band-head">
        <div>
          <Text role="headline" as="h2">
            {t('projects.detail.teamTitle')}
          </Text>
          <Text role="meta" as="p">
            {t('projects.detail.teamSubtitle')}
          </Text>
        </div>
      </header>

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {!loading ? (
        <>
          <ul className="plexon-project-bindings" data-testid="collection-team-members">
            {members.length === 0 ? (
              <li>
                <Text role="meta">{t('projects.detail.teamEmpty')}</Text>
              </li>
            ) : (
              members.map((m) => (
                <li key={m.userId} className="plexon-project-binding">
                  <div className="plexon-project-binding__main">
                    <Text role="title" as="h4">
                      {m.name || m.email}
                    </Text>
                    <Text role="meta">
                      {[m.name ? m.email : null, m.role, m.source === 'creator' ? t('projects.detail.teamCreator') : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </div>
                  {canManage && m.source !== 'creator' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void revokeMember(m.userId)}
                    >
                      {t('projects.detail.teamRevoke')}
                    </Button>
                  ) : (
                    <Chip static size="sm">
                      {m.role}
                    </Chip>
                  )}
                </li>
              ))
            )}
          </ul>

          {canManage ? (
            <div className="plexon-collection-team-forms">
              <div className="plexon-collection-team-form-row">
                <Field label={t('projects.detail.teamAddEmail')}>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="off"
                    placeholder="name@firma.de"
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="md"
                  disabled={busy || !email.trim()}
                  onClick={() => void addMember()}
                >
                  {t('projects.detail.teamAdd')}
                </Button>
              </div>

              <div className="plexon-collection-team-form-row">
                <Field label={t('projects.detail.teamInviteEmail')}>
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    type="email"
                    autoComplete="off"
                    placeholder={t('projects.detail.teamInviteEmailOptional')}
                  />
                </Field>
                <Button variant="ghost" size="md" disabled={busy} onClick={() => void createInvite()}>
                  {t('projects.detail.teamInviteCreate')}
                </Button>
              </div>

              {inviteUrl ? (
                <Text role="meta" as="p" data-testid="collection-invite-url">
                  {t('projects.detail.teamInviteLink')}: {inviteUrl}
                </Text>
              ) : null}

              {invites.length > 0 ? (
                <div className="plexon-capability-catalog-block">
                  <Text role="title" as="h4">
                    {t('projects.detail.teamOpenInvites')}
                  </Text>
                  <ul className="plexon-project-bindings">
                    {invites.map((inv) => (
                      <li key={inv.id} className="plexon-project-binding">
                        <div className="plexon-project-binding__main">
                          <Text role="meta">
                            {inv.role} · {new Date(inv.expiresAt).toLocaleDateString()} ·{' '}
                            {inv.useCount}
                            {inv.maxUses != null ? `/${inv.maxUses}` : ''}
                          </Text>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void revokeInvite(inv.id)}
                        >
                          {t('projects.detail.teamInviteRevoke')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
