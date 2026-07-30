'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import { MsqdxButton, MsqdxFormField, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import { API_AUTH_RESET_PASSWORD, PATH_LOGIN } from '@/lib/constants';

function ResetForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      setError(t('auth.resetPassword.mismatch'));
      return;
    }
    if (!token) {
      setError(t('auth.resetPassword.noToken'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_AUTH_RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t('auth.resetPassword.error'));
      router.replace(PATH_LOGIN);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MsqdxMoleculeCard
      variant="flat"
      sx={{ width: '100%', maxWidth: 400, p: 3, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}
    >
      <Stack spacing={2}>
        <MsqdxTypography variant="h4" weight="bold" sx={{ fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono }}>
          {t('auth.resetPassword.title')}
        </MsqdxTypography>
        {error && (
          <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'error.light' }}>
            <MsqdxTypography variant="body2" sx={{ color: 'error.contrastText' }}>
              {error}
            </MsqdxTypography>
          </Box>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <MsqdxFormField
              label={t('auth.register.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              required
              fullWidth
            />
            <MsqdxFormField
              label={t('auth.resetPassword.confirm')}
              type="password"
              value={password2}
              onChange={(e) => setPassword2((e.target as HTMLInputElement).value)}
              required
              fullWidth
            />
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)' }}>
              {t('auth.register.passwordRequirements')}
            </MsqdxTypography>
            <MsqdxButton type="submit" variant="contained" disabled={loading || !token} fullWidth>
              {loading ? t('auth.resetPassword.ctaLoading') : t('auth.resetPassword.cta')}
            </MsqdxButton>
          </Stack>
        </Box>
        <Link href={PATH_LOGIN} style={{ color: 'inherit', fontWeight: 600 }}>
          {t('auth.forgotPassword.back')}
        </Link>
      </Stack>
    </MsqdxMoleculeCard>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        bgcolor: 'var(--audion-light-html-background-color, var(--color-secondary-dx-green))',
      }}
    >
      <Suspense fallback={<MsqdxTypography>{t('common.loading')}</MsqdxTypography>}>
        <ResetForm />
      </Suspense>
    </Box>
  );
}
