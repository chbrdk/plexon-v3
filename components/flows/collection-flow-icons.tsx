import type { ReactNode } from 'react'

/** Local flow-board glyphs (Audion board parity) — avoids lucide React context during Next SSR. */
function FlowSvg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function IconPlay({ size = 18 }: { size?: number }) {
  return (
    <FlowSvg size={size}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" strokeLinejoin="round" />
    </FlowSvg>
  )
}

export function IconStop({ size = 18 }: { size?: number }) {
  return (
    <FlowSvg size={size}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </FlowSvg>
  )
}

export function IconSave({ size = 18 }: { size?: number }) {
  return (
    <FlowSvg size={size}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-7H7v7" />
      <path d="M7 3v5h8" />
    </FlowSvg>
  )
}

export function IconUndo({ size = 18 }: { size?: number }) {
  return (
    <FlowSvg size={size}>
      <path d="M9 14 4 9l5-5" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </FlowSvg>
  )
}

export function IconReset({ size = 18 }: { size?: number }) {
  return (
    <FlowSvg size={size}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </FlowSvg>
  )
}

export function IconGrip({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="ui-icon plexon-flow-toolbar-grip-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="9" cy="7" r="1.25" />
      <circle cx="15" cy="7" r="1.25" />
      <circle cx="9" cy="12" r="1.25" />
      <circle cx="15" cy="12" r="1.25" />
      <circle cx="9" cy="17" r="1.25" />
      <circle cx="15" cy="17" r="1.25" />
    </svg>
  )
}

export function IconPlus({ size = 24 }: { size?: number }) {
  return (
    <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconDelete({ size = 16 }: { size?: number }) {
  return (
    <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}
