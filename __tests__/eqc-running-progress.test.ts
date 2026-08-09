import { describe, expect, it } from 'vitest'
import {
  buildEqcLiveProgressRows,
  eqcLiveProgressSummary,
  eqcLiveStepDetail,
  eqcLiveStepLabel,
} from '@/lib/assistant/event-quick-check/eqc-running-progress'
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs'

describe('eqc-running-progress', () => {
  it('maps step ids to short live labels', () => {
    expect(eqcLiveStepLabel({ id: 'persona_bootstrap', label: 'AUDION Personas' })).toBe(
      'Personas'
    )
    expect(eqcLiveStepLabel({ id: 'geo_check', label: 'GEO Competitive Check' })).toBe('GEO')
    expect(eqcLiveStepLabel({ id: 'unknown', label: 'Very long workflow label here' })).toMatch(
      /…$/
    )
  })

  it('truncates live details', () => {
    expect(eqcLiveStepDetail('Kurz')).toBe('Kurz')
    expect(eqcLiveStepDetail('x'.repeat(80))?.endsWith('…')).toBe(true)
    expect(eqcLiveStepDetail('')).toBeNull()
  })

  it('collapses consecutive same short labels and summarizes active step', () => {
    const steps: WorkflowStep[] = [
      { id: 'competitors_suggest', label: 'Wettbewerber vorschlagen', status: 'done' },
      { id: 'competitors_confirm', label: 'Wettbewerber bestätigen', status: 'done' },
      { id: 'persona_bootstrap', label: 'AUDION Personas', status: 'running', detail: '3 Personas' },
      { id: 'geo_check', label: 'GEO Competitive Check', status: 'pending' },
      { id: 'aggregate', label: 'Report', status: 'pending' },
    ]
    const rows = buildEqcLiveProgressRows(steps)
    expect(rows.map((r) => r.label)).toEqual(['Wettbewerb', 'Personas', 'GEO', 'Report'])
    const summary = eqcLiveProgressSummary(steps)
    expect(summary.active?.label).toBe('Personas')
    expect(summary.active?.detail).toBe('3 Personas')
    expect(summary.doneCount).toBe(1)
    expect(summary.total).toBe(4)
  })
})
