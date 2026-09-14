/**
 * METRON follow-ups after list/get/summarize Auto-UI.
 */

import { describe, expect, it } from 'vitest'
import { attachRecommendationsToMetadata } from '@/lib/assistant/insights/conversation-recommendations'
import {
  buildMetronFollowUps,
  resolveMetronFollowUpMode,
} from '@/lib/assistant/insights/metron-follow-ups'
import {
  ASSISTANT_DRAFT_PROMPT_QUERY_PARAM,
  ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM,
  pathAssistantWithProjectAndDraft,
} from '@/lib/constants'

describe('metron follow-ups', () => {
  it('resolves list vs detail from toolTrace', () => {
    expect(
      resolveMetronFollowUpMode({
        toolTrace: { tools: ['metron_dashboards_list'] },
      }),
    ).toBe('list')
    expect(
      resolveMetronFollowUpMode({
        toolTrace: { tools: ['metron_dashboard_get'] },
      }),
    ).toBe('detail')
    expect(
      resolveMetronFollowUpMode({
        planner: { intent: 'metron_analytics' },
      }),
    ).toBe('generic')
    expect(resolveMetronFollowUpMode({})).toBeNull()
  })

  it('list follow-ups include starter pack confirm discoverability', () => {
    const recs = buildMetronFollowUps({ mode: 'list' })
    expect(recs.some((r) => r.id === 'metron-starter-pack')).toBe(true)
    expect(recs.some((r) => r.prompt.includes('Bestätigung'))).toBe(true)
  })

  it('attachRecommendations merges metron follow-ups for detail turns', () => {
    const meta = attachRecommendationsToMetadata(
      {
        toolTrace: { tools: ['metron_dashboard_summarize'] },
        uiLayout: {
          version: 1,
          blocks: [
            {
              id: 'm1',
              type: 'metric_grid',
              props: { title: 'Recruiting overview', items: [] },
              meta: {
                metronShareSnapshot: {
                  version: 1,
                  dashboardId: 'db-1',
                  name: 'Recruiting overview',
                  platformProjectId: null,
                  metrics: [{ label: 'Hired', value: 12 }],
                  chart: null,
                  href: null,
                },
              },
            },
          ],
        },
      },
      {
        intent: { type: 'free_chat' },
        prompt: 'summarize metron',
        history: [],
        platformProjectId: 'proj-1',
      },
    )
    const recs = meta?.followUpPrompts as Array<{ id: string }>
    expect(recs.some((r) => r.id === 'metron-other-board')).toBe(true)
    expect(recs.some((r) => r.id === 'metron-hired-source')).toBe(true)
  })
})

describe('assistant draft deep-link', () => {
  it('builds project + draft query', () => {
    const href = pathAssistantWithProjectAndDraft('pp-1', 'Zeig mir METRON')
    expect(href).toContain(`${ASSISTANT_PLATFORM_PROJECT_QUERY_PARAM}=pp-1`)
    expect(href).toContain(`${ASSISTANT_DRAFT_PROMPT_QUERY_PARAM}=`)
    expect(href).toContain('Zeig')
    expect(href).toContain('METRON')
  })
})
