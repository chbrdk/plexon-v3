import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { researchKnowledgePack } from '../lib/assistant/knowledge-pack/research-knowledge-pack'

describe('researchKnowledgePack', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('api.anthropic.com')) {
          return new Response(JSON.stringify({ content: [{ type: 'text', text: 'not-json' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(
          `<html><head><title>Acme Tools | Home</title>
          <meta name="description" content="B2B tooling for operators." />
          </head><body><h1>Acme Tools</h1></body></html>`,
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        )
      })
    )
    delete process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to heuristic profile and sources without API key', async () => {
    const result = await researchKnowledgePack({
      domainOrUrl: 'https://acme.example',
      displayName: 'Acme',
    })
    expect(result.usedLlm).toBe(false)
    expect(result.warning).toMatch(/ANTHROPIC_API_KEY/)
    expect(result.drafts.profile?.displayName).toBeTruthy()
    expect(result.drafts.profile?.primaryDomain).toContain('acme.example')
    expect(result.drafts.sources?.items[0]?.url).toContain('acme.example')
    expect(result.drafts.research_brief?.summary).toMatch(/B2B tooling/i)
  })

  it('returns only the requested facet when facetId set', async () => {
    const result = await researchKnowledgePack({
      domainOrUrl: 'https://acme.example',
      facetId: 'profile',
    })
    expect(result.drafts.profile).toBeTruthy()
    expect(result.drafts.competitive).toBeUndefined()
    expect(result.drafts.sources).toBeUndefined()
  })
})
