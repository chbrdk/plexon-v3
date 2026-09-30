import { runtimeEnv } from '@/lib/runtime-env'

export const DEFAULT_JEV_MODEL_ID = 'typesafe/jev-1.13'
export const DEFAULT_OPENROUTER_BASE = 'https://openrouter.ai'
export const DEFAULT_JEV_TIMEOUT_MS = 800

export function openRouterApiKey(): string {
  return runtimeEnv('OPENROUTER_API_KEY')
}

export function openRouterApiBaseUrl(): string {
  return runtimeEnv('OPENROUTER_API_BASE_URL') || DEFAULT_OPENROUTER_BASE
}

export function jevModelId(): string {
  return runtimeEnv('JEV_MODEL_ID') || DEFAULT_JEV_MODEL_ID
}

export function jevTimeoutMs(): number {
  const raw = runtimeEnv('JEV_TIMEOUT_MS')
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_JEV_TIMEOUT_MS
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_JEV_TIMEOUT_MS
}

/** `assistant.intent` → `ASSISTANT_INTENT` */
export function useCaseEnvSuffix(useCaseId: string): string {
  return useCaseId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function envTruthy(raw: string): boolean {
  const v = raw.toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

function envFalsy(raw: string): boolean {
  const v = raw.toLowerCase()
  return v === '0' || v === 'false' || v === 'no' || v === 'off'
}

export function isJevShadowEnabled(useCaseId: string): boolean {
  if (!openRouterApiKey()) return false
  const global = runtimeEnv('JEV_SHADOW_ENABLED')
  if (!envTruthy(global)) return false
  const per = runtimeEnv(`JEV_SHADOW_${useCaseEnvSuffix(useCaseId)}`)
  if (per && envFalsy(per)) return false
  if (per && envTruthy(per)) return true
  return true
}

/**
 * Master switch for assistant **routing** Act (intent + planner).
 * Default OFF — heuristics are SoT. Opt-in only with `JEV_ACT_ROUTING=1`
 * plus the per-case `JEV_ACT_ASSISTANT_*` flags.
 * Spec: specs/domain/jev-decisions.md § Routing Act pause
 */
export function isJevRoutingActEnabled(): boolean {
  return envTruthy(runtimeEnv('JEV_ACT_ROUTING'))
}

const ROUTING_ACT_USE_CASES = new Set(['assistant.intent', 'assistant.planner'])

export function isJevActEnabled(useCaseId: string): boolean {
  if (!openRouterApiKey()) return false
  if (ROUTING_ACT_USE_CASES.has(useCaseId) && !isJevRoutingActEnabled()) {
    return false
  }
  return envTruthy(runtimeEnv(`JEV_ACT_${useCaseEnvSuffix(useCaseId)}`))
}
