'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Field, Input, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { API_AUTH_REQUEST_PASSWORD_RESET, PATH_LOGIN } from '@/lib/constants'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_AUTH_REQUEST_PASSWORD_RESET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? t('auth.forgotPassword.error'))
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgotPassword.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="plexon-auth">
      <div className="plexon-auth-panel">
        <Text role="headline" as="h1">
          {t('auth.forgotPassword.title')}
        </Text>
        <p className="plexon-auth-lede">{t('auth.forgotPassword.subtitle')}</p>
        {error ? (
          <p className="plexon-auth-error" role="alert">
            {error}
          </p>
        ) : null}
        {done ? (
          <Text role="body">{t('auth.forgotPassword.success')}</Text>
        ) : (
          <form className="plexon-auth-panel" onSubmit={handleSubmit} style={{ padding: 0 }}>
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
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t('auth.forgotPassword.ctaLoading') : t('auth.forgotPassword.cta')}
            </Button>
          </form>
        )}
        <p className="plexon-auth-links">
          <Link href={PATH_LOGIN}>{t('auth.forgotPassword.back')}</Link>
        </p>
      </div>
    </main>
  )
}
