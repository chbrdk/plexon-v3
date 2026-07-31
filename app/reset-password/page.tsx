'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Field, Input, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { API_AUTH_RESET_PASSWORD, PATH_LOGIN } from '@/lib/constants'

function ResetForm() {
  const { t } = useI18n()
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')?.trim() ?? ''
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== password2) {
      setError(t('auth.resetPassword.mismatch'))
      return
    }
    if (!token) {
      setError(t('auth.resetPassword.noToken'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_AUTH_RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? t('auth.resetPassword.error'))
      router.replace(PATH_LOGIN)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetPassword.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="plexon-auth-panel" onSubmit={handleSubmit}>
      <Text role="headline" as="h1">
        {t('auth.resetPassword.title')}
      </Text>
      {error ? (
        <p className="plexon-auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <Field label={t('auth.register.password')} size="md">
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          block
          aria-label={t('auth.register.password')}
        />
      </Field>
      <Field label={t('auth.resetPassword.confirm')} size="md">
        <Input
          type="password"
          autoComplete="new-password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
          block
          aria-label={t('auth.resetPassword.confirm')}
        />
      </Field>
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? t('auth.resetPassword.ctaLoading') : t('auth.resetPassword.cta')}
      </Button>
      <p className="plexon-auth-links">
        <Link href={PATH_LOGIN}>{t('auth.forgotPassword.back')}</Link>
      </p>
    </form>
  )
}

function ResetFallback() {
  const { t } = useI18n()
  return <p className="plexon-auth-lede">{t('common.loading')}</p>
}

export default function ResetPasswordPage() {
  return (
    <main className="plexon-auth">
      <Suspense fallback={<ResetFallback />}>
        <ResetForm />
      </Suspense>
    </main>
  )
}
