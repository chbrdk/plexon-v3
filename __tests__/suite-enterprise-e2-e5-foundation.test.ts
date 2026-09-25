/**
 * Enterprise E2–E5 foundation smoke.
 * Spec: specs/domain/suite-enterprise-program.md
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COLLECTION_FLOW_NODE_KINDS,
  COLLECTION_FLOW_TEMPLATE_FIX_RETEST,
  COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE,
  createFixRetestTemplate,
  createLaunchGateTemplate,
} from '@/lib/collection-test-flow'
import { PALETTE_ENTERPRISE_GROUPS } from '@/lib/collection-flow-presets'
import { CLIENT_ROOM_SLOT_IDS, SUITE_AUDIT_ACTIONS } from '@/lib/db/schema'

const root = path.join(__dirname, '..')

describe('suite enterprise E2–E5 foundation', () => {
  it('ships migration + libs + routes', () => {
    for (const rel of [
      'lib/db/migrations/0020_suite_enterprise_client_room_audit.sql',
      'lib/collection-client-room.ts',
      'lib/suite-audit.ts',
      'app/api/platform/provisioning/collections/[platformProjectId]/client-room/route.ts',
      'app/api/platform/provisioning/collections/[platformProjectId]/audit/route.ts',
      'app/share/room/[token]/page.tsx',
      'components/projects/CollectionClientRoomPanel.tsx',
    ]) {
      expect(existsSync(path.join(root, rel)), `missing ${rel}`).toBe(true)
    }
  })

  it('defines closed ClientRoom slots and audit actions', () => {
    expect(CLIENT_ROOM_SLOT_IDS).toContain('checkion_overview')
    expect(CLIENT_ROOM_SLOT_IDS).toContain('videon_cut')
    expect(CLIENT_ROOM_SLOT_IDS).toContain('brand_findings')
    expect(SUITE_AUDIT_ACTIONS).toContain('run_started')
    expect(SUITE_AUDIT_ACTIONS).toContain('approved')
    expect(createHash('sha256').update('crm_x', 'utf8').digest('hex')).toHaveLength(64)
  })

  it('registers schedule + retest and E5 templates', () => {
    expect(COLLECTION_FLOW_NODE_KINDS).toContain('schedule')
    expect(COLLECTION_FLOW_NODE_KINDS).toContain('retest')
    expect(PALETTE_ENTERPRISE_GROUPS.flatMap((g) => g.presets.map((p) => p.id))).toEqual(
      expect.arrayContaining(['schedule', 'retest']),
    )

    const fix = createFixRetestTemplate('https://acme.test/')
    expect(fix.templateId).toBe(COLLECTION_FLOW_TEMPLATE_FIX_RETEST)
    expect(fix.nodes.some((n) => n.kind === 'retest')).toBe(true)
    expect(fix.nodes.some((n) => n.kind === 'brand_measure')).toBe(true)

    const gate = createLaunchGateTemplate('https://acme.test/')
    expect(gate.templateId).toBe(COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE)
    expect(gate.nodes.some((n) => n.kind === 'human_confirm')).toBe(true)
  })

  it('wires ClientRoom panel and enterprise palette on Collection surfaces', () => {
    const dash = readFileSync(
      path.join(root, 'components/products/PlatformProjectDashboard.tsx'),
      'utf8',
    )
    expect(dash).toContain('CollectionClientRoomPanel')

    const board = readFileSync(
      path.join(root, 'components/flows/CollectionFlowBoard.tsx'),
      'utf8',
    )
    expect(board).toContain('PALETTE_ENTERPRISE_GROUPS')

    const flowsRoute = readFileSync(
      path.join(root, 'app/api/platform/projects/[platformProjectId]/flows/route.ts'),
      'utf8',
    )
    expect(flowsRoute).toContain('COLLECTION_FLOW_TEMPLATE_FIX_RETEST')
    expect(flowsRoute).toContain('COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE')
  })
})
