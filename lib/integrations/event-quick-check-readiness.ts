/**
 * Event Quick Check staging readiness — config diagnostics (no live probe).
 * Used by GET /api/assistant/event-quick-check/readiness and the EQC page banner.
 */

import {
  formatAudionMisconfigHint,
  getAudionUrlDiagnostics,
  type AudionUrlDiagnostics,
} from '@/lib/integrations/audion-connectivity'
import {
  formatCheckionMisconfigHint,
  getCheckionUrlDiagnostics,
  type CheckionUrlDiagnostics,
} from '@/lib/integrations/checkion-connectivity'
import { getAudionWebOrigin, getCheckionServiceApiUrl } from '@/lib/constants'

export type EventQuickCheckReadiness = {
  ready: boolean
  checkion: {
    configured: boolean
    hint: string | null
    apiUrlPrefix: string
    diagnostics: CheckionUrlDiagnostics
  }
  audion: {
    configured: boolean
    hint: string | null
    apiUrlPrefix: string
    webOriginPrefix: string
    diagnostics: AudionUrlDiagnostics
  }
  /** Human-readable blockers for UI Alert. */
  blockers: string[]
}

export function getEventQuickCheckReadiness(): EventQuickCheckReadiness {
  const checkionDiag = getCheckionUrlDiagnostics()
  const audionDiag = getAudionUrlDiagnostics()

  const checkionConfigured =
    checkionDiag.hasAssistantToken && checkionDiag.assistantTokenFormatOk
  const audionConfigured = audionDiag.hasToken && audionDiag.tokenFormatOk && !audionDiag.looksLikeWebApp

  const checkionHint = formatCheckionMisconfigHint(checkionDiag)
  const audionHint = formatAudionMisconfigHint(audionDiag)

  const blockers: string[] = []
  if (!checkionConfigured) {
    blockers.push(
      checkionHint ??
        'CHECKION_API_TOKEN fehlt oder ist ungültig — Deep Scan und GEO benötigen checkion-v3.',
    )
  } else if (!checkionDiag.apiUrlExplicit) {
    blockers.push(
      'CHECKION_API_URL ist nicht gesetzt — Standard zeigt oft auf Prod-CHECKION. Für Staging: https://checkion-v3.projects-a.plygrnd.tech setzen.',
    )
  }

  if (!audionConfigured) {
    blockers.push(
      audionHint ??
        'AUDION_API_TOKEN / AUDION_API_URL fehlen — Personas benötigen audion-v3.',
    )
  }

  const ready = blockers.length === 0

  return {
    ready,
    checkion: {
      configured: checkionConfigured && checkionDiag.apiUrlExplicit,
      hint: checkionHint,
      apiUrlPrefix: getCheckionServiceApiUrl().replace(/\/+$/, '').slice(0, 64),
      diagnostics: checkionDiag,
    },
    audion: {
      configured: audionConfigured,
      hint: audionHint,
      apiUrlPrefix: audionDiag.apiUrlPrefix,
      webOriginPrefix: getAudionWebOrigin().slice(0, 64),
      diagnostics: audionDiag,
    },
    blockers,
  }
}
