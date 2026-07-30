'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, Stack } from '@mui/material';
import {
  MsqdxButton,
  MsqdxFormField,
  MsqdxMoleculeCard,
  MsqdxLogo,
  MsqdxTypography,
} from '@msqdx/react';
import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import { AuthBrandColorSelector } from '@/components/auth/AuthBrandColorSelector';
import { useI18n } from '@/components/i18n/I18nProvider';
import { API_AUTH_REGISTER, PATH_LOGIN } from '@/lib/constants';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_AUTH_REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t('auth.register.error'));
      router.replace(PATH_LOGIN);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.register.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'var(--audion-light-html-background-color, var(--color-secondary-dx-green))',
      }}
    >
      <Box
        sx={{
          flex: { xs: '0 0 auto', md: '0 0 70%' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 'var(--msqdx-spacing-md)', md: 'var(--msqdx-spacing-xl)' },
          py: { xs: 'var(--msqdx-spacing-xl)', md: 0 },
        }}
      >
        <Stack alignItems="flex-start" sx={{ gap: 0 }}>
          <Stack direction="row" alignItems="center">
            <MsqdxLogo
              width={220}
              height={53}
              color="var(--auth-logo-color, var(--color-primary-white))"
            />
            <MsqdxTypography
              variant="h4"
              weight="light"
              sx={{
                color: 'var(--auth-logo-color, var(--color-primary-white))',
                fontSize: { xs: '1.5rem', md: '2.25rem' },
                ml: 'var(--msqdx-spacing-xl)',
              }}
            >
              PLEXON
            </MsqdxTypography>
          </Stack>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, mt: 1 }}>
            <AuthBrandColorSelector />
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{
          flex: { xs: '1 1 auto', md: '0 0 30%' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 'var(--msqdx-spacing-md)', md: 'var(--msqdx-spacing-lg)' },
          py: 'var(--msqdx-spacing-xl)',
        }}
      >
        <MsqdxMoleculeCard
          variant="flat"
          borderRadius="button"
          sx={{
            width: '100%',
            maxWidth: 360,
            p: 'var(--msqdx-spacing-lg)',
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
          }}
        >
          <Stack sx={{ gap: 'var(--msqdx-spacing-lg)' }}>
            <Box>
              <MsqdxTypography
                variant="h4"
                weight="bold"
                sx={{ fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono }}
              >
                {t('auth.register.title')}
              </MsqdxTypography>
              <MsqdxTypography
                variant="body2"
                sx={{ mt: 'var(--msqdx-spacing-xs)', color: 'var(--color-text-secondary)' }}
              >
                {t('auth.register.subtitle')}
              </MsqdxTypography>
            </Box>

            {error && (
              <Box
                sx={{
                  p: 'var(--msqdx-spacing-md)',
                  borderRadius: 'var(--msqdx-radius-sm)',
                  bgcolor: 'error.light',
                }}
              >
                <MsqdxTypography variant="body2" sx={{ color: 'error.contrastText' }}>
                  {error}
                </MsqdxTypography>
              </Box>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ '& .MuiInputLabel-root': { color: 'var(--color-theme-accent)' } }}
            >
              <Stack sx={{ gap: 'var(--msqdx-spacing-md)' }}>
                <MsqdxFormField
                  label={t('auth.register.name')}
                  value={name}
                  onChange={(e) => setName((e.target as HTMLInputElement).value)}
                  fullWidth
                />
                <MsqdxFormField
                  label={t('auth.register.email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                  required
                  fullWidth
                />
                <Box>
                  <MsqdxFormField
                    label={t('auth.register.password')}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                    required
                    fullWidth
                  />
                  <MsqdxTypography
                    variant="caption"
                    sx={{ display: 'block', mt: 0.5, color: 'var(--color-text-muted-on-light)' }}
                  >
                    {t('auth.register.passwordRequirements')}
                  </MsqdxTypography>
                </Box>
                <MsqdxButton
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                  sx={{
                    mt: 'var(--msqdx-spacing-xs)',
                    backgroundColor: 'var(--color-theme-accent) !important',
                    color: 'var(--auth-button-text-color, var(--color-primary-white)) !important',
                    '&:hover': {
                      backgroundColor: 'var(--color-theme-accent) !important',
                      filter: 'brightness(1.08)',
                    },
                  }}
                >
                  {loading ? t('auth.register.ctaLoading') : t('auth.register.cta')}
                </MsqdxButton>
              </Stack>
            </Box>

            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
              {t('auth.register.prompt')}{' '}
              <Link href={PATH_LOGIN} style={{ color: 'inherit', fontWeight: 600 }}>
                {t('auth.register.link')}
              </Link>
            </MsqdxTypography>
          </Stack>
        </MsqdxMoleculeCard>
      </Box>
    </Box>
  );
}
