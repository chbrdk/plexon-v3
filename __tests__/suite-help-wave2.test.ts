/**
 * Suite Docs & Help — Wave 2 product embed contracts (plexon-v3).
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PATH_HELP_EMBED,
  buildHelpEmbedUrl,
  isHelpEmbedPath,
  pathHelpEmbed,
} from '@/lib/constants'

const root = path.resolve(__dirname, '..')
const github = path.resolve(root, '..')

describe('suite help Wave 2 embed + product mounts', () => {
  it('exposes help embed path helpers', () => {
    expect(PATH_HELP_EMBED).toBe('/help/embed')
    expect(isHelpEmbedPath('/help/embed')).toBe(true)
    expect(isHelpEmbedPath('/help')).toBe(false)
    expect(pathHelpEmbed({ product: 'checkion', pathname: '/scans' })).toContain(
      'product=checkion',
    )
    expect(buildHelpEmbedUrl('https://plexon.example', { product: 'audion' })).toBe(
      'https://plexon.example/help/embed?product=audion',
    )
    expect(existsSync(path.join(root, 'app/help/embed/page.tsx'))).toBe(true)
    expect(existsSync(path.join(root, 'components/help/HelpHubPanel.tsx'))).toBe(true)
  })

  it('mounts PlatformHelpHost in capability app shells', () => {
    const products = [
      'checkion-v3',
      'audion-v3',
      'brandion-v3',
      'creation-v3',
      'metron-v3',
      'videon-v3',
    ]
    for (const product of products) {
      const host = path.join(github, product, 'apps/web/components/platform-help-host.tsx')
      const shell = path.join(github, product, 'apps/web/components/app-shell.tsx')
      expect(existsSync(host), host).toBe(true)
      const shellText = readFileSync(shell, 'utf8')
      expect(shellText, product).toContain('PlatformHelpHost')
      const hostText = readFileSync(host, 'utf8')
      expect(hostText).toContain('pathHelpEmbed')
      expect(hostText).toContain('getPlexonPublicBaseUrl')
    }
  })
})
