/** Shared Collection insight row — matches `GET /api/platform/me/project-insights`. */
export type CollectionProjectInsight = {
  platformProject: {
    id: string
    name: string
    domain: string | null
    status: string
    companyId: string
  }
  checkion: { externalProjectId: string; scanCount: number } | null
  audion: { externalProjectId: string; personaCount: number } | null
  links: { checkionProject: string; audionProject: string }
  /** Omitted or true: real PLEXON Collection. */
  openPlatformProject?: boolean
}
