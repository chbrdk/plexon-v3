/**
 * Enterprise E3 schedule + E6–E9 foundation tests (filesystem / pure helpers).
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { cronMatchesAt, parseCronExpression, scheduleMinuteKey } from '@/lib/cron-match'
import {
  COLLECTION_FLOW_TEMPLATE_CRISIS,
  createCrisisResponseTemplate,
  createFixRetestTemplate,
  createLaunchGateTemplate,
  documentHasSchedule,
} from '@/lib/collection-test-flow'
import { COLLECTION_FLOW_PRESETS } from '@/lib/collection-flow-presets'

const root = path.join(__dirname, '..')

describe('suite enterprise E3 schedule + E6–E9', () => {
  it('ships migration 0021 for activity / brief / directory', () => {
    expect(
      existsSync(
        path.join(root, 'lib/db/migrations/0021_suite_enterprise_activity_brief_directory.sql')
      )
    ).toBe(true)
  })

  it('parses cron and matches Monday 08:00 Berlin', () => {
    expect(parseCronExpression('0 8 * * 1')).not.toBeNull()
    // 2026-09-21 was a Monday
    const monday = new Date('2026-09-21T06:00:00.000Z') // 08:00 Europe/Berlin (CEST)
    expect(cronMatchesAt('0 8 * * 1', monday, 'Europe/Berlin')).toBe(true)
    expect(cronMatchesAt('0 9 * * 1', monday, 'Europe/Berlin')).toBe(false)
    expect(scheduleMinuteKey(monday, 'Europe/Berlin')).toMatch(/T08:00$/)
  })

  it('schedule preset exists and documentHasSchedule works', () => {
    expect(COLLECTION_FLOW_PRESETS.some((p) => p.kind === 'schedule')).toBe(true)
    const doc = createFixRetestTemplate('https://acme.test/')
    expect(documentHasSchedule(doc)).toBe(false)
    doc.nodes.push({
      id: 'n-sched',
      kind: 'schedule',
      label: 'Termin',
      cronExpression: '0 8 * * 1',
      timezone: 'Europe/Berlin',
    })
    expect(documentHasSchedule(doc)).toBe(true)
  })

  it('crisis template is closed-kind and creatable', () => {
    const doc = createCrisisResponseTemplate('https://acme.test/statement')
    expect(doc.templateId).toBe(COLLECTION_FLOW_TEMPLATE_CRISIS)
    expect(doc.nodes.some((n) => n.kind === 'scan')).toBe(true)
    expect(doc.nodes.some((n) => n.kind === 'human_confirm')).toBe(true)
  })

  it('launch gate + fix-retest templates remain available', () => {
    expect(createLaunchGateTemplate('https://a.test/').templateId).toContain('launch-gate')
    expect(createFixRetestTemplate('https://a.test/').templateId).toContain('fix-retest')
  })

  it('registers activity + campaign-briefs + directory routes', () => {
    const files = [
      'app/api/platform/provisioning/collections/[platformProjectId]/activity/route.ts',
      'app/api/platform/provisioning/collections/[platformProjectId]/campaign-briefs/route.ts',
      'app/api/admin/companies/[companyId]/directory/route.ts',
      'lib/collection-flow-scheduler.ts',
      'lib/collection-campaign-brief.ts',
      'lib/collection-activity.ts',
    ]
    for (const f of files) {
      expect(existsSync(path.join(root, f)), f).toBe(true)
    }
    const boot = readFileSync(path.join(root, 'lib/db/index.ts'), 'utf8')
    expect(boot).toContain('collection-flow-scheduler')
  })
})
