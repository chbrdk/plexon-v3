/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventQuickCheckDistributionsMagazineSection } from '@/components/event-quick-check/EventQuickCheckDistributionsMagazineSection'
import type { EventQuickCheckReportDistributionsSection } from '@/lib/assistant/reports/event-quick-check-report-types'

const sample: EventQuickCheckReportDistributionsSection = {
  readability: {
    bands: [
      { id: 'standard', label: 'Standard', value: 22 },
      { id: 'complex', label: 'Complex', value: 26 },
      { id: 'very', label: 'Very complex', value: 2 },
    ],
    score: 10.2,
    grade: 'Complex (College)',
    dwellSecondsMedian: 571,
  },
  eco: {
    grades: [
      { id: 'C', label: 'C', value: 26 },
      { id: 'D', label: 'D', value: 7 },
      { id: 'E', label: 'E', value: 3 },
      { id: 'F', label: 'F', value: 14 },
    ],
    grade: 'C',
    avgCo2: 1.02,
  },
  links: {
    slices: [
      { id: 'internal', label: 'Internal', value: 19689 },
      { id: 'external', label: 'External', value: 656 },
    ],
    internal: 19689,
    external: 656,
    broken: 0,
    total: 20345,
  },
}

describe('EventQuickCheckDistributionsMagazineSection', () => {
  it('renders Checkion-parity headline and three donut regions', () => {
    render(<EventQuickCheckDistributionsMagazineSection distributions={sample} />)
    expect(screen.getByRole('heading', { name: /Share across the corpus/i })).toBeTruthy()
    expect(screen.getByText('Readability')).toBeTruthy()
    expect(screen.getByText('Eco grades')).toBeTruthy()
    expect(screen.getByText('Link mix')).toBeTruthy()
    expect(screen.getByLabelText(/Readability band share/i)).toBeTruthy()
    expect(screen.getByLabelText(/Eco grade share/i)).toBeTruthy()
    expect(screen.getByLabelText(/Internal, external and broken links/i)).toBeTruthy()
    expect(document.querySelectorAll('.plexon-eqc-donut').length).toBe(3)
  })
})
