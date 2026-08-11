import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

const wired: Array<[string, string]> = [
  ['UiMetricGrid.tsx', 'ChatMetricGrid'],
  ['UiKeyValueList.tsx', 'ChatKeyValueList'],
  ['UiStepList.tsx', 'ChatStepList'],
  ['UiFindingList.tsx', 'ChatBlockList'],
  ['UiRecommendationList.tsx', 'ChatBlockList'],
  ['UiLinkList.tsx', 'ChatLinkList'],
  ['UiAlertBlock.tsx', 'ChatAlertBlock'],
  ['UiDataTable.tsx', 'ChatDataTable'],
  ['UiCollapsibleBlock.tsx', 'ChatCollapsible'],
  ['UiPersonaCardBlock.tsx', 'ChatEntityGrid'],
  ['UiTargetGroupCardBlock.tsx', 'ChatEntityGrid'],
  ['UiPhaseStrip.tsx', 'ChatPhaseStrip'],
  ['UiMomentList.tsx', 'ChatMomentList'],
  ['UiQuoteList.tsx', 'ChatQuoteList'],
]

describe('assistant chat blocks use @msqdx/ui primitives', () => {
  it('organisms import shared chat molecules', () => {
    for (const [file, token] of wired) {
      const src = readFileSync(path.join(root, 'components/assistant-ui/organisms', file), 'utf8')
      expect(src, file).toContain(token)
      expect(src, file).toContain("from '@msqdx/ui'")
    }
  })

  it('re-exports every chat molecule from the curated barrel (avoids React #130)', () => {
    const barrel = readFileSync(path.join(root, 'lib/msqdx-ui.ts'), 'utf8')
    const required = [
      'ChatBlockPanel',
      'ChatBlockList',
      'ChatBlockListTone',
      'ChatMetricGrid',
      'ChatKeyValueList',
      'ChatStepList',
      'ChatLinkList',
      'ChatAlertBlock',
      'ChatDataTable',
      'ChatCollapsible',
      'ChatEntityGrid',
      'ChatPhaseStrip',
      'ChatMomentList',
      'ChatQuoteList',
      'AlertTone',
    ]
    for (const token of required) {
      expect(barrel, token).toContain(token)
    }
  })

  it('barrel covers every runtime @msqdx/ui value import used by components', () => {
    const barrel = readFileSync(path.join(root, 'lib/msqdx-ui.ts'), 'utf8')
    const exported = new Set<string>()
    for (const block of barrel.matchAll(/export \{([^}]+)\}/gs)) {
      for (const part of block[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0]?.trim()
        if (name && !name.startsWith('type ')) exported.add(name)
      }
    }
    for (const block of barrel.matchAll(/export type \{([^}]+)\}/gs)) {
      for (const part of block[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0]?.trim()
        if (name) exported.add(name)
      }
    }

    const imported = new Set<string>()
    const walk = (dir: string) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === '.next') continue
        const full = path.join(dir, ent.name)
        if (ent.isDirectory()) walk(full)
        else if (/\.(tsx|ts)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
          const src = readFileSync(full, 'utf8')
          for (const m of src.matchAll(/import\s+(type\s+)?\{([^}]+)\}\s+from\s+'@msqdx\/ui'/g)) {
            for (const part of m[2].split(',')) {
              const raw = part.trim().replace(/^type\s+/, '')
              const name = raw.split(/\s+as\s+/)[0]?.trim()
              if (name) imported.add(name)
            }
          }
        }
      }
    }
    walk(path.join(root, 'components'))
    walk(path.join(root, 'app'))

    const missing = [...imported].filter((n) => !exported.has(n)).sort()
    expect(missing, `missing barrel exports: ${missing.join(', ')}`).toEqual([])
  })
})
