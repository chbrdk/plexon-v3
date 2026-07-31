import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../components/AppShell'
import { PATH_ASSISTANT, PATH_HOME, PATH_LOGIN, PATH_PRODUCTS, PATH_SETTINGS } from '../lib/constants'

const { pathnameRef } = vi.hoisted(() => ({
  pathnameRef: { current: '/' as string },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { name: 'Test User', email: 'test@example.com', role: 'admin' },
    },
    status: 'authenticated',
  }),
}))

vi.mock('@/components/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'nav.dashboard': 'Dashboard',
        'nav.assistant': 'Assistant',
        'nav.eventQuickCheck': 'Event Quick Check',
        'nav.products': 'Products',
        'nav.board': 'Board',
        'nav.adminConsole': 'Admin',
        'nav.settings': 'Settings',
      }
      return map[key] ?? key
    },
    locale: 'en',
  }),
}))

vi.mock('@/components/settings/BrandColorInitializer', () => ({
  BrandColorInitializer: () => null,
}))

vi.mock('@msqdx/ui', () => ({
  Avatar: ({ name }: { name?: string }) => <span data-testid="avatar">{name}</span>,
}))

vi.mock('@/lib/msqdx-ui-shell', () => ({
  AppFrame: ({
    children,
    rail,
    topbar,
    brandCorner,
  }: {
    children: React.ReactNode
    rail: React.ReactNode
    topbar: React.ReactNode
    brandCorner?: React.ReactNode
  }) => (
    <div>
      <nav data-testid="nav-rail">{rail}</nav>
      {brandCorner}
      <header>{topbar}</header>
      {children}
    </div>
  ),
  BrandCorner: ({ label }: { label: string }) => <div>{label}</div>,
  NavRail: ({
    items,
    footerItems,
  }: {
    items: Array<{ label: string; href: string; active?: boolean }>
    footerItems?: Array<{ label: string; href: string }>
  }) => (
    <div className="nav-rail nav-rail--static-dock" data-orientation="vertical">
      {items.map((item) => (
        <a key={item.href} className={item.active ? 'active rail-link' : 'rail-link'} href={item.href} aria-label={item.label}>
          {item.label}
        </a>
      ))}
      {footerItems?.map((item) => (
        <a key={item.href} className="rail-link rail-link-avatar" href={item.href} aria-label={item.label}>
          {item.label}
        </a>
      ))}
    </div>
  ),
  PageTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  MsqdxLogoMark: () => null,
  shellFrameStyle: () => ({}),
}))

describe('app shell', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    pathnameRef.current = PATH_HOME
    document.documentElement.setAttribute('data-theme', 'msqdx-dark')
  })

  it('renders brand, floating navigation, and dashboard title', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    )

    const rail = document.querySelector('.nav-rail')
    expect(screen.getByText('PLEXON')).toBeInTheDocument()
    expect(rail).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', PATH_HOME)
    expect(screen.getByRole('link', { name: /Assistant/i })).toHaveAttribute('href', PATH_ASSISTANT)
    expect(screen.getByRole('link', { name: /Products/i })).toHaveAttribute('href', PATH_PRODUCTS)
    expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute('href', PATH_SETTINGS)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('skips shell chrome on auth routes', () => {
    pathnameRef.current = PATH_LOGIN
    render(
      <AppShell>
        <div>Login only</div>
      </AppShell>,
    )
    expect(document.querySelector('.nav-rail')).toBeNull()
    expect(screen.getByText('Login only')).toBeInTheDocument()
  })
})
