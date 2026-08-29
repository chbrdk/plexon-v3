'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Alert,
  AccentSwatchGroup,
  applyAccentPreference,
  applyThemePreference,
  Avatar,
  Button,
  Field,
  Input,
  migrateLegacyAccent,
  migrateLegacyThemeId,
  resolveAccentOption,
  SettingsBand,
  SettingsShell,
  Spinner,
  Text,
  ToggleGroup,
  type AccentPreference,
  type ThemePreference,
} from '@msqdx/ui'
import { persistAccentPreference } from '@/lib/brand-color-utils'
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
  themePreference?: ThemePreference
  accentPreference?: AccentPreference
}

type ApiTokenRow = { id: string; name?: string; createdAt: string }

const THEME_STORAGE_KEY = shellPaths.themeStorageKey

function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return shellPaths.defaultTheme
  return migrateLegacyThemeId(window.localStorage.getItem(THEME_STORAGE_KEY))
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { t, setLocale: setUiLocale } = useI18n()
  const [mounted, setMounted] = useState(false)
  const themeCleanup = useRef<(() => void) | undefined>(undefined)

  const [profile, setProfile] = useState<ProfileUser | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [locale, setLocale] = useState('de')
  const [themePreference, setThemePreference] = useState<ThemePreference>(shellPaths.defaultTheme)
  const [accentPreference, setAccentPreference] = useState<AccentPreference>('green')

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

  const paintTheme = useCallback((next: ThemePreference) => {
    themeCleanup.current?.()
    themeCleanup.current = applyThemePreference(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const paintAccent = useCallback((next: AccentPreference) => {
    applyAccentPreference(next)
    persistAccentPreference(next)
  }, [])

  useEffect(() => {
    setMounted(true)
    const next = readStoredThemePreference()
    setThemePreference(next)
    paintTheme(next)
    const accent = migrateLegacyAccent(
      typeof window !== 'undefined' ? window.localStorage.getItem('plexon-sidebar-color') : null,
    )
    setAccentPreference(accent)
    paintAccent(accent)
    return () => themeCleanup.current?.()
  }, [paintTheme, paintAccent])

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
          const nextLocale = data.user.locale ?? 'de'
          setLocale(nextLocale)
          setUiLocale(nextLocale)
          const pref = migrateLegacyThemeId(data.user.themePreference)
          setThemePreference(pref)
          paintTheme(pref)
          const accent = migrateLegacyAccent(data.user.accentPreference)
          setAccentPreference(accent)
          paintAccent(accent)
        }
      })
      .catch(() => setProfile(null))
    fetchApiTokens()
  }, [status, session?.user?.id, fetchApiTokens, paintTheme, paintAccent, setUiLocale])

  const avatarName = (name || profile?.email || session?.user?.email || 'P').trim()
  const accentOption = resolveAccentOption(accentPreference)

  async function patchPrefs(body: Record<string, unknown>) {
    const res = await fetch(API_AUTH_PROFILE, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? t('settings.messages.profileSaveFailed'))
    if (data.user) setProfile(data.user)
    return data.user as ProfileUser | undefined
  }

  async function handleThemeChange(next: string) {
    const pref = migrateLegacyThemeId(next)
    setThemePreference(pref)
    paintTheme(pref)
    if (status !== 'authenticated') return
    try {
      await patchPrefs({ themePreference: pref })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'))
    }
  }

  async function handleAccentChange(next: AccentPreference) {
    setAccentPreference(next)
    paintAccent(next)
    if (status !== 'authenticated') return
    try {
      await patchPrefs({ accentPreference: next })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'))
    }
  }

  async function handleLocaleChange(next: string) {
    setLocale(next)
    setUiLocale(next)
    if (status !== 'authenticated') return
    try {
      await patchPrefs({ locale: next })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'))
    }
  }

  async function handleSaveProfile() {
    setError(null)
    setSuccess(null)
    setSavingProfile(true)
    try {
      await patchPrefs({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        avatar_url: avatarUrl.trim() || null,
        locale: locale || undefined,
        themePreference,
      })
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

  const themeLabels: Record<ThemePreference, string> = {
    light: t('settings.appearance.light') || 'Light',
    dark: t('settings.appearance.dark') || 'Dark',
    auto: t('settings.appearance.auto') || 'Auto',
  }

  return (
    <div className="plexon-magazine plexon-settings">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="ok">{success}</Alert> : null}

      <SettingsShell
        labels={{
          account: t('settings.session.title'),
          profile: t('settings.profile.title'),
          appearance: t('settings.appearance.title'),
          language: t('settings.profile.language'),
        }}
        account={
          <>
            <dl className="ds-settings-account-dl">
              {session?.user?.email ? (
                <>
                  <dt>{t('settings.profile.email')}</dt>
                  <dd>{session.user.email}</dd>
                </>
              ) : null}
            </dl>
            <Button type="button" variant="subtle" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? t('common.loading') : t('settings.session.logout')}
            </Button>
          </>
        }
        profile={
          <div className="ds-settings-profile-row plexon-settings-profile-row">
            <div className="ds-settings-profile-mark">
              <Avatar
                name={avatarName}
                src={avatarUrl || undefined}
                size="lg"
                accent={accentOption.preview}
                accentContrast={accentOption.textColor}
              />
              <Field label={t('settings.profile.avatarUrl')} size="sm">
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder={t('settings.profile.avatarUrlPlaceholder')}
                  block
                />
              </Field>
            </div>
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
              <Button type="button" variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? t('settings.profile.saving') : t('settings.profile.save')}
              </Button>
            </div>
          </div>
        }
        appearance={
          <div className="ds-settings-appearance-stack">
            <ToggleGroup
              className="theme-toggle"
              aria-label={t('settings.appearance.title')}
              value={themePreference}
              onChange={handleThemeChange}
              options={shellPaths.themeChoices.map((id) => ({
                value: id,
                label: themeLabels[id],
              }))}
            />
            <AccentSwatchGroup
              value={accentPreference}
              onChange={handleAccentChange}
              aria-label={t('settings.appearance.colorTitle') || 'Accent'}
              labels={{
                purple: 'Purple',
                blue: 'Blue',
                pink: 'Pink',
                orange: 'Orange',
                green: 'Green',
                yellow: 'Yellow',
                grey: 'Grey',
                ink: 'Ink',
              }}
            />
          </div>
        }
        language={
          <ToggleGroup
            aria-label={t('settings.profile.language')}
            value={locale}
            onChange={handleLocaleChange}
            options={[
              { value: 'de', label: t('language.de') },
              { value: 'en', label: t('language.en') },
            ]}
          />
        }
        extras={
          <>
            <SettingsBand title={t('settings.password.title')}>
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
            </SettingsBand>

            <SettingsBand title={t('settings.apiTokens.title')}>
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
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRevokeToken(token.id)}
                      >
                        {t('settings.apiTokens.revoke')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SettingsBand>

            <SettingsBand title={t('settings.about.title')}>
              <Text role="meta">{t('settings.about.body')}</Text>
            </SettingsBand>
          </>
        }
      />
    </div>
  )
}
