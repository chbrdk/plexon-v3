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

  it('documents Prismion canvas as bridge island', () => {
    const canvas = readFileSync(path.join(root, 'components/board/ReactFlowBoard.tsx'), 'utf8')
    expect(canvas).toContain("from '@msqdx/react'")
    const spec = readFileSync(path.join(root, 'specs/domain/ui-migrate-board.md'), 'utf8')
    expect(spec).toContain('island')
    expect(spec).toContain('ReactFlowBoard')
  })
})
