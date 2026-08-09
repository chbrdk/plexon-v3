import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventQuickCheckVoiceRadar } from '@/components/event-quick-check/EventQuickCheckVoiceRadar'

describe('EventQuickCheckVoiceRadar', () => {
  it('renders svg spider for voice axes', () => {
    const { container } = render(
      <EventQuickCheckVoiceRadar
        ariaLabel="Wettbewerber spider"
        points={[
          { key: 'a.de', label: 'a.de · du', value: 0.62, highlight: true },
          { key: 'b.de', label: 'b.de', value: 0.46 },
          { key: 'c.de', label: 'c.de', value: 0.08 },
          { key: 'd.de', label: 'd.de', value: 0.06 },
        ]}
      />,
    )
    expect(container.querySelector('.plexon-eqc-voice-radar__svg')).toBeTruthy()
    expect(container.querySelector('.plexon-eqc-voice-radar__shape')).toBeTruthy()
    expect(container.querySelectorAll('.plexon-eqc-voice-radar__label').length).toBe(4)
    expect(container.querySelector('.plexon-eqc-voice-radar__dot--own')).toBeTruthy()
  })
})
