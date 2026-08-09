import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventQuickCheckMovesGallery } from '@/components/event-quick-check/EventQuickCheckMovesGallery'

describe('EventQuickCheckMovesGallery', () => {
  it('paginates recommendations like a slideshow', () => {
    render(
      <EventQuickCheckMovesGallery
        recommendations={[
          { title: 'First move', description: 'Do A', priority: 1, category: 'GEO' },
          { title: 'Second move', description: 'Do B', priority: 2, category: 'GEO' },
        ]}
      />,
    )
    expect(screen.getByText('First move')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Nächste Empfehlung'))
    expect(screen.getByText('Second move')).toBeTruthy()
  })
})
