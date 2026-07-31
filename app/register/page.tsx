'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Field, Input, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { API_AUTH_REGISTER, PATH_LOGIN } from '@/lib/constants'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_AUTH_REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('auth.register.error'))
      router.replace(PATH_LOGIN)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.register.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="plexon-auth">
      <form className="plexon-auth-panel" onSubmit={handleSubmit}>
        <Text role="headline" as="h1">
          {t('auth.register.title')}
        </Text>
        <p className="plexon-auth-lede">{t('auth.register.subtitle')}</p>
        {error ? (
          <p className="plexon-auth-error" role="alert">
            {error}
          </p>
        ) : null}
        <Field label={t('auth.register.name')} size="md">
          <Input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            block
            aria-label={t('auth.register.name')}
          />
        </Field>
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
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? t('auth.register.ctaLoading') : t('auth.register.cta')}
        </Button>
        <p className="plexon-auth-links">
          {t('auth.register.prompt')}{' '}
          <Link href={PATH_LOGIN}>{t('auth.register.link')}</Link>
        </p>
      </form>
    </main>
  )
}
