'use client'

type UiSplitLayoutProps = {
  left: React.ReactNode
  right: React.ReactNode
}

/** Two-column layout for paired generative UI blocks. */
export function UiSplitLayout({ left, right }: UiSplitLayoutProps) {
  return (
    <div className="plexon-assistant-split">
      <div className="plexon-assistant-split-col">{left}</div>
      <div className="plexon-assistant-split-col">{right}</div>
    </div>
  )
}
