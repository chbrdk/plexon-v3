import { describe, expect, it } from 'vitest'
import { buildEqcPersonaChatRecommendations } from '@/lib/assistant/insights/eqc-persona-chat-followups'
import { getCapability } from '@/lib/capabilities'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.join(__dirname, '..')

describe('EQC → persona chat follow-ups (Wave C5 polish)', () => {
  it('builds chip when persona + audion project present', () => {
    const recs = buildEqcPersonaChatRecommendations({
      audionProjectId: 'aud-1',
      personaPreview: {
        personas: [
          {
            id: 'p1',
            name: 'Alex Buyer',
            segment: 'B2B',
            confidence: 0.9,
            headline: 'Buyer',
          },
        ],
      } as never,
    })
    expect(recs).toHaveLength(1)
    expect(recs[0]?.id).toBe('eqc-persona-chat')
    expect(recs[0]?.prompt).toContain('Alex Buyer')
  })

  it('skips chip without personas or audion project', () => {
    expect(
      buildEqcPersonaChatRecommendations({
        audionProjectId: 'aud-1',
        personaPreview: undefined,
      }),
    ).toEqual([])
    expect(
      buildEqcPersonaChatRecommendations({
        audionProjectId: null as never,
        personaPreview: {
          persona: {
            id: 'p1',
            name: 'Alex',
            segment: 'B2B',
            confidence: 0.8,
            headline: 'x',
          },
        } as never,
      }),
    ).toEqual([])
  })

  it('catalog + knowledge checklist mark C5 polish done', () => {
    expect(getCapability('audion.persona_chat')?.surfaces.flow).toBe(false)
    const knowledge = readFileSync(path.join(root, 'knowledge/eqc-persona-chat.md'), 'utf8')
    expect(knowledge).toContain('[x] Optional: Assistant chip after EQC context')
    expect(knowledge).toContain('[x] Optional: register `audion.persona_chat`')
  })
})
