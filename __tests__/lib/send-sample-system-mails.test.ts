/**
 * One-shot: SEND_SAMPLES=1 npm test -- --run __tests__/lib/send-sample-system-mails.test.ts
 * Bridge creds: /tmp/plexon-mail-bridge.env (BRIDGE_TOKEN, BRIDGE_URL, SMTP_FROM)
 */
import { readFileSync } from 'node:fs'
import https from 'node:https'
import { URL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderTransactionalMail } from '@/lib/mail/templates'

function loadBridgeEnv(): { BRIDGE_TOKEN: string; BRIDGE_URL: string; SMTP_FROM: string } {
  const raw = readFileSync('/tmp/plexon-mail-bridge.env', 'utf8')
  const env: Record<string, string> = {}
  for (const line of raw.trim().split('\n')) {
    const i = line.indexOf('=')
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1)
  }
  if (!env.BRIDGE_TOKEN || !env.BRIDGE_URL) throw new Error('missing bridge env')
  return {
    BRIDGE_TOKEN: env.BRIDGE_TOKEN,
    BRIDGE_URL: env.BRIDGE_URL,
    SMTP_FROM: env.SMTP_FROM || 'PLEXON <noreply@plygrnd.tech>',
  }
}

function postSend(
  env: { BRIDGE_TOKEN: string; BRIDGE_URL: string; SMTP_FROM: string },
  payload: { to: string; subject: string; html: string; text: string }
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(env.BRIDGE_URL.replace(/\/$/, '') + '/send')
    const body = JSON.stringify({ ...payload, from: env.SMTP_FROM })
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.BRIDGE_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (incoming) => {
        const chunks: Buffer[] = []
        incoming.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        incoming.on('end', () => {
          resolve({
            status: incoming.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

const samples = [
  ['password_reset', { plainToken: 'sample-reset-code-DEMO123' }],
  ['password_changed', {}],
  ['account_welcome', {}],
  ['collection_member_removed', { collectionName: 'Demo Collection' }],
  [
    'collection_member_added',
    {
      collectionName: 'Demo Collection',
      role: 'member',
      launchUrl: 'https://example.com/collections/demo',
      actorName: 'Ada',
    },
  ],
  [
    'collection_invite',
    {
      inviteUrl: 'https://example.com/invite/demo-sample',
      collectionName: 'Demo Collection',
      role: 'admin',
      expiresAt: '2026-09-28',
      actorName: 'Ada',
    },
  ],
] as const

describe('send sample system mails', () => {
  it.runIf(process.env.SEND_SAMPLES === '1')(
    'delivers every transactional kind to sample inboxes',
    async () => {
      const env = loadBridgeEnv()
      const recipients = (process.env.MAIL_TO || 'christoph.bordeck@msqdx.com,bordeck.christoph@gmail.com')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const results: Array<{ kind: string; to: string; status: number }> = []
      for (const [kind, payload] of samples) {
        const rendered = renderTransactionalMail(kind as (typeof samples)[number][0], payload as never)
        expect(rendered.html).toContain('msqdx-mark.png')
        for (const to of recipients) {
          const res = await postSend(env, {
            to,
            subject: `[Sample] ${rendered.subject}`,
            html: rendered.html,
            text: rendered.text,
          })
          results.push({ kind, to, status: res.status })
          expect(res.status, `${kind} → ${to}: ${res.body}`).toBeGreaterThanOrEqual(200)
          expect(res.status).toBeLessThan(300)
        }
      }
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ sent: results.length, results }, null, 2))
    },
    120_000
  )

  it('documents the six live system-mail kinds', () => {
    expect(samples.map(([k]) => k)).toEqual([
      'password_reset',
      'password_changed',
      'account_welcome',
      'collection_member_removed',
      'collection_member_added',
      'collection_invite',
    ])
  })
})
