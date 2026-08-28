import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OFF/GRID — Independent Design Practice',
  description:
    'OFF/GRID builds identities, digital experiences, and motion systems for ambitious brands.',
}

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return children
}
