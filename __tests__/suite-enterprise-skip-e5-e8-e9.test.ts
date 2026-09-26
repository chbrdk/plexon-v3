/**
 * Enterprise E5/E8 templates + skip reasons + E9 route shape.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import {
  COLLECTION_FLOW_TEMPLATE_CRISIS,
  COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE,
  createCrisisResponseTemplate,
  createLaunchGateTemplate,
  deriveCollectionVerdict,
} from '@/lib/collection-test-flow'
import {
  FLOW_SKIP_REASONS,
  formatSkipMessage,
  isEnterpriseSoftSkipTemplate,
} from '@/lib/collection-flow-skip'

const root = path.join(__dirname, '..')

describe('suite enterprise E5 E8 skip + E9', () => {
  it('builds launch-gate and crisis templates with closed kinds', () => {
    const gate = createLaunchGateTemplate('https://launch.test/')
    expect(gate.templateId).toBe(COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE)
    expect(gate.nodes.some((n) => n.kind === 'quality_ok')).toBe(true)
    expect(gate.nodes.some((n) => n.kind === 'human_confirm')).toBe(true)

    const crisis = createCrisisResponseTemplate('https://crisis.test/')
    expect(crisis.templateId).toBe(COLLECTION_FLOW_TEMPLATE_CRISIS)
    expect(isEnterpriseSoftSkipTemplate(crisis)).toBe(true)
    expect(isEnterpriseSoftSkipTemplate(gate)).toBe(true)
  })

  it('keeps launch gate from quality_ok when score evidence is missing', () => {
    const verdict = deriveCollectionVerdict({
      scanStatus: 'completed',
      overallScore: null,
      blockers: [formatSkipMessage(FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_CHECKION)],
      requirePageScore: true,
    })
    expect(verdict.pageEvidenceValid).toBe(false)
    expect(verdict.scorePassed).toBe(false)
    expect(verdict.terminalKind).not.toBe('quality_ok')
  })

  it('exposes stable skip reason codes', () => {
    expect(FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_BRANDION).toBe('capability_unbound:brandion')
    expect(FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_CHECKION).toBe('capability_unbound:checkion')
    expect(FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_AUDION).toBe('capability_unbound:audion')
    expect(FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_VIDEON).toBe('capability_unbound:videon')
    expect(FLOW_SKIP_REASONS.RETEST_NO_PRIOR).toBe('retest_no_prior_run')
    expect(formatSkipMessage(FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_BRANDION)).toContain('BRANDION')
  })

  it('runtime soft-skips write catalog status skipped for unbound Checkion', () => {
    const execute = readFileSync(path.join(root, 'lib/collection-flow-execute.ts'), 'utf8')
    expect(execute).toContain("status: 'skipped'")
    expect(execute).toContain('CAPABILITY_UNBOUND_CHECKION')
    expect(execute).toContain('CAPABILITY_UNBOUND_AUDION')
    expect(execute).toContain('buildScanCatalogBundle')
    expect(execute).toContain('buildGeoCatalogBundle')
  })

  it('retest soft-skips no_baseline with RETEST_NO_PRIOR', () => {
    const retest = readFileSync(path.join(root, 'lib/collection-flow-retest-segment.ts'), 'utf8')
    expect(retest).toContain('RETEST_NO_PRIOR')
    expect(retest).toContain('isEnterpriseSoftSkipTemplate')
  })

  it('videon soft-skips unbound with CAPABILITY_UNBOUND_VIDEON', () => {
    const videon = readFileSync(path.join(root, 'lib/collection-flow-videon-segment.ts'), 'utf8')
    expect(videon).toContain('CAPABILITY_UNBOUND_VIDEON')
    expect(videon).toContain("status: 'skipped'")
  })

  it('ships directory route under [id] and refuses password-disable without provider in source', () => {
    const route = path.join(root, 'app/api/admin/companies/[id]/directory/route.ts')
    expect(existsSync(route)).toBe(true)
    const src = readFileSync(route, 'utf8')
    expect(src).toContain("params: Promise<{ id: string }>")
    expect(src).toContain('provider_required_to_disable_password')
    expect(src).toContain('ready: false')
    expect(existsSync(path.join(root, 'app/api/admin/companies/[companyId]/directory/route.ts'))).toBe(
      false
    )
  })

  it('registers enterprise templates on flows POST knownTemplates', () => {
    const src = readFileSync(
      path.join(root, 'app/api/platform/projects/[platformProjectId]/flows/route.ts'),
      'utf8'
    )
    expect(src).toContain('COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE')
    expect(src).toContain('COLLECTION_FLOW_TEMPLATE_CRISIS')
    expect(src).toContain('COLLECTION_FLOW_TEMPLATE_FIX_RETEST')
    // Must be in knownTemplates Set — otherwise POST silently falls back to page-quality
    const knownBlock = src.slice(src.indexOf('knownTemplates'), src.indexOf('const templateId'))
    expect(knownBlock).toContain('COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE')
    expect(knownBlock).toContain('COLLECTION_FLOW_TEMPLATE_CRISIS')
    expect(knownBlock).toContain('COLLECTION_FLOW_TEMPLATE_FIX_RETEST')
  })

  it('does not auto-mutate CREATION scenes from flow gate helper', () => {
    const gate = readFileSync(path.join(root, 'lib/collection-flow-client-room-gate.ts'), 'utf8')
    expect(gate).not.toMatch(/scene|creation.*patch|import-html/i)
    expect(gate).toContain('setClientRoomSlot')
  })
})
