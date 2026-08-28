import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AgencyLandingPage from '@/app/agency/page'
import { PATH_AGENCY_DEMO } from '@/lib/constants'

describe('agency landing demo', () => {
  afterEach(cleanup)

  it('keeps the route canonical and renders the conversion journey', () => {
    expect(PATH_AGENCY_DEMO).toBe('/agency')

    render(<AgencyLandingPage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('MAKEITUNMISSABLE.')
    expect(screen.getByRole('heading', { name: 'Built to be seen.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'From first thought to full force.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tell us everything' })).toHaveAttribute(
      'href',
      'mailto:hello@offgrid.example',
    )
  })
})
