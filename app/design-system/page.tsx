'use client'

import Link from 'next/link'
import { SectionChrome, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'

const MSQDX_UI_REPO = 'https://github.com/chbrdk/msqdx-ui'

export default function DesignSystemPage() {
  const { t } = useI18n()

  return (
    <div className="plexon-magazine">
      <SectionChrome
        title={t('nav.designSystem')}
        meta={
          <Text role="meta">
            PLEXON v3 uses the magazine shell from <code>@msqdx/ui</code>. Component primitives and
            Storybook live in the central design-system repo — not in this app.
          </Text>
        }
      />
      <div className="plexon-magazine-card">
        <Text role="title" as="h2">
          MSQ DX UI (product SoT)
        </Text>
        <Text role="body">
          Browse atoms, molecules, and shell templates in the <code>msqdx-ui</code> Storybook. Legacy
          Prismion board widgets remain on the React Flow board surface until a dedicated v3 board chrome
          lands in <code>@msqdx/ui</code>.
        </Text>
        <p className="plexon-auth-links" style={{ marginTop: '0.75rem' }}>
          <Link href={MSQDX_UI_REPO} target="_blank" rel="noopener noreferrer">
            Open msqdx-ui on GitHub
          </Link>
        </p>
      </div>
    </div>
  )
}
