import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventQuickCheckVoiceRadar } from '@/components/event-quick-check/EventQuickCheckVoiceRadar'

describe('EventQuickCheckVoiceRadar', () => {
  it('renders svg spider for voice axes', () => {
    const { container } = render(
      <EventQuickCheckVoiceRadar
        ariaLabel="Wettbewerber spider"
        points={[
          {
            key: 'a.de',
            domain: 'a.de',
            label: 'a.de · du',
            value: 0.62,
            highlight: true,
            mentionCount: 12,
            avgPosition: 2.1,
          },
          { key: 'b.de', domain: 'b.de', label: 'b.de', value: 0.46 },
          { key: 'c.de', domain: 'c.de', label: 'c.de', value: 0.08 },
          { key: 'd.de', domain: 'd.de', label: 'd.de', value: 0.06 },
        ]}
      />,
    )
    expect(container.querySelector('.plexon-eqc-voice-radar__svg')).toBeTruthy()
    expect(container.querySelector('.plexon-eqc-voice-radar__shape')).toBeTruthy()
    expect(container.querySelectorAll('.plexon-eqc-voice-radar__label').length).toBe(4)
    expect(container.querySelector('.plexon-eqc-voice-radar__dot--own')).toBeTruthy()

    const hit = container.querySelector('.plexon-eqc-voice-radar__hit-area')
    expect(hit).toBeTruthy()
    fireEvent.mouseEnter(hit!)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    expect(screen.getByText('Share of voice')).toBeTruthy()
    expect(screen.getByText('62%')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
  })
})
