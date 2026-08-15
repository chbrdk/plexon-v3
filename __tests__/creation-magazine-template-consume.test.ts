import { describe, expect, it, vi, afterEach } from 'vitest'
import { bindEqcReportToMagazineScene } from '@/lib/assistant/reports/pdf/magazine/bind-eqc-report-slots'
import type {
  CreationCompositionScene,
  CreationMagazineTemplate,
} from '@/lib/assistant/reports/pdf/magazine/creation-magazine-template-types'
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model'
import {
  eventQuickCheckBvikFixture,
  eventQuickCheckBvikNarrativeFixture,
} from '@/__tests__/fixtures/event-quick-check-report.fixture'
import {
  apiCreationMagazineTemplatesLatest,
  CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK,
  isEqcCreationMagazineTemplateEnabled,
} from '@/lib/paths/creation-magazine-templates'
import { tryRenderEqcMagazineViaCreationTemplate } from '@/lib/integrations/creation-magazine-template-client'

function templateScene(): CreationCompositionScene {
  return {
    id: 'scene-eqc-tpl',
    name: 'EQC Mag Template',
    version: 1,
    platformProjectId: 'plx-test-collection',
    root: {
      id: 'root',
      type: 'Stack',
      children: [
        {
          id: 'page',
          type: 'PrintPage',
          children: [
            {
              id: 'cover',
              type: 'PrintCover',
              props: { dataSlot: 'eqc.cover' },
              children: [
                { id: 'ct', type: 'Text', props: { slot: 'title', children: 'Placeholder' } },
              ],
            },
            {
              id: 'issues',
              type: 'PrintTable',
              props: {
                dataSlot: 'eqc.domain.issues',
                columns: ['Issue', 'Count'],
                rows: [['stub', 0]],
              },
            },
            {
              id: 'ranked',
              type: 'PrintRankedList',
              props: { dataSlot: 'eqc.geo.competitors' },
              children: [],
            },
            {
              id: 'personas',
              type: 'PrintPersonaGrid',
              props: { dataSlot: 'eqc.personas' },
              children: [],
            },
          ],
        },
      ],
    },
    updatedAt: new Date().toISOString(),
  }
}

describe('bindEqcReportToMagazineScene', () => {
  it('binds report into Cover / Table / Ranked / Persona via dataSlot', () => {
    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture(),
    )
    report.meta.platformProjectId = 'plx-test-collection'
    report.geo.competitors = [
      { name: 'Competitor A', score: 61, shareOfVoice: 12 },
      { name: 'Competitor B', score: 44 },
    ]
    if (!report.domain?.topIssues?.length) {
      report.domain = {
        ...(report.domain ?? {
          scanId: 's1',
          domain: report.meta.domain,
          url: report.meta.url,
          status: 'complete',
          score: 70,
          totalPages: 1,
          stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
          checkionHref: '#',
        }),
        topIssues: [{ title: 'Contrast', count: 3 }],
      }
    }
    if (!report.persona && !(report.personas?.length)) {
      report.persona = {
        id: 'p1',
        name: 'Pat Buyer',
        segment: 'B2B',
        confidence: 0.8,
        headline: 'Decides fast',
        bio: 'Ops lead',
        traits: [],
        goals: [],
        painPoints: [],
        interests: [],
      }
    }

    const bound = bindEqcReportToMagazineScene(templateScene(), report, [
      { dataSlot: 'eqc.cover', nodeId: 'cover', nodeType: 'PrintCover' },
      { dataSlot: 'eqc.domain.issues', nodeId: 'issues', nodeType: 'PrintTable' },
      { dataSlot: 'eqc.geo.competitors', nodeId: 'ranked', nodeType: 'PrintRankedList' },
      { dataSlot: 'eqc.personas', nodeId: 'personas', nodeType: 'PrintPersonaGrid' },
    ])

    const page = bound.root.children![0]!
    const cover = page.children!.find((c) => c.id === 'cover')!
    const title = cover.children!.find((c) => c.props?.slot === 'title')
    expect(String(title?.props?.children).length).toBeGreaterThan(0)
    expect(cover.children!.some((c) => c.type === 'Lede')).toBe(true)

    const table = page.children!.find((c) => c.id === 'issues')!
    expect(Array.isArray(table.props?.columns)).toBe(true)
    expect(Array.isArray(table.props?.rows)).toBe(true)
    expect((table.props!.rows as unknown[]).length).toBeGreaterThan(0)
    expect(table.props?.slot).toBeUndefined()
    expect(table.props?.dataSlot).toBe('eqc.domain.issues')

    const ranked = page.children!.find((c) => c.id === 'ranked')!
    expect(ranked.children!.some((c) => c.type === 'RankedRow')).toBe(true)

    const personas = page.children!.find((c) => c.id === 'personas')!
    expect(personas.children!.some((c) => c.type === 'PrintPersonaCard')).toBe(true)
  })
})

describe('creation magazine template paths', () => {
  afterEach(() => {
    delete process.env.CREATION_API_URL
    delete process.env.NEXT_PUBLIC_CREATION_URL
    delete process.env.EQC_CREATION_MAGAZINE_TEMPLATE
  })

  it('builds list URL from CREATION_API_URL without hardcoding FQDN', () => {
    process.env.CREATION_API_URL = 'https://creation.example.test'
    const url = apiCreationMagazineTemplatesLatest({
      platformProjectId: 'plx-1',
      role: CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK,
    })
    expect(url).toBe(
      'https://creation.example.test/api/magazine-templates?platformProjectId=plx-1&role=quick-check-magazine&latest=1&status=published',
    )
  })

  it('flag off forces legacy prefer path', () => {
    process.env.EQC_CREATION_MAGAZINE_TEMPLATE = '0'
    expect(isEqcCreationMagazineTemplateEnabled()).toBe(false)
  })
})

describe('tryRenderEqcMagazineViaCreationTemplate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CREATION_API_URL
    delete process.env.EQC_CREATION_MAGAZINE_TEMPLATE
  })

  it('falls back when no published template', async () => {
    process.env.CREATION_API_URL = 'https://creation.example.test'
    process.env.EQC_CREATION_MAGAZINE_TEMPLATE = '1'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ template: null }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const report = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture())
    report.meta.platformProjectId = 'plx-test-collection'
    const result = await tryRenderEqcMagazineViaCreationTemplate(report)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/no published template/)
  })

  it('binds and returns PDF when Creation responds', async () => {
    process.env.CREATION_API_URL = 'https://creation.example.test'
    const tpl: CreationMagazineTemplate = {
      templateId: 'mtpl-1',
      version: 1,
      status: 'published',
      role: CREATION_MAGAZINE_TEMPLATE_ROLE_QUICK_CHECK,
      platformProjectId: 'plx-test-collection',
      name: 'EQC',
      sceneSnapshot: templateScene(),
      slotSchema: [
        { dataSlot: 'eqc.cover', nodeId: 'cover', nodeType: 'PrintCover' },
        { dataSlot: 'eqc.domain.issues', nodeId: 'issues', nodeType: 'PrintTable' },
      ],
      compatVersion: '2026-08-magazine-template-v1',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const pdfBytes = Buffer.from('%PDF-1.4 fixture creation mag')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/api/magazine-templates')) {
          return new Response(JSON.stringify({ template: tpl }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }
        if (url.includes('/pdf') && init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as {
            scene: { root: { children: Array<{ children: Array<{ id: string; props?: Record<string, unknown> }> }> } }
          }
          const page = body.scene.root.children[0]!
          const issues = page.children.find((c) => c.id === 'issues')
          expect(issues?.props?.dataSlot).toBe('eqc.domain.issues')
          expect(Array.isArray(issues?.props?.rows)).toBe(true)
          return new Response(pdfBytes, {
            status: 200,
            headers: { 'content-type': 'application/pdf' },
          })
        }
        return new Response('not found', { status: 404 })
      }),
    )

    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture(),
    )
    report.meta.platformProjectId = 'plx-test-collection'
    const result = await tryRenderEqcMagazineViaCreationTemplate(report)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe('creation-template')
    expect(result.pdf.subarray(0, 4).toString('utf8')).toBe('%PDF')
  })
})
