'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button, Field, Input, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { PATH_FORGOT_PASSWORD, PATH_HOME, PATH_REGISTER } from '@/lib/constants'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const redirectTo = searchParams.get('redirect') ?? PATH_HOME

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: redirectTo,
      })
      if (result?.error) throw new Error(result.error)
      if (result?.ok) {
        router.replace(redirectTo)
        router.refresh()
      } else {
        throw new Error(t('auth.login.error'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="plexon-auth">
      <form className="plexon-auth-panel" onSubmit={handleSubmit}>
        <Text role="headline" as="h1">
          {t('auth.login.title')}
        </Text>
        <p className="plexon-auth-lede">{t('auth.login.subtitle')}</p>
        {error ? (
          <p className="plexon-auth-error" role="alert">
            {error}
          </p>
        ) : null}
        <Field label={t('auth.login.email')} size="md">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            block
            aria-label={t('auth.login.email')}
          />
        </Field>
        <Field label={t('auth.login.password')} size="md">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            block
            aria-label={t('auth.login.password')}
          />
        </Field>
        <p className="plexon-auth-links" style={{ textAlign: 'right' }}>
          <Link href={PATH_FORGOT_PASSWORD}>{t('auth.login.forgotLink')}</Link>
        </p>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? t('auth.login.ctaLoading') : t('auth.login.cta')}
        </Button>
        <p className="plexon-auth-links">
          {t('auth.login.prompt')}{' '}
          <Link href={PATH_REGISTER}>{t('auth.login.link')}</Link>
        </p>
      </form>
    </main>
  )
}

function LoginFallback() {
  const { t } = useI18n()
  return (
    <main className="plexon-auth">
      <p className="plexon-auth-lede">{t('common.loading')}</p>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
