/** Nur Domain-Teil für Logs (keine volle E-Mail). */
export function emailDomainForLog(normalizedEmail: string): string {
  const at = normalizedEmail.lastIndexOf('@');
  return at >= 0 ? normalizedEmail.slice(at + 1) : 'invalid-email';
}
