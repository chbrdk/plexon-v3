import { describe, expect, it } from 'vitest'
import {
  buildBoundEqcPitchSlideScene,
  EQC_PITCH_SLIDE_SIZE,
} from '@/lib/assistant/reports/eqc-pitch-slides/build-eqc-pitch-slide-scene'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { resolveCreationCraftPlaybook } from '@/lib/assistant/creation-craft-playbooks'

function sampleReport(partial?: Partial<EventQuickCheckReportModel>): EventQuickCheckReportModel {
  return {
    meta: {
      title: 'Acme Quick Check',
      domain: 'acme.example',
      platformProjectId: '11111111-1111-4111-8111-111111111111',
      projectName: 'Acme',
      playbookLabel: 'EQC',
      runId: 'run-1',
      createdAt: '2026-10-02T10:00:00.000Z',
    },
    executive: {
      summary: 'Summary',
      fazit: 'Fazit: Accessibility zuerst.',
      kpiTiles: [
        { label: 'Score', value: 72 },
        { label: 'Issues', value: 12 },
      ],
    },
    domain: {
      scanId: 'scan-1',
      domain: 'acme.example',
      url: 'https://acme.example',
      status: 'done',
      score: 72,
      totalPages: 40,
      stats: { errors: 3, warnings: 5, notices: 4, total: 12 },
      topIssues: [
        { title: 'Contrast', count: 5 },
        { title: 'Alt text', count: 4 },
      ],
      checkionHref: '/checkion',
    },
    geo: { competitors: [{ name: 'Rival', shareOfVoice: 22 }] },
    appendix: { steps: [] },
    ...partial,
  } as EventQuickCheckReportModel
}

describe('EQC pitch slides fixture', () => {
  it('builds 16:9 pages with bound cover and issues', () => {
    const scene = buildBoundEqcPitchSlideScene(sampleReport())
    expect(scene.activePrintPreset).toBe('slide-16-9')
    expect(scene.activeBreakpoint).toBe('print')
    expect(scene.pages?.length).toBeGreaterThanOrEqual(2)
    for (const p of scene.pages ?? []) {
      expect(p.frame?.width).toBe(EQC_PITCH_SLIDE_SIZE.width)
      expect(p.frame?.height).toBe(EQC_PITCH_SLIDE_SIZE.height)
    }
    const coverBody = JSON.stringify(scene.pages?.[0]?.root)
    expect(coverBody).toContain('Fazit: Accessibility zuerst')
    const issuesBody = JSON.stringify(scene.pages?.[1]?.root)
    expect(issuesBody).toContain('Contrast')
    expect(issuesBody).toContain('Alt text')
  })
})

describe('EQC pitch slides playbook', () => {
  it('resolves Quickscan + Folie phrasing', () => {
    expect(
      resolveCreationCraftPlaybook('Mach aus dem Quickscan Pitch-Folien für Magcloud')?.id,
    ).toBe('creation_eqc_pitch_slides_v1')
    expect(resolveCreationCraftPlaybook('EQC als 16:9 Slides')?.id).toBe(
      'creation_eqc_pitch_slides_v1',
    )
  })
})
