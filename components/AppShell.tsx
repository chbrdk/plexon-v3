'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { ReactNode } from 'react'
import {
  AppFrame,
  BrandCorner,
  MsqdxLogoMark,
  NavRail,
  PageTitle,
  shellFrameStyle,
  type RailDockEdge,
} from '@/lib/msqdx-ui-shell'
import { Avatar } from '@msqdx/ui'
import {
  NavIconAdmin,
  NavIconAssistant,
  NavIconBoard,
  NavIconBolt,
  NavIconOverview,
  NavIconProducts,
  NavIconProjects,
} from '@/components/nav-icons'
import { BrandColorInitializer } from '@/components/settings/BrandColorInitializer'
import { PlatformAssistantHost } from '@/components/PlatformAssistantHost'
import { shellPaths } from '@/lib/shell-paths'
import {
  PATH_ADMIN,
  PATH_ASSISTANT,
  PATH_ASSISTANT_EMBED,
  PATH_BOARD,
  PATH_EVENT_QUICK_CHECK,
  PATH_FORGOT_PASSWORD,
  PATH_HOME,
  PATH_LOGIN,
  PATH_PRODUCTS,
  PATH_PROJECTS,
  PATH_REGISTER,
  PATH_RESET_PASSWORD,
  PATH_SETTINGS,
} from '@/lib/constants'
import { USER_ROLE } from '@/lib/db/schema'
import { useI18n } from '@/components/i18n/I18nProvider'

const AUTH_PATHS = [PATH_LOGIN, PATH_REGISTER, PATH_FORGOT_PASSWORD, PATH_RESET_PASSWORD]

function isAssistantEmbedPath(pathname: string | null): boolean {
  return Boolean(pathname === PATH_ASSISTANT_EMBED || pathname?.startsWith(`${PATH_ASSISTANT_EMBED}/`))
}

const TITLE_BY_PREFIX: Array<{ prefix: string; titleKey: string }> = [
  { prefix: PATH_ADMIN, titleKey: 'nav.adminConsole' },
  { prefix: PATH_ASSISTANT, titleKey: 'nav.assistant' },
  { prefix: PATH_EVENT_QUICK_CHECK, titleKey: 'nav.eventQuickCheck' },
  { prefix: PATH_PROJECTS, titleKey: 'nav.projects' },
  { prefix: PATH_PRODUCTS, titleKey: 'nav.products' },
  { prefix: PATH_BOARD, titleKey: 'nav.board' },
  { prefix: PATH_SETTINGS, titleKey: 'nav.settings' },
]

export function AppShell({
  children,
  title,
  titleHref,
  titleTone = 'default',
  description,
  leading,
  actions,
  status,
}: {
  children: ReactNode
  title?: string | null
  titleHref?: string
  titleTone?: 'default' | 'context'
  description?: string
  leading?: ReactNode
  actions?: ReactNode
  status?: ReactNode
}) {
  const pathname = usePathname()
  const { t } = useI18n()
  const { data: session } = useSession()
  const [railEdge, setRailEdge] = useState<RailDockEdge>(shellPaths.railDockEdge)

  const viewerRole = (session?.user as { role?: string } | undefined)?.role ?? null
  const isAdmin = viewerRole === USER_ROLE.ADMIN
  const displayName =
    session?.user?.name?.trim() ||
    session?.user?.email?.trim() ||
    shellPaths.defaultDisplayName

  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname?.startsWith(`${p}/`))
  const isEmbedPage = isAssistantEmbedPath(pathname)

  const frameStyle = useMemo(
    () =>
      shellFrameStyle({
        railInsetRem: shellPaths.railInsetRem,
        railGapRem: shellPaths.railGapRem,
        railWidthRem: shellPaths.railWidthRem,
        mainGutterRem: shellPaths.mainGutterRem,
      }),
    [],
  )

  function isActive(href: string): boolean {
    if (href === PATH_HOME) return pathname === href
    return Boolean(pathname?.startsWith(href))
  }

  const resolvedTitle =
    title ??
    TITLE_BY_PREFIX.find((entry) =>
      entry.prefix === PATH_HOME ? pathname === PATH_HOME : pathname?.startsWith(entry.prefix),
    )?.titleKey ??
    (pathname === PATH_HOME ? 'nav.dashboard' : null)

  const titleLabel =
    resolvedTitle == null
      ? null
      : resolvedTitle.startsWith('nav.') || resolvedTitle.includes('.')
        ? t(resolvedTitle)
        : resolvedTitle

  if (isAuthPage || isEmbedPage) {
    return <>{children}</>
  }

  const primaryNav = [
    {
      id: 'home',
      href: PATH_HOME,
      label: t('nav.dashboard'),
      icon: <NavIconOverview />,
    },
    {
      id: 'projects',
      href: PATH_PROJECTS,
      label: t('nav.projects'),
      icon: <NavIconProjects />,
    },
    {
      id: 'assistant',
      href: PATH_ASSISTANT,
      label: t('nav.assistant'),
      icon: <NavIconAssistant />,
    },
    {
      id: 'event-quick-check',
      href: PATH_EVENT_QUICK_CHECK,
      label: t('nav.eventQuickCheck'),
      icon: <NavIconBolt />,
    },
    {
      id: 'products',
      href: PATH_PRODUCTS,
      label: t('nav.products'),
      icon: <NavIconProducts />,
    },
    ...(isAdmin
      ? [
          {
            id: 'board',
            href: PATH_BOARD,
            label: t('nav.board'),
            icon: <NavIconBoard />,
          },
          {
            id: 'admin',
            href: PATH_ADMIN,
            label: t('nav.adminConsole'),
            icon: <NavIconAdmin />,
          },
        ]
      : []),
  ]

  const titleNode =
    titleLabel != null && titleLabel !== '' ? (
      titleTone === 'context' ? (
        <PageTitle className="plexon-page-title--context">{titleLabel}</PageTitle>
      ) : (
        <PageTitle>{titleLabel}</PageTitle>
      )
    ) : null

  const brandContent =
    leading ??
    (titleNode && titleHref ? (
      <Link href={titleHref} className="plexon-page-title-link">
        {titleNode}
      </Link>
    ) : (
      titleNode
    ))

  return (
    <>
      <BrandColorInitializer />
      <AppFrame
        railEdge={railEdge}
        style={frameStyle}
        rail={
          <NavRail
            dockable
            dockStorageKey={shellPaths.railDockStorageKey}
            defaultDockEdge={shellPaths.railDockEdge}
            onDockEdgeChange={setRailEdge}
            logo={<MsqdxLogoMark size={26} title="MSQ DX" />}
            logoLabel="PLEXON home"
            linkComponent={Link}
            items={primaryNav.map((item) => ({ ...item, active: isActive(item.href) }))}
            footerItems={[
              {
                id: 'settings',
                label: t('nav.settings'),
                href: PATH_SETTINGS,
                active: isActive(PATH_SETTINGS),
                ariaLabel: t('nav.settings'),
                icon: <Avatar name={displayName} size="sm" className="rail-avatar" />,
              },
            ]}
          />
        }
        brandCorner={<BrandCorner label="PLEXON" />}
        topbar={
          <>
            <div className="topbar-brand">{brandContent}</div>
            <div className="topbar-right">
              {status}
              {actions}
            </div>
          </>
        }
      >
        {description ? <p className="plexon-page-lead">{description}</p> : null}
        <div className="plexon-stage" data-plexon-content>
          {children}
        </div>
      </AppFrame>
      <PlatformAssistantHost product="plexon" plexonPublicBase="" />
    </>
  )
}
