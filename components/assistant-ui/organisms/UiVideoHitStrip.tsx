'use client'

import type { ReactNode } from 'react'
import {
  ChatBlockPanel,
  IconClock,
  IconHistory,
  IconProjects,
  IconText,
  IconVideo,
  Panel,
  StepStrip,
  StepStripItem,
  Text,
} from '@msqdx/ui'
import type { videoHitStripPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof videoHitStripPropsSchema>
type Hit = Props['items'][number]

function MetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="plexon-video-hit-row">
      <span className="plexon-video-hit-row-icon" aria-hidden>
        {icon}
      </span>
      <span className="plexon-video-hit-row-text">{children}</span>
    </div>
  )
}

function HitPoster({ src, title }: { src?: string; title: string }) {
  if (!src) {
    return <div className="plexon-video-hit-shot plexon-video-hit-shot--empty" aria-hidden />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- same-origin poster proxy JPEG
    <img src={src} alt="" className="plexon-video-hit-shot" loading="lazy" data-title={title} />
  )
}

/**
 * Generative `video_hit_strip` — VIDEON scene search cards (StepStrip like Product /chat).
 * Spec: assistant-videon-mcp.md
 */
export function UiVideoHitStrip({ title, items }: Props) {
  return (
    <div data-plexon-assistant-ui className="plexon-video-hit-strip">
      <ChatBlockPanel title={title ?? 'Szenen'} eyebrow="videon" className="plexon-video-hit-panel">
        <StepStrip
          className="plexon-video-hits"
          aria-label={title ?? 'Szenen'}
          scrollerLabel={title ?? 'Szenen'}
        >
          {items.map((hit: Hit, idx) => {
            const label = [hit.title, hit.sceneLabel, hit.timingLabel].filter(Boolean).join(' · ')
            return (
              <StepStripItem
                key={hit.id}
                index={idx}
                className="plexon-video-hit-slide"
                label={label}
                onActivate={() => {
                  window.open(hit.href, '_blank', 'noopener,noreferrer')
                }}
              >
                <Panel as="div" className="plexon-video-hit-card">
                  <HitPoster src={hit.posterUrl} title={hit.title} />
                  <div className="plexon-video-hit-body">
                    <Text role="headline" as="h4" className="plexon-video-hit-title">
                      {hit.title}
                    </Text>
                    <div className="plexon-video-hit-facts" role="list">
                      {hit.sceneLabel ? (
                        <MetaRow icon={<IconVideo size={14} />}>
                          <span role="listitem">{hit.sceneLabel}</span>
                        </MetaRow>
                      ) : null}
                      {hit.timingLabel ? (
                        <MetaRow icon={<IconClock size={14} />}>
                          <span role="listitem">{hit.timingLabel}</span>
                        </MetaRow>
                      ) : null}
                      {hit.durationLabel ? (
                        <MetaRow icon={<IconHistory size={14} />}>
                          <span role="listitem">{hit.durationLabel}</span>
                        </MetaRow>
                      ) : null}
                      {hit.projectName ? (
                        <MetaRow icon={<IconProjects size={14} />}>
                          <span role="listitem">{hit.projectName}</span>
                        </MetaRow>
                      ) : null}
                      {hit.snippet ? (
                        <MetaRow icon={<IconText size={14} />}>
                          <span role="listitem" className="plexon-video-hit-snippet">
                            {hit.snippet}
                          </span>
                        </MetaRow>
                      ) : null}
                    </div>
                  </div>
                </Panel>
              </StepStripItem>
            )
          })}
        </StepStrip>
      </ChatBlockPanel>
    </div>
  )
}
