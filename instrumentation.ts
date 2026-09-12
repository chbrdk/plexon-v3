/**
 * Next.js instrumentation hook.
 * Outbox drain uses pg/drizzle — must never be statically traced into the Edge
 * instrumentation bundle (build fails with crypto/fs/path module-not-found).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { startPlatformOutboxDrainScheduler } = await import(
    /* webpackIgnore: true */
    './lib/platform-outbox-scheduler'
  );
  startPlatformOutboxDrainScheduler();
}
