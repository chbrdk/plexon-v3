import { describe, expect, it, vi } from 'vitest'
import {
  PATH_ASSISTANT,
  PATH_EVENT_QUICK_CHECK,
  PATH_PROJECTS,
  pathEventQuickCheckRun,
  pathPlatformProjectDashboard,
} from '@/lib/constants'
import { buildPlatformNavigationPromptBlock } from '@/lib/assistant/platform-navigation'
import { buildAssistantSystemPrompt } from '@/lib/assistant/system-prompt'

vi.mock('@/lib/assistant/user-eligibility', () => ({
  listUserCompanies: vi.fn(async () => [{ id: 'co-1', name: 'Demo Co' }]),
}))

vi.mock('@/lib/assistant/project-context', () => ({
  buildCompactProjectContextBlock: vi.fn(async () => null),
}))

describe('assistant platform navigation', () => {
  it('builds a compact block from route constants', () => {
    const block = buildPlatformNavigationPromptBlock()
    expect(block).toContain('Plattform-Navigation (kanonisch)')
    expect(block).toContain('Erfinde keine URLs')
    expect(block).toContain(PATH_PROJECTS)
    expect(block).toContain(PATH_EVENT_QUICK_CHECK)
    expect(block).toContain(PATH_ASSISTANT)
    expect(block).toContain(pathPlatformProjectDashboard('{platformProjectId}'))
    expect(block).toContain(pathEventQuickCheckRun('{workflowRunId}'))
    expect(block.length).toBeLessThanOrEqual(2_000)
  })

  it('injects navigation into the system prompt', async () => {
    const prompt = await buildAssistantSystemPrompt(
      { id: 'user-1', email: 'a@b.c', name: 'Ada' } as never,
      { userEmail: 'a@b.c', userName: 'Ada', companies: [] }
    )
    expect(prompt).toContain('Plattform-Navigation (kanonisch)')
    expect(prompt).toContain(PATH_PROJECTS)
    expect(prompt).toContain('Halluziniere keine Links')
  })
})
