'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Box, Stack } from '@mui/material';
import { MsqdxButton, MsqdxFormField, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import { API_AUTH_REQUEST_PASSWORD_RESET, PATH_LOGIN } from '@/lib/constants';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_AUTH_REQUEST_PASSWORD_RESET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t('auth.forgotPassword.error'));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgotPassword.error'));
    } finally {
      setLoading(false);
    }
  };

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
      <MsqdxMoleculeCard
        variant="flat"
        sx={{ width: '100%', maxWidth: 400, p: 3, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}
      >
        <Stack spacing={2}>
          <MsqdxTypography variant="h4" weight="bold" sx={{ fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono }}>
            {t('auth.forgotPassword.title')}
          </MsqdxTypography>
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
            {t('auth.forgotPassword.subtitle')}
          </MsqdxTypography>
          {error && (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'error.light' }}>
              <MsqdxTypography variant="body2" sx={{ color: 'error.contrastText' }}>
                {error}
              </MsqdxTypography>
            </Box>
          )}
          {done ? (
            <MsqdxTypography variant="body2">{t('auth.forgotPassword.success')}</MsqdxTypography>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <MsqdxFormField
                  label={t('auth.login.email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                  required
                  fullWidth
                />
                <MsqdxButton type="submit" variant="contained" disabled={loading} fullWidth>
                  {loading ? t('auth.forgotPassword.ctaLoading') : t('auth.forgotPassword.cta')}
                </MsqdxButton>
              </Stack>
            </Box>
          )}
          <Link href={PATH_LOGIN} style={{ color: 'inherit', fontWeight: 600 }}>
            {t('auth.forgotPassword.back')}
          </Link>
        </Stack>
      </MsqdxMoleculeCard>
    </Box>
  );
}
