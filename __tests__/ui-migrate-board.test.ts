import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

describe('board ui rebuild (wave 7 chrome)', () => {
  it('board page has no @mui or @msqdx/react', () => {
    const page = readFileSync(path.join(root, 'app/board/page.tsx'), 'utf8')
    expect(page).not.toContain("from '@mui/material'")
    expect(page).not.toContain("from '@msqdx/react'")
    expect(page).toContain("from '@msqdx/ui'")
    expect(page).toContain('plexon-board-stage')
  })

  it('RequireAdminRole gate has no @mui or @msqdx/react', () => {
    const gate = readFileSync(path.join(root, 'components/auth/RequireAdminRole.tsx'), 'utf8')
    expect(gate).not.toContain("from '@mui/material'")
    expect(gate).not.toContain("from '@msqdx/react'")
    expect(gate).toContain("from '@msqdx/ui'")
    expect(gate).toContain('Spinner')
  })

  it('board canvas has no @mui or @msqdx/react (local board modules)', () => {
    const canvas = readFileSync(path.join(root, 'components/board/ReactFlowBoard.tsx'), 'utf8')
    expect(canvas).not.toContain("from '@msqdx/react'")
    expect(canvas).not.toContain("from '@mui/material'")
    expect(canvas).toContain("from '@/lib/board/prismion'")
    expect(canvas).toContain("from '@/lib/board/board-ui'")
    const spec = readFileSync(path.join(root, 'specs/domain/ui-migrate-board.md'), 'utf8')
    expect(spec).toContain('ReactFlowBoard')
    expect(spec).toContain('lib/board')
  })
})
