export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const { startPlatformOutboxDrainScheduler } = await import(
    '@/lib/platform-outbox-scheduler'
  );
  startPlatformOutboxDrainScheduler();
}
