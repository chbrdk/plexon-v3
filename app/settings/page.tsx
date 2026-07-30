'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { Box, Stack } from '@mui/material';
import {
  MsqdxTypography,
  MsqdxButton,
  MsqdxCard,
  MsqdxDivider,
  MsqdxAvatar,
  MsqdxFormField,
  MsqdxSelect,
} from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { SelectChangeEvent } from '@mui/material';
import { BrandColorSelector } from '@/components/settings/BrandColorSelector';
import { FORM_FIELD_ACCENT_SX } from '@/lib/theme-accent';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  API_AUTH_PROFILE,
  API_AUTH_CHANGE_PASSWORD,
  API_AUTH_TOKENS,
  apiAuthTokenRevoke,
  PATH_LOGIN,
} from '@/lib/constants';

type ProfileUser = {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  avatar_url?: string;
  locale?: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, setLocale: setUiLocale } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [locale, setLocale] = useState('de');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  type ApiTokenRow = { id: string; name?: string; createdAt: string };
  const [apiTokens, setApiTokens] = useState<ApiTokenRow[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  const languageOptions = [
    { value: 'de', label: t('language.de') },
    { value: 'en', label: t('language.en') },
  ];

  const fetchApiTokens = () => {
    setLoadingTokens(true);
    fetch(API_AUTH_TOKENS)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.data)) setApiTokens(data.data);
      })
      .catch(() => setApiTokens([]))
      .finally(() => setLoadingTokens(false));
  };

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    fetch(API_AUTH_PROFILE)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name ?? '');
          setEmail(data.user.email ?? '');
          setCompany(data.user.company ?? '');
          setAvatarUrl(data.user.avatar_url ?? '');
          setLocale(data.user.locale ?? 'de');
        }
      })
      .catch(() => setProfile(null));
    fetchApiTokens();
  }, [status, session?.user?.id]);

  const initials = (() => {
    const base = (name || profile?.email || session?.user?.email || 'A').trim();
    return base
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join('');
  })();

  const handleSaveProfile = async () => {
    setError(null);
    setSuccess(null);
    setSavingProfile(true);
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
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t('settings.messages.profileSaveFailed'));
      setProfile(data.user);
      setSuccess(t('settings.messages.profileUpdated'));
      setUiLocale(locale);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setError(null);
    setSuccess(null);
    if (!currentPassword || !newPassword) {
      setError(t('settings.messages.passwordMissing'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.messages.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(API_AUTH_CHANGE_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t('settings.messages.passwordError'));
      setSuccess(t('settings.messages.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.passwordError'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCreateToken = async () => {
    setError(null);
    setCreatingToken(true);
    try {
      const res = await fetch(API_AUTH_TOKENS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tokenName.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t('settings.messages.profileError'));
      setNewToken(data.token);
      setTokenName('');
      fetchApiTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'));
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!window.confirm(t('settings.apiTokens.revokeConfirm'))) return;
    setError(null);
    try {
      const res = await fetch(apiAuthTokenRevoke(id), { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed');
      }
      setApiTokens((prev) => prev.filter((tok) => tok.id !== id));
      if (newToken) setNewToken(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.messages.profileError'));
    }
  };

  const handleCopyToken = () => {
    if (!newToken) return;
    void navigator.clipboard.writeText(newToken).then(() => setSuccess(t('settings.apiTokens.newTokenCopied')));
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.replace(PATH_LOGIN);
    router.refresh();
  };

  if (!mounted || status === 'loading') {
    return (
      <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }} suppressHydrationWarning>
        <MsqdxTypography>{t('common.loading')}</MsqdxTypography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
      <Box sx={{ mb: MSQDX_SPACING.scale.md }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: MSQDX_SPACING.scale.xs }}>
          <MsqdxTypography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            {t('settings.title')}
          </MsqdxTypography>
          <InfoTooltip title={t('info.settings')} ariaLabel={t('common.info')} />
        </Box>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {t('settings.subtitle')}
        </MsqdxTypography>
      </Box>

      {(error ?? success) && (
        <Box
          sx={{
            mb: 'var(--msqdx-spacing-md)',
            p: 'var(--msqdx-spacing-sm)',
            borderRadius: 'var(--msqdx-radius-sm)',
            bgcolor: error ? 'error.light' : 'success.light',
            color: error ? 'error.contrastText' : 'success.contrastText',
          }}
        >
          <MsqdxTypography variant="body2">{error ?? success}</MsqdxTypography>
        </Box>
      )}

      <Stack sx={{ gap: 'var(--msqdx-spacing-lg)' }}>
        {/* Profil */}
        <MsqdxCard
          variant="flat"
          borderRadius="button"
          sx={{
            p: 'var(--msqdx-spacing-md)',
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-on-light)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 'var(--msqdx-spacing-lg)', alignItems: 'center' }}>
            <MsqdxAvatar
              src={avatarUrl || undefined}
              size="xl"
              sx={{
                width: 72,
                height: 72,
                bgcolor: 'var(--color-secondary-dx-pink-tint)',
                color: 'var(--color-text-primary)',
              }}
            >
              {initials}
            </MsqdxAvatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
                <MsqdxTypography variant="h6" weight="semibold">
                  {t('settings.profile.title')}
                </MsqdxTypography>
                <InfoTooltip title={t('info.profile')} ariaLabel={t('common.info')} />
              </Box>
              <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                {t('settings.profile.subtitle')}
              </MsqdxTypography>
            </Box>
          </Stack>
          <MsqdxDivider spacing="lg" />
          <Stack spacing={2}>
            <MsqdxFormField
              label={t('settings.profile.name')}
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder={t('settings.profile.namePlaceholder')}
              fullWidth
              sx={FORM_FIELD_ACCENT_SX}
            />
            <MsqdxFormField
              label={t('settings.profile.email')}
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder={t('settings.profile.emailPlaceholder')}
              fullWidth
              sx={FORM_FIELD_ACCENT_SX}
            />
            <MsqdxFormField
              label={t('settings.profile.company')}
              value={company}
              onChange={(e) => setCompany((e.target as HTMLInputElement).value)}
              placeholder={t('settings.profile.companyPlaceholder')}
              fullWidth
              sx={FORM_FIELD_ACCENT_SX}
            />
            <MsqdxFormField
              label={t('settings.profile.avatarUrl')}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl((e.target as HTMLInputElement).value)}
              placeholder={t('settings.profile.avatarUrlPlaceholder')}
              fullWidth
              sx={FORM_FIELD_ACCENT_SX}
            />
            <MsqdxSelect
              label={t('settings.profile.language')}
              value={locale}
              onChange={(e: SelectChangeEvent<unknown>) => setLocale(e.target.value as string)}
              options={languageOptions}
              size="small"
              sx={FORM_FIELD_ACCENT_SX}
            />
            <MsqdxButton variant="contained" onClick={handleSaveProfile} disabled={savingProfile} sx={{ alignSelf: 'flex-start' }}>
              {savingProfile ? t('settings.profile.saving') : t('settings.profile.save')}
            </MsqdxButton>
          </Stack>
        </MsqdxCard>

        {/* Erscheinungsbild */}
        <MsqdxCard
          variant="flat"
          borderRadius="button"
          sx={{
            p: 'var(--msqdx-spacing-md)',
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-on-light)',
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
            <MsqdxTypography variant="h6" weight="semibold">
              {t('settings.appearance.title')}
            </MsqdxTypography>
            <InfoTooltip title={t('info.appearance')} ariaLabel={t('common.info')} />
          </Box>
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 'var(--msqdx-spacing-md)' }}>
            {t('settings.appearance.subtitle')}
          </MsqdxTypography>
          <BrandColorSelector />
        </MsqdxCard>

        {/* Passwort ändern */}
        <MsqdxCard
          variant="flat"
          borderRadius="button"
          sx={{
            p: 'var(--msqdx-spacing-md)',
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-on-light)',
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-sm)' }}>
            <MsqdxTypography variant="h6" weight="semibold">
              {t('settings.password.title')}
            </MsqdxTypography>
            <InfoTooltip title={t('info.password')} ariaLabel={t('common.info')} />
          </Box>
          <Stack sx={{ gap: 'var(--msqdx-spacing-md)' }}>
            <MsqdxFormField
              label={t('settings.password.current')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              type="password"
              fullWidth
              sx={FORM_FIELD_ACCENT_SX}
            />
            <Box>
              <MsqdxFormField
                label={t('settings.password.new')}
                value={newPassword}
                onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                type="password"
                fullWidth
                sx={FORM_FIELD_ACCENT_SX}
              />
              <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'var(--color-text-muted-on-light)' }}>
                {t('settings.password.newRequirements')}
              </MsqdxTypography>
            </Box>
            <MsqdxFormField
              label={t('settings.password.confirm')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
              type="password"
              fullWidth
              sx={FORM_FIELD_ACCENT_SX}
            />
            <MsqdxButton variant="outlined" onClick={handlePasswordUpdate} disabled={savingPassword} sx={{ alignSelf: 'flex-start' }}>
              {savingPassword ? t('settings.password.ctaSaving') : t('settings.password.cta')}
            </MsqdxButton>
          </Stack>
        </MsqdxCard>

        {/* API-Tokens */}
        <MsqdxCard
          variant="flat"
          borderRadius="button"
          sx={{
            p: 'var(--msqdx-spacing-md)',
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-on-light)',
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
            <MsqdxTypography variant="h6" weight="semibold">
              {t('settings.apiTokens.title')}
            </MsqdxTypography>
            <InfoTooltip title={t('settings.apiTokens.subtitle')} ariaLabel={t('common.info')} />
          </Box>
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 'var(--msqdx-spacing-md)' }}>
            {t('settings.apiTokens.subtitle')}
          </MsqdxTypography>
          {newToken ? (
            <Stack spacing={1} sx={{ mb: 'var(--msqdx-spacing-md)' }}>
              <MsqdxTypography variant="subtitle2" weight="semibold">
                {t('settings.apiTokens.newTokenTitle')}
              </MsqdxTypography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box
                  component="code"
                  sx={{
                    flex: 1,
                    minWidth: 200,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'var(--color-bg-subtle)',
                    fontSize: '0.85rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {newToken}
                </Box>
                <MsqdxButton variant="outlined" size="small" onClick={handleCopyToken}>
                  {t('settings.apiTokens.newTokenCopy')}
                </MsqdxButton>
              </Box>
              <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('settings.apiTokens.newTokenWarning')}
              </MsqdxTypography>
              <MsqdxButton variant="text" size="small" onClick={() => setNewToken(null)}>
                {t('common.close')}
              </MsqdxButton>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1} sx={{ mb: 'var(--msqdx-spacing-md)' }} alignItems="center" flexWrap="wrap">
              <MsqdxFormField
                label={t('settings.apiTokens.nameLabel')}
                value={tokenName}
                onChange={(e) => setTokenName((e.target as HTMLInputElement).value)}
                placeholder={t('settings.apiTokens.namePlaceholder')}
                size="small"
                sx={{ minWidth: 200, ...FORM_FIELD_ACCENT_SX }}
              />
              <MsqdxButton variant="contained" onClick={handleCreateToken} disabled={creatingToken} sx={{ mt: 1 }}>
                {creatingToken ? t('settings.apiTokens.creating') : t('settings.apiTokens.create')}
              </MsqdxButton>
            </Stack>
          )}
          <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 1 }}>
            {t('settings.apiTokens.listTitle')}
          </MsqdxTypography>
          {loadingTokens ? (
            <MsqdxTypography variant="body2" color="text.secondary">{t('common.loading')}</MsqdxTypography>
          ) : apiTokens.length === 0 ? (
            <MsqdxTypography variant="body2" color="text.secondary">{t('settings.apiTokens.empty')}</MsqdxTypography>
          ) : (
            <Stack spacing={0.5}>
              {apiTokens.map((token) => (
                <Box
                  key={token.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 0.5,
                    borderBottom: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <Box>
                    <MsqdxTypography variant="body2">{token.name || token.id.slice(0, 8)}</MsqdxTypography>
                    <MsqdxTypography variant="caption" color="text.secondary">
                      {new Date(token.createdAt).toLocaleString()}
                    </MsqdxTypography>
                  </Box>
                  <MsqdxButton variant="text" size="small" color="error" onClick={() => handleRevokeToken(token.id)}>
                    {t('settings.apiTokens.revoke')}
                  </MsqdxButton>
                </Box>
              ))}
            </Stack>
          )}
        </MsqdxCard>

        {/* Session – Abmelden */}
        <MsqdxCard
          variant="flat"
          borderRadius="button"
          sx={{
            p: 'var(--msqdx-spacing-md)',
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-on-light)',
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
            <MsqdxTypography variant="h6" weight="semibold">
              {t('settings.session.title')}
            </MsqdxTypography>
            <InfoTooltip title={t('info.session')} ariaLabel={t('common.info')} />
          </Box>
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 'var(--msqdx-spacing-md)' }}>
            {t('settings.session.subtitle')}
          </MsqdxTypography>
          <MsqdxButton variant="text" onClick={handleLogout}>
            {t('settings.session.logout')}
          </MsqdxButton>
        </MsqdxCard>

        {/* Über PLEXON */}
        <MsqdxCard
          variant="flat"
          borderRadius="button"
          sx={{
            p: 'var(--msqdx-spacing-md)',
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
            bgcolor: 'var(--color-card-bg)',
            color: 'var(--color-text-on-light)',
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
            <MsqdxTypography variant="h6" weight="semibold">
              {t('settings.about.title')}
            </MsqdxTypography>
            <InfoTooltip title={t('info.about')} ariaLabel={t('common.info')} />
          </Box>
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.7 }}>
            {t('settings.about.body')}
          </MsqdxTypography>
        </MsqdxCard>
      </Stack>
    </Box>
  );
}
