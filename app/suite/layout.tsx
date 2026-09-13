import { FONT_URL_SUITE_LANDING } from '@/lib/constants'

export default function SuiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href={FONT_URL_SUITE_LANDING} />
      {children}
    </>
  )
}
