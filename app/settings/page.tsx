'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Alert,
  Avatar,
  Button,
  Field,
  Hint,
  Input,
  SectionChrome,
  Spinner,
  Text,
  ToggleGroup,
} from '@msqdx/ui'
import { BrandColorSelector } from '@/components/settings/BrandColorSelector'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  API_AUTH_CHANGE_PASSWORD,
  API_AUTH_PROFILE,
  API_AUTH_TOKENS,
  apiAuthTokenRevoke,
  PATH_LOGIN,
} from '@/lib/constants'
import { shellPaths } from '@/lib/shell-paths'

type ProfileUser = {
  id: string
  email?: string
  name?: string
  company?: string
  avatar_url?: string
  locale?: string
}

type ApiTokenRow = { id: string; name?: string; createdAt: string }

const THEME_STORAGE_KEY = 'plexon.v3.theme'
const THEME_LABELS: Record<(typeof shellPaths.themeChoices)[number], string> = {
  msqdx: 'Light',
  'msqdx-dark': 'Dark',
  'msqdx-v2': 'V2 light',
  'msqdx-v2-dark': 'V2 dark',
}

function readStoredTheme(): (typeof shellPaths.themeChoices)[number] {
  if (typeof window === 'undefined') return shellPaths.defaultTheme
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (raw && (shellPaths.themeChoices as readonly string[]).includes(raw)) {
    return raw as (typeof shellPaths.themeChoices)[number]
  }
  return shellPaths.defaultTheme
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { t, setLocale: setUiLocale } = useI18n()
  const [mounted, setMounted] = useState(false)

  const [profile, setProfile] = useState<ProfileUser | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [locale, setLocale] = useState('de')
  const [theme, setTheme] = useState<(typeof shellPaths.themeChoices)[number]>(shellPaths.defaultTheme)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [apiTokens, setApiTokens] = useState<ApiTokenRow[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [creatingToken, setCreatingToken] = useState(false)
  const [tokenName, setTokenName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const next = readStoredTheme()
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }, [])

  const fetchApiTokens = useCallback(() => {
    setLoadingTokens(true)
    fetch(API_AUTH_TOKENS)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.data)) setApiTokens(data.data)
      })
      .catch(() => setApiTokens([]))
      .finally(() => setLoadingTokens(false))
  }, [])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    fetch(API_AUTH_PROFILE)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user)
          setName(data.user.name ?? '')
          setEmail(data.user.email ?? '')
          setCompany(data.user.company ?? '')
          setAvatarUrl(data.user.avatar_url ?? '')
          setLocale(data.user.locale ?? 'de')
        }
      })
      .catch(() => setProfile(null))
    fetchApiTokens()
  }, [status, session?.user?.id, fetchApiTokens])

  const avatarName = (name || profile?.email || session?.user?.email || 'P').trim()

  function applyTheme(next: string) {
    if (!(shellPaths.themeChoices as readonly string[]).includes(next)) return
    const themeId = next as (typeof shellPaths.themeChoices)[number]
    setTheme(themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId)
  }

  async function handleSaveProfile() {
    setError(null)
    setSuccess(null)
    setSavingProfile(true)
    try {
      const res = await fetch(API_AUTH_PROFILE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          company: company.trim() || undefined,
          avatar_url: avatarUrl.trim() || null,
          locale: locale || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('settings.messages.profileSaveFailed'))
      setProfile(data.user)
      setSuccess(t('settings.messages.profileUpdated'))
      setUiLocale(locale)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordUpdate() {
    setError(null)
    setSuccess(null)
    if (!currentPassword || !newPassword) {
      setError(t('settings.messages.passwordMissing'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.messages.passwordMismatch'))
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch(API_AUTH_CHANGE_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('settings.messages.passwordError'))
      setSuccess(t('settings.messages.passwordUpdated'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.passwordError'))
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleCreateToken() {
    setError(null)
    setCreatingToken(true)
    try {
      const res = await fetch(API_AUTH_TOKENS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('settings.messages.profileError'))
      setNewToken(data.token)
      setTokenName('')
      fetchApiTokens()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'))
    } finally {
      setCreatingToken(false)
    }
  }

  async function handleRevokeToken(id: string) {
    if (!window.confirm(t('settings.apiTokens.revokeConfirm'))) return
    setError(null)
    try {
      const res = await fetch(apiAuthTokenRevoke(id), { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed')
      }
      setApiTokens((prev) => prev.filter((tok) => tok.id !== id))
      if (newToken) setNewToken(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'))
    }
  }

  function handleCopyToken() {
    if (!newToken) return
    void navigator.clipboard.writeText(newToken).then(() => setSuccess(t('settings.apiTokens.newTokenCopied')))
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut({ redirect: false })
      router.replace(PATH_LOGIN)
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  if (!mounted || status === 'loading') {
    return (
      <div className="plexon-magazine plexon-settings">
        <Spinner />
        <Text role="meta">{t('common.loading')}</Text>
      </div>
    )
  }

  return (
    <div className="plexon-magazine plexon-settings">
      <SectionChrome
        title={t('settings.title')}
        meta={<Text role="meta">{t('settings.subtitle')}</Text>}
      />

      <Hint panel>{t('settings.subtitle')}</Hint>

      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : null}
      {success ? (
        <Alert tone="ok">{success}</Alert>
      ) : null}

      <section className="plexon-settings-section">
        <SectionChrome quiet title={t('settings.profile.title')} as="h2" />
        <Text role="meta">{t('settings.profile.subtitle')}</Text>
        <div className="plexon-settings-profile-row">
          <Avatar name={avatarName} src={avatarUrl || undefined} size="lg" />
          <div className="plexon-settings-fields">
            <Field label={t('settings.profile.name')} size="md">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.profile.namePlaceholder')}
                block
              />
            </Field>
            <Field label={t('settings.profile.email')} size="md">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('settings.profile.emailPlaceholder')}
                block
              />
            </Field>
            <Field label={t('settings.profile.company')} size="md">
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t('settings.profile.companyPlaceholder')}
                block
              />
            </Field>
            <Field label={t('settings.profile.avatarUrl')} size="md">
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder={t('settings.profile.avatarUrlPlaceholder')}
                block
              />
            </Field>
            <Button type="button" variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? t('settings.profile.saving') : t('settings.profile.save')}
            </Button>
          </div>
        </div>
      </section>

      <section className="plexon-settings-section">
        <SectionChrome quiet title={t('settings.profile.language')} as="h2" />
        <ToggleGroup
          aria-label={t('settings.profile.language')}
          value={locale}
          onChange={(next) => {
            setLocale(next)
            setUiLocale(next)
          }}
          options={[
            { value: 'de', label: t('language.de') },
            { value: 'en', label: t('language.en') },
          ]}
        />
      </section>

      <section className="plexon-settings-section">
        <SectionChrome quiet title={t('settings.appearance.title')} as="h2" />
        <Text role="meta">{t('settings.appearance.subtitle')}</Text>
        <ToggleGroup
          className="theme-toggle"
          aria-label="Theme"
          value={theme}
          onChange={applyTheme}
          options={shellPaths.themeChoices.map((id) => ({
            value: id,
            label: THEME_LABELS[id],
          }))}
        />
        <div className="plexon-settings-brand">
          <BrandColorSelector />
        </div>
      </section>

      <section className="plexon-settings-section">
        <SectionChrome quiet title={t('settings.password.title')} as="h2" />
        <div className="plexon-settings-fields">
          <Field label={t('settings.password.current')} size="md">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              block
            />
          </Field>
          <Field label={t('settings.password.new')} hint={t('settings.password.newRequirements')} size="md">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              block
            />
          </Field>
          <Field label={t('settings.password.confirm')} size="md">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              block
            />
          </Field>
          <Button type="button" variant="ghost" onClick={handlePasswordUpdate} disabled={savingPassword}>
            {savingPassword ? t('settings.password.ctaSaving') : t('settings.password.cta')}
          </Button>
        </div>
      </section>

      <section className="plexon-settings-section">
        <SectionChrome quiet title={t('settings.apiTokens.title')} as="h2" />
        <Text role="meta">{t('settings.apiTokens.subtitle')}</Text>

        {newToken ? (
          <div className="plexon-settings-token-reveal">
            <Text role="title">{t('settings.apiTokens.newTokenTitle')}</Text>
            <code className="plexon-settings-token-code">{newToken}</code>
            <Text role="hint">{t('settings.apiTokens.newTokenWarning')}</Text>
            <div className="plexon-settings-actions">
              <Button type="button" variant="ghost" size="sm" onClick={handleCopyToken}>
                {t('settings.apiTokens.newTokenCopy')}
              </Button>
              <Button type="button" variant="link" size="sm" onClick={() => setNewToken(null)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="plexon-settings-token-create">
            <Field label={t('settings.apiTokens.nameLabel')} size="sm">
              <Input
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder={t('settings.apiTokens.namePlaceholder')}
                block
              />
            </Field>
            <Button type="button" variant="primary" onClick={handleCreateToken} disabled={creatingToken}>
              {creatingToken ? t('settings.apiTokens.creating') : t('settings.apiTokens.create')}
            </Button>
          </div>
        )}

        <Text role="label">{t('settings.apiTokens.listTitle')}</Text>
        {loadingTokens ? (
          <Text role="meta">{t('common.loading')}</Text>
        ) : apiTokens.length === 0 ? (
          <Text role="meta">{t('settings.apiTokens.empty')}</Text>
        ) : (
          <ul className="plexon-settings-token-list">
            {apiTokens.map((token) => (
              <li key={token.id} className="plexon-settings-token-row">
                <div>
                  <Text role="body">{token.name || token.id.slice(0, 8)}</Text>
                  <Text role="meta">{new Date(token.createdAt).toLocaleString()}</Text>
                </div>
                <Button type="button" variant="danger" size="sm" onClick={() => handleRevokeToken(token.id)}>
                  {t('settings.apiTokens.revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="plexon-settings-section">
        <SectionChrome quiet title={t('settings.session.title')} as="h2" />
        <Text role="meta">{t('settings.session.subtitle')}</Text>
        <Button type="button" variant="subtle" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? t('common.loading') : t('settings.session.logout')}
        </Button>
      </section>

      <section className="plexon-settings-section">
        <SectionChrome quiet title={t('settings.about.title')} as="h2" />
        <Text role="body">{t('settings.about.body')}</Text>
      </section>
    </div>
  )
}
