import { afterEach, describe, expect, it, vi } from 'vitest'
import { getEventQuickCheckReadiness } from '../lib/integrations/event-quick-check-readiness'

describe('event-quick-check-readiness', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports blockers when tokens missing', () => {
    vi.stubEnv('CHECKION_API_URL', '')
    vi.stubEnv('CHECKION_API_TOKEN', '')
    vi.stubEnv('AUDION_API_URL', '')
    vi.stubEnv('AUDION_API_TOKEN', '')
    const r = getEventQuickCheckReadiness()
    expect(r.ready).toBe(false)
    expect(r.blockers.length).toBeGreaterThan(0)
  })

  it('is ready when checkion + audion tokens and explicit checkion URL are set', () => {
    vi.stubEnv('CHECKION_API_URL', 'https://checkion-v3.example')
    vi.stubEnv('CHECKION_API_TOKEN', `checkion_${'a'.repeat(64)}`)
    vi.stubEnv('AUDION_API_URL', 'https://audion-v3.example/api')
    vi.stubEnv('AUDION_API_TOKEN', `audion_${'b'.repeat(32)}`)
    vi.stubEnv('NEXT_PUBLIC_AUDION_ADMIN_URL', 'https://audion-v3.example/')
    const r = getEventQuickCheckReadiness()
    expect(r.ready).toBe(true)
    expect(r.blockers).toEqual([])
  })
})
