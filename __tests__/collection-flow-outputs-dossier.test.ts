import { describe, expect, it } from 'vitest'
import {
  buildFlowOutputsDossierItems,
  JOURNEY_STEP_TEXT_MAX,
  JOURNEY_STEPS_MAX,
  rehydrateFlowRunUi,
  seedAllPersonaJourneyOutputsIntoContext,
  truncateJourneySteps,
} from '@/lib/collection-flow-journey-context'
import {
  createVaillantBarrierResearchTemplate,
  createVaillantInstallerDualPerspectiveTemplate,
} from '@/lib/collection-test-flow'
import { emptyRunContext } from '@/lib/collection-flow-run-context'

describe('Wave 25 journey outputs dossier', () => {
  it('truncates steps count and text length', () => {
    const long = 'x'.repeat(JOURNEY_STEP_TEXT_MAX + 50)
    const steps = Array.from({ length: JOURNEY_STEPS_MAX + 5 }, (_, i) => ({
      step: i + 1,
      result: long,
      reasoning: long,
    }))
    const truncated = truncateJourneySteps(steps)
    expect(truncated).toHaveLength(JOURNEY_STEPS_MAX)
    expect(truncated[0]!.result!.endsWith('…')).toBe(true)
    expect(truncated[0]!.result!.length).toBe(JOURNEY_STEP_TEXT_MAX)
  })

  it('rehydrates prompt/success outputs from persisted persona steps', () => {
    const doc = createVaillantBarrierResearchTemplate()
    const lastRun = {
      startedAt: '2026-09-02T00:00:00.000Z',
      completedAt: '2026-09-02T00:01:00.000Z',
      scanId: null,
      url: 'https://www.vaillant.de/produkte/waermepumpen/',
      status: 'complete',
      overallScore: null,
      journeyPersonaRuns: [
        {
          personaNodeId: 'n-persona',
          personaId: 'persona-vg-sandra-altbau',
          personaName: 'Sandra Müller',
          jobId: 'job-1',
          studyId: null,
          waveId: null,
          taskCompleted: true,
          validEvidence: true,
          finalUrl: 'https://www.vaillant.de/produkte/waermepumpen/',
          steps: [
            { step: 1, action: 'navigate', result: 'Opened Wärmepumpen hub' },
            {
              step: 2,
              action: 'think',
              result: 'Technische Unsicherheit im Altbau hält mich ab.',
            },
            { step: 3, action: 'summarize', result: 'Größte Barriere: Altbau-Eignung.' },
          ],
        },
      ],
    }
    const ui = rehydrateFlowRunUi(doc, lastRun)
    expect(Object.keys(ui.runOutputs).length).toBeGreaterThan(0)
    const texts = Object.values(ui.runOutputs)
      .map((o) => o.text ?? '')
      .join(' ')
    expect(texts).toMatch(/Altbau|Wärmepumpe|Barriere/i)
    const items = buildFlowOutputsDossierItems(doc.nodes, ui.runOutputs)
    expect(items.length).toBeGreaterThan(0)
    expect(items.some((i) => i.highlight)).toBe(true)
  })

  it('seeds distinct node outputs for UC2 dual persona chains', () => {
    const doc = createVaillantInstallerDualPerspectiveTemplate()
    let ctx = emptyRunContext()
    ctx = seedAllPersonaJourneyOutputsIntoContext(ctx, doc, 'https://www.vaillant.de/', [
      {
        personaNodeId: 'n-persona-ek',
        personaId: 'persona-vg-sandra-altbau',
        personaName: 'Sandra',
        jobId: 'job-ek',
        studyId: null,
        waveId: null,
        taskCompleted: true,
        validEvidence: true,
        finalUrl: 'https://www.vaillant.de/produkte/waermepumpen/',
        steps: [
          { step: 1, result: 'Endkunde braucht klare Kosten.' },
          { step: 2, result: 'Förderung unklar.' },
        ],
      },
      {
        personaNodeId: 'n-persona-inst',
        personaId: 'persona-vg-meister-klaus',
        personaName: 'Klaus',
        jobId: 'job-inst',
        studyId: null,
        waveId: null,
        taskCompleted: true,
        validEvidence: true,
        finalUrl: 'https://www.myvaillantpro.de/',
        steps: [
          { step: 1, result: 'Installateur braucht Planungsdaten.' },
          { step: 2, result: 'Service-Rückläufer vermeiden.' },
        ],
      },
    ])
    const out = ctx.outputs
    const values = Object.values(out)
      .map((b) => JSON.stringify(b))
      .join(' ')
    expect(values).toMatch(/Förderung/)
    expect(values).toMatch(/Service-Rückläufer|Installateur|Planung/)
    // Distinct canvas nodes received seeded bundles (not only primary chain)
    const seededNodeIds = Object.keys(out).filter((k) => k.startsWith('n-'))
    expect(seededNodeIds.length).toBeGreaterThanOrEqual(2)
  })

  it('dossier builder returns empty for blank outputs', () => {
    const doc = createVaillantBarrierResearchTemplate()
    expect(buildFlowOutputsDossierItems(doc.nodes, {})).toEqual([])
  })
})
