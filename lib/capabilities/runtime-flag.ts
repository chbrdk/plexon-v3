/**
 * Feature flag for Capability Catalog runtime wiring (Wave C1).
 * Default OFF — catalog modules may still be imported for tests/adapters.
 * @see specs/domain/capability-catalog.md
 */

import { runtimeEnv } from '@/lib/runtime-env';

export const ENV_CAPABILITY_CATALOG_RUNTIME = 'CAPABILITY_CATALOG_RUNTIME';

/** Explicit on: 1 / true / on / yes. Everything else (incl. empty) = off. */
export function isCapabilityCatalogRuntimeEnabled(): boolean {
  const t = runtimeEnv(ENV_CAPABILITY_CATALOG_RUNTIME).toLowerCase();
  return t === '1' || t === 'true' || t === 'on' || t === 'yes';
}
