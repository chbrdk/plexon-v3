'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
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
import { PATH_FORGOT_PASSWORD, PATH_REGISTER } from '@/lib/constants';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const redirectTo = searchParams.get('redirect') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: redirectTo,
      });
      if (result?.error) throw new Error(result.error);
      if (result?.ok) {
        router.replace(redirectTo);
        router.refresh();
      } else {
        throw new Error(t('auth.login.error'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.error'));
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
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'var(--audion-light-html-background-color, var(--color-secondary-dx-green))',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Box
        sx={{
          flex: { xs: '0 0 auto', md: '0 0 70%' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 'var(--msqdx-spacing-md)', sm: 'var(--msqdx-spacing-lg)', md: 'var(--msqdx-spacing-xl)' },
          py: { xs: 'var(--msqdx-spacing-xl)', md: 0 },
        }}
      >
        <Stack alignItems="flex-start" sx={{ gap: 0 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap">
            <Box
              sx={{
                transform: { xs: 'scale(0.64)', sm: 'scale(0.82)', md: 'scale(1)' },
                transformOrigin: 'left center',
              }}
            >
              <MsqdxLogo
                width={220}
                height={53}
                color="var(--auth-logo-color, var(--color-primary-white))"
              />
            </Box>
            <MsqdxTypography
              variant="h4"
              weight="light"
              sx={{
                color: 'var(--auth-logo-color, var(--color-primary-white))',
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.25rem' },
                ml: { xs: 'var(--msqdx-spacing-md)', md: 'var(--msqdx-spacing-xl)' },
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
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'center',
          px: { xs: 'var(--msqdx-spacing-md)', sm: 'var(--msqdx-spacing-lg)', md: 'var(--msqdx-spacing-lg)' },
          py: { xs: 'var(--msqdx-spacing-lg)', md: 'var(--msqdx-spacing-xl)' },
          pb: { xs: 'var(--msqdx-spacing-xl)', md: 'var(--msqdx-spacing-xl)' },
        }}
      >
        <MsqdxMoleculeCard
          variant="flat"
          borderRadius="button"
          sx={{
            width: '100%',
            maxWidth: 360,
            p: { xs: 'var(--msqdx-spacing-lg)', sm: 'var(--msqdx-spacing-lg)' },
            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
            '& .MuiButton-root': { minHeight: 48 },
            '& .MuiInputBase-root': { minHeight: 48 },
          }}
        >
          <Stack sx={{ gap: 'var(--msqdx-spacing-lg)' }}>
            <Box>
              <MsqdxTypography
                variant="h4"
                weight="bold"
                sx={{ fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono }}
              >
                {t('auth.login.title')}
              </MsqdxTypography>
              <MsqdxTypography
                variant="body2"
                sx={{ mt: 'var(--msqdx-spacing-xs)', color: 'var(--color-text-secondary)' }}
              >
                {t('auth.login.subtitle')}
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
                  label={t('auth.login.email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                  required
                  fullWidth
                />
                <MsqdxFormField
                  label={t('auth.login.password')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                  required
                  fullWidth
                />
                <Box sx={{ textAlign: 'right', mt: '-var(--msqdx-spacing-xs)' }}>
                  <Link
                    href={PATH_FORGOT_PASSWORD}
                    style={{ color: 'inherit', fontWeight: 600, fontSize: '0.875rem' }}
                  >
                    {t('auth.login.forgotLink')}
                  </Link>
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
                  {loading ? t('auth.login.ctaLoading') : t('auth.login.cta')}
                </MsqdxButton>
              </Stack>
            </Box>

            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
              {t('auth.login.prompt')}{' '}
              <Link href={PATH_REGISTER} style={{ color: 'inherit', fontWeight: 600 }}>
                {t('auth.login.link')}
              </Link>
            </MsqdxTypography>
          </Stack>
        </MsqdxMoleculeCard>
      </Box>
    </Box>
  );
}

function LoginFallback() {
  const { t } = useI18n();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--audion-light-html-background-color, var(--color-secondary-dx-green))',
      }}
    >
      {t('common.loading')}
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
