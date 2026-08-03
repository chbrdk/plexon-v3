import type { ReactNode } from 'react'

/** Local nav glyphs — avoids lucide React context during Next SSR. */
function NavSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      className="ui-icon"
      width={20}
      height={20}
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

/** Dashboard — layout tiles. */
export function NavIconOverview() {
  return (
    <NavSvg>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </NavSvg>
  )
}

/** Projects — folder. */
export function NavIconProjects() {
  return (
    <NavSvg>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </NavSvg>
  )
}

/** Assistant — message bubble. */
export function NavIconAssistant() {
  return (
    <NavSvg>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </NavSvg>
  )
}

/** Event Quick Check — bolt. */
export function NavIconBolt() {
  return (
    <NavSvg>
      <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />
    </NavSvg>
  )
}

/** Products — apps grid. */
export function NavIconProducts() {
  return (
    <NavSvg>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </NavSvg>
  )
}

/** Board — widgets. */
export function NavIconBoard() {
  return (
    <NavSvg>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </NavSvg>
  )
}

/** Admin — shield. */
export function NavIconAdmin() {
  return (
    <NavSvg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </NavSvg>
  )
}

/** Collection metric — scan / search pulse. */
export function MetricIconScans() {
  return (
    <NavSvg>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </NavSvg>
  )
}

/** Collection metric — target groups. */
export function MetricIconTargetGroups() {
  return (
    <NavSvg>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21.5 19a4 4 0 0 0-5.2-3.8" />
    </NavSvg>
  )
}

/** Collection metric — personas. */
export function MetricIconPersonas() {
  return (
    <NavSvg>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </NavSvg>
  )
}
