/**
 * Documented default for Next.js route `export const maxDuration = …` literals.
 * Confirm routes return 202 quickly; long CHECKION crawls are polled in-process
 * and must NOT be sized to this value (`domainScanPollMaxMs` is independent).
 */
export const EQC_LONG_RUNNING_MAX_DURATION_SEC = 900;
