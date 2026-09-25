/**
 * Product distillate clients inventory (sibling repos).
 * Spec: suite-enterprise-program.md § E1 / E4
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const github = path.join(__dirname, '../..')

const PRODUCTS = [
  'checkion-v3',
  'audion-v3',
  'brandion-v3',
  'creation-v3',
  'videon-v3',
  'metron-v3',
] as const

describe('suite distillate product inventory', () => {
  it('each product ships plexon suite audit + collection activity clients', () => {
    for (const product of PRODUCTS) {
      const audit = path.join(github, product, 'apps/web/lib/plexon-suite-audit.ts')
      const activity = path.join(github, product, 'apps/web/lib/plexon-collection-activity.ts')
      expect(existsSync(audit), `missing ${audit}`).toBe(true)
      expect(existsSync(activity), `missing ${activity}`).toBe(true)
      const auditSrc = readFileSync(audit, 'utf8')
      const activitySrc = readFileSync(activity, 'utf8')
      expect(auditSrc).toMatch(/postSuiteAuditEvent|scheduleSuiteAuditEvent/)
      expect(activitySrc).toMatch(
        /postCollectionActivityDistillate|scheduleCollectionActivityDistillate/
      )
    }
  })

  it('known call sites still reference the clients', () => {
    const hooks: Array<{ file: string; needle: string }> = [
      {
        file: path.join(github, 'checkion-v3/apps/web/lib/db/geo-jobs.ts'),
        needle: 'scheduleSuiteAuditEvent',
      },
      {
        file: path.join(github, 'videon-v3/apps/web/lib/pipeline/run-analysis.ts'),
        needle: 'scheduleCollectionActivityDistillate',
      },
      {
        file: path.join(
          github,
          'creation-v3/apps/web/app/api/scenes/[id]/import-html/route.ts'
        ),
        needle: 'plexon-suite-audit',
      },
      {
        file: path.join(github, 'metron-v3/apps/web/app/api/suite-connectors/sync/route.ts'),
        needle: 'plexon-collection-activity',
      },
      {
        file: path.join(
          github,
          'brandion-v3/apps/web/app/api/guidelines/[id]/analysis-runs/route.ts'
        ),
        needle: 'plexon-suite-audit',
      },
    ]

    for (const { file, needle } of hooks) {
      expect(existsSync(file), `missing hook file ${file}`).toBe(true)
      expect(readFileSync(file, 'utf8'), file).toContain(needle)
    }
  })
})
