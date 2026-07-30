/**
 * Read `process.env` at runtime using a dynamic key.
 * Coolify injects secrets when the container starts; static `process.env.FOO` in bundled
 * server code can be replaced at build time with `undefined` if `FOO` was unset during `next build`.
 */
export function runtimeEnv(name: string): string {
  if (typeof process === 'undefined') return '';
  try {
    const v = process.env[name];
    return typeof v === 'string' ? v.trim() : '';
  } catch {
    return '';
  }
}
