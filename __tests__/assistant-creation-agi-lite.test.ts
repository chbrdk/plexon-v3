import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(__dirname, '..')

describe('assistant creation AGI-lite wave spec', () => {
  const spec = readFileSync(
    path.join(root, 'specs/domain/assistant-creation-agi-lite.md'),
    'utf8',
  )
  const knowledge = readFileSync(
    path.join(root, 'knowledge/assistant-creation-agi-lite.md'),
    'utf8',
  )

  it('pins waves A–D and keep/drop locks', () => {
    expect(spec).toContain('Wave A — Visual must-fix')
    expect(spec).toContain('Status A1:** Implemented')
    expect(spec).toContain('Wave B — Creation craft playbooks')
    expect(spec).toContain('creation_newsletter_v1')
    expect(spec).toContain('creation_print_magazine_v1')
    expect(spec).toContain('Status B:** Implemented')
    expect(spec).toContain('Wave C — Collection craft memory')
    expect(spec).toContain('Wave D — Eval harness')
    expect(spec).toContain('creation_landing_v1')
    expect(spec).toContain('creation_page_as_pattern_v1')
    expect(spec).toContain('creation-craft-prefs-latest')
    expect(spec).toContain('One scene writer')
    expect(spec).toContain('Anthropic Managed Agents / multi-writer swarm')
    expect(spec).toContain('**Drop**')
  })

  it('sequences A1 before C/D and references baseline quality loop', () => {
    expect(spec).toContain('assistant-creation-mcp.md')
    expect(spec).toContain('collection-memory-wave1.md')
    expect(spec).toContain('Do not start C/D until A1')
    expect(spec).toContain('gate_pass ≥ 0.8')
  })

  it('knowledge companion points at the domain spec', () => {
    expect(knowledge).toContain('specs/domain/assistant-creation-agi-lite.md')
    expect(knowledge).toContain('creation_landing_v1')
    expect(knowledge).toContain('platformProjectId')
  })

  it('specs-index lists the autonomy wave', () => {
    const index = readFileSync(path.join(root, 'knowledge/specs-index.md'), 'utf8')
    expect(index).toContain('specs/domain/assistant-creation-agi-lite.md')
    expect(index).toContain('knowledge/assistant-creation-agi-lite.md')
  })
})
