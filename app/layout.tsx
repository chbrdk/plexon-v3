import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import { Providers } from '@/components/Providers'
import { I18nProvider } from '@/components/i18n/I18nProvider'
import { getServerLocale } from '@/lib/i18n/server'
import { shellPaths } from '@/lib/shell-paths'
import { resolveThemeId } from '@msqdx/ui'
import { FONT_URL_ASSISTANT_UI } from '@/lib/constants'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'PLEXON',
  description: 'PLEXON – MSQDX platform control plane (v3).',
  icons: { icon: '/favicon.ico' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale()
  return (
    <html
      lang={locale}
      data-theme={resolveThemeId(shellPaths.defaultTheme)}
      suppressHydrationWarning
    >
      <head>
        <link href={FONT_URL_ASSISTANT_UI} rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <I18nProvider initialLocale={locale}>
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </Providers>
      </body>
    </html>
  )
}
