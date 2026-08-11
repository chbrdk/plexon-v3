/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('@msqdx/ui', () => ({
  ChatBlockPanel: ({
    title,
    children,
  }: {
    title?: string
    children?: React.ReactNode
  }) => (
    <section data-testid="panel">
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  ),
  ChatPhaseStrip: ({
    phases,
    onPhaseActivate,
  }: {
    phases: Array<{ id: string; label: string }>
    onPhaseActivate?: (phase: { id: string; label: string }) => void
  }) => (
    <ol>
      {phases.map((phase) => (
        <li key={phase.id}>
          <button type="button" onClick={() => onPhaseActivate?.(phase)}>
            {phase.label}
          </button>
        </li>
      ))}
    </ol>
  ),
  ChatMomentList: ({ items }: { items: Array<{ label: string }> }) => (
    <ul>
      {items.map((item) => (
        <li key={item.label}>{item.label}</li>
      ))}
    </ul>
  ),
}))

import { UiPhaseStrip } from '@/components/assistant-ui/organisms/UiPhaseStrip'

describe('UiPhaseStrip interactive', () => {
  it('switches moments when a phase is activated', () => {
    render(
      <UiPhaseStrip
        title="Checkout"
        phases={[
          {
            id: 'ph1',
            label: 'Awareness',
            active: true,
            status: 'current',
            moments: [{ kind: 'action', label: 'See ad' }],
          },
          {
            id: 'ph2',
            label: 'Consideration',
            status: 'upcoming',
            moments: [{ kind: 'pain', label: 'Too many fields' }],
          },
        ]}
      />,
    )

    expect(screen.getByText('See ad')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Consideration' }))
    expect(screen.getByText('Too many fields')).toBeTruthy()
    expect(screen.queryByText('See ad')).toBeNull()
  })
})
