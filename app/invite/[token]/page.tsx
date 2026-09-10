'use client'

import { useEffect, useState } from 'react'
import { Button, Spinner, Text } from '@msqdx/ui'
import { apiPlatformInviteAccept, PATH_LOGIN, pathCollectionInvite } from '@/lib/constants'

export default function CollectionInviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

  useEffect(() => {
    void params.then((p) => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      setStatus('loading')
      setMessage(null)
      try {
        const res = await fetch(apiPlatformInviteAccept(token), { method: 'POST' })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          redirectUrl?: string | null
          platformProjectId?: string
        }
        if (cancelled) return
        if (!res.ok) {
          setStatus('error')
          setMessage(data.error || `Invite failed (${res.status})`)
          return
        }
        setStatus('ok')
        setRedirectUrl(data.redirectUrl ?? null)
        if (data.redirectUrl) {
          window.location.assign(data.redirectUrl)
        }
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage('Invite could not be accepted.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
      }}
      data-testid="collection-invite-accept"
    >
      {status === 'loading' ? (
        <>
          <Spinner />
          <Text role="meta">Accepting invite…</Text>
        </>
      ) : null}
      {status === 'ok' ? (
        <>
          <Text as="h1">You’re in</Text>
          <Text role="meta">
            Collection access granted
            {redirectUrl ? ' — opening CREATION…' : '.'}
          </Text>
          {redirectUrl ? (
            <Button href={redirectUrl} variant="primary">
              Open editor
            </Button>
          ) : (
            <Button href="/" variant="subtle">
              Go home
            </Button>
          )}
        </>
      ) : null}
      {status === 'error' ? (
        <>
          <Text as="h1">Invite unavailable</Text>
          <Text role="meta">{message}</Text>
          <Button href={PATH_LOGIN} variant="subtle">
            Sign in
          </Button>
          {token ? (
            <Text role="meta" as="span">
              {pathCollectionInvite(token)}
            </Text>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
