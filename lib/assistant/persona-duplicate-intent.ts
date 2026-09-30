/**
 * Guards so “dupliziere Julia Wendt” never becomes persona_bootstrap.
 * Spec: specs/domain/jev-decisions.md § Act-apply · assistant-page-context deixis
 */

/** Create/bootstrap a fresh audience — not copy of an existing named persona. */
const PERSONA_CREATE_VERBS =
  /\b(generier\w*|erstell\w*|anleg\w*|bootstrap|easy\s*setup)\b/i

/** Copy/clone of an existing persona (must stay free_chat + AUDION tools). */
const PERSONA_DUPLICATE_VERBS = /\b(duplizier\w*|kopier\w*|clone|klon\w*)\b/i

/** Two-token person-like name (case-insensitive; chat often lowercase). */
const NAMED_PERSON =
  /\b[A-Za-zÄÖÜäöüß][\wÄÖÜäöüß'-]{1,40}\s+[A-Za-zÄÖÜäöüß][\wÄÖÜäöüß'-]{1,40}\b/u

export function isPersonaDuplicateOrCopyIntent(prompt: string): boolean {
  return PERSONA_DUPLICATE_VERBS.test(prompt.trim())
}

/**
 * True when Act must NOT flip heuristic free_chat → persona_bootstrap.
 * Duplicate/copy, or a named person without create/bootstrap verbs.
 */
export function shouldRejectPersonaBootstrapAct(prompt: string): boolean {
  const trimmed = prompt.trim()
  if (!trimmed) return false
  if (isPersonaDuplicateOrCopyIntent(trimmed)) return true
  if (PERSONA_CREATE_VERBS.test(trimmed)) return false
  // “julia wendt …” / “Markus Reinhardt finden” without create → not bootstrap
  if (NAMED_PERSON.test(trimmed)) return true
  return false
}
