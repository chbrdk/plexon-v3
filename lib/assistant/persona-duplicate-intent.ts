/**
 * Guards so “dupliziere Julia Wendt” never becomes persona_bootstrap.
 * Spec: specs/domain/jev-decisions.md § Act-apply · assistant-page-context deixis
 */

/** Create/bootstrap a fresh audience — not copy of an existing named persona. */
const PERSONA_CREATE_VERBS =
  /\b(generier\w*|erstell\w*|anleg\w*|bootstrap|easy\s*setup)\b/i

/** Copy/clone of an existing persona (must stay free_chat + AUDION tools). */
const PERSONA_DUPLICATE_VERBS = /\b(duplizier\w*|kopier\w*|clone|klon\w*)\b/i

/**
 * Enrich/patch deep fields on an existing persona (or a fresh copy).
 * “pflege die Tiefenfelder bei Julia Wendt (Kopie) nach” must enable writes.
 */
const PERSONA_ENRICH_VERBS =
  /\b(nachpfleg\w*|ergänz\w*|uebertrag\w*|übertrag\w*|angleich\w*|patch(en|e|t)?|sync(en|e|t)?)\b/i

/** “pflege … nach” / Tiefenfelder / (Kopie) + write-ish verbs */
const PERSONA_ENRICH_PHRASES =
  /\b(tiefenfeld\w*|goals?|frustrations?|motivations?|stress[- ]?trigger\w*)\b/i

const PERSONA_PFLEGE_NACH =
  /\bpfleg\w*\b[\s\S]{0,80}\bnach\b|\bnach\b[\s\S]{0,40}\bpfleg\w*\b/i

/** Two-token person-like name (case-insensitive; chat often lowercase). */
const NAMED_PERSON =
  /\b[A-Za-zÄÖÜäöüß][\wÄÖÜäöüß'-]{1,40}\s+[A-Za-zÄÖÜäöüß][\wÄÖÜäöüß'-]{1,40}\b/u

export function isPersonaDuplicateOrCopyIntent(prompt: string): boolean {
  return PERSONA_DUPLICATE_VERBS.test(prompt.trim())
}

/** Patch/enrich deep fields — needs audion_persona_patch (write plan). */
export function isPersonaEnrichOrPatchIntent(prompt: string): boolean {
  const trimmed = prompt.trim()
  if (!trimmed) return false
  if (PERSONA_ENRICH_VERBS.test(trimmed)) return true
  if (PERSONA_PFLEGE_NACH.test(trimmed)) return true
  if (PERSONA_ENRICH_PHRASES.test(trimmed) && (NAMED_PERSON.test(trimmed) || /\(kopie\)/i.test(trimmed))) {
    return true
  }
  return false
}

/** Duplicate/copy or enrich/patch — planner must set allowWriteTools. */
export function isPersonaAudienceWriteIntent(prompt: string): boolean {
  return isPersonaDuplicateOrCopyIntent(prompt) || isPersonaEnrichOrPatchIntent(prompt)
}

/**
 * True when Act must NOT flip heuristic free_chat → persona_bootstrap.
 * Duplicate/copy/enrich, or a named person without create/bootstrap verbs.
 */
export function shouldRejectPersonaBootstrapAct(prompt: string): boolean {
  const trimmed = prompt.trim()
  if (!trimmed) return false
  if (isPersonaAudienceWriteIntent(trimmed)) return true
  if (PERSONA_CREATE_VERBS.test(trimmed)) return false
  // “julia wendt …” / “Markus Reinhardt finden” without create → not bootstrap
  if (NAMED_PERSON.test(trimmed)) return true
  return false
}
