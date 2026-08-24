import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
  ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN,
  buildPageContextRouteHint,
  derivePageContextFromLocation,
  mergeAssistantPageContext,
  parseAssistantPageContext,
} from '@/lib/assistant/page-context'
import { buildAssistantPageContextBlock } from '@/lib/assistant/page-context/hydrate-event-quick-check'
import { EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY } from '@/lib/paths/event-quick-check-page'

const root = path.resolve(__dirname, '..')

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  getAssistantWorkflowRunById: vi.fn(async (id: string) => {
    if (id !== 'run-ok') return null
    return {
      id: 'run-ok',
      conversationId: 'c1',
      userId: 'u1',
      type: 'event_quick_check',
      status: 'completed',
      steps: [],
      result: {
        [EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]: {
          templateId: 'event_quick_check',
          meta: {
            title: 'QC Acme',
            url: 'https://acme.example',
            domain: 'acme.example',
            projectName: 'Acme',
            platformProjectId: 'pp-1',
            generatedAt: '2026-08-10T00:00:00.000Z',
            playbookLabel: 'Quick Check',
          },
          executive: {
            summary: 'Kurzfassung des Scans.',
            kpiTiles: [{ label: 'Score', value: 82 }],
          },
          workflow: { steps: [] },
          domain: {
            scanId: 'scan-1',
            domain: 'acme.example',
            url: 'https://acme.example',
            status: 'done',
            score: 82,
            totalPages: 12,
            stats: { errors: 1, warnings: 2, notices: 0, total: 3 },
            topIssues: [{ title: 'Missing alt', count: 4 }],
            checkionHref: '/x',
          },
          geo: {
            competitors: [],
            eeatDimensions: [],
            recommendations: [],
            citationHighlights: [],
          },
          insights: {
            findings: [{ title: 'Thin content', description: '…', severity: 'warning' }],
            recommendations: [{ title: 'Improve titles', description: '…' }],
          },
          appendix: { stepTable: { columns: [], rows: [] }, links: [], scanId: 'scan-1' },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }),
}))

vi.mock('@/lib/assistant/event-quick-check/authorize-event-quick-check-run', () => ({
  userCanAccessEventQuickCheckRun: vi.fn(async (_user: unknown, run: { id: string }) => run.id === 'run-ok'),
}))

describe('assistant page context', () => {
  it('parses and derives EQC context from URL', () => {
    expect(parseAssistantPageContext({ product: 'plexon', pathname: '/x' })).toMatchObject({
      product: 'plexon',
      pathname: '/x',
    })
    expect(parseAssistantPageContext({ product: 'nope', pathname: '/x' })).toBeNull()

    const derived = derivePageContextFromLocation({
      product: 'plexon',
      pathname: '/event-quick-check',
      search: '?run=abc',
    })
    expect(derived).toMatchObject({
      capability: ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK,
      entityType: ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN,
      entityId: 'abc',
    })

    const merged = mergeAssistantPageContext(derived, {
      product: 'plexon',
      pathname: '/event-quick-check',
      platformProjectId: 'pp-9',
      capability: ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK,
      entityType: ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN,
      entityId: 'abc',
    })
    expect(merged?.platformProjectId).toBe('pp-9')
    expect(buildPageContextRouteHint(merged!)).toContain('Seitenkontext')
  })

  it('hydrates authorized EQC runs into a compact system block', async () => {
    const user = { id: 'u1', role: 'user' } as never
    const block = await buildAssistantPageContextBlock(user, {
      product: 'plexon',
      pathname: '/event-quick-check',
      capability: ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK,
      entityType: ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN,
      entityId: 'run-ok',
      platformProjectId: 'pp-1',
    })
    expect(block).toContain('Event Quick Check')
    expect(block).toContain('run-ok')
    expect(block).toContain('acme.example')
    expect(block).toContain('Missing alt')

    const denied = await buildAssistantPageContextBlock(user, {
      product: 'plexon',
      pathname: '/event-quick-check',
      capability: ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK,
      entityType: ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN,
      entityId: 'run-other',
    })
    expect(denied).toContain('Seitenkontext')
    expect(denied).not.toContain('Missing alt')
  })

  it('hydrates CREATION editor scene context for assistant', async () => {
    const user = { id: 'u1', email: 'u@example.com', role: 'user' as const }
    const block = await buildAssistantPageContextBlock(user, {
      product: 'creation',
      pathname: '/editor',
      capability: ASSISTANT_CAPABILITY_CREATION_EDITOR,
      entityType: ASSISTANT_ENTITY_COMPOSITION_SCENE,
      entityId: 'scene-abc',
      entityUpdatedAt: '2026-08-23T20:00:00.000Z',
      platformProjectId: 'pp-1',
    })
    expect(block).toContain('CREATION Editor')
    expect(block).toContain('scene-abc')
    expect(block).toContain('baseUpdatedAt')
    expect(block).toContain('insert_child')
    expect(block).toContain('add_page')
    expect(block).toContain('Niemals insert_node')
    expect(block).toContain('Get started')
    expect(block).toContain('set_prop')
  })

  it('wires EQC publish + complete body + host', () => {
    const eqc = readFileSync(
      path.join(root, 'components/event-quick-check/EventQuickCheckPageClient.tsx'),
      'utf8'
    )
    const chat = readFileSync(path.join(root, 'components/assistant/AssistantChat.tsx'), 'utf8')
    const host = readFileSync(path.join(root, 'components/PlatformAssistantHost.tsx'), 'utf8')
    const free = readFileSync(path.join(root, 'lib/assistant/handlers/free-chat.ts'), 'utf8')
    const types = readFileSync(path.join(root, 'lib/assistant/complete-types.ts'), 'utf8')
    const spec = readFileSync(path.join(root, 'specs/domain/assistant-page-context.md'), 'utf8')

    expect(eqc).toContain('setAssistantPageContext')
    expect(eqc).toContain('ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK')
    expect(chat).toContain('pageContext')
    expect(host).toContain('pageContext={pageContext}')
    expect(free).toContain('pageContext:')
    expect(types).toContain('pageContext?:')
    expect(spec).toContain('Accepted')
  })
})
