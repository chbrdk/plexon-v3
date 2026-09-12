/**
 * Instrumentation hook kept empty on purpose.
 *
 * Outbox drain boots from `getDb()` (server-only). Starting it here either
 * pulled `pg`/`crypto` into the Edge compile graph or, with `webpackIgnore`,
 * left the module missing under `.next/server` at runtime.
 */
export async function register() {
  // no-op
}
