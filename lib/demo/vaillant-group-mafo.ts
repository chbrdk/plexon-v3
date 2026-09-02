/**
 * Vaillant **Group** Collection demo — MaFo Use Case 1 (barrier research loop).
 * NOT the consumer-only "Vaillant" brand project.
 * @see knowledge/vaillant-group-mafo-demo.md
 */

/** Plexon Collection (sole user-facing project). */
export const VAILLANT_GROUP_PLATFORM_PROJECT_ID =
  'f3d27e9f-d14c-4880-82be-3ca31c051173' as const;

export const VAILLANT_GROUP_COLLECTION_NAME = 'Vaillant Group' as const;

/** Capability mirror IDs (staging federation). */
export const VAILLANT_GROUP_AUDION_PROJECT_ID = 'proj-vaillant-group-mtb6qr6b' as const;
export const VAILLANT_GROUP_BRANDION_PROJECT_ID = 'proj-mtb6qr7q' as const;
export const VAILLANT_GROUP_CREATION_PROJECT_ID = 'proj-mtb6qr9e' as const;

export const VAILLANT_GROUP_BRANDION_GUIDELINE_ID = 'gl-mtinudb1' as const;
export const VAILLANT_GROUP_SPIRION_CAPTURE_ID = 'cap_bdda0c1e082944b891d1e25ff99b3f8c' as const;

/** Corporate SSOT (Collection profile). */
export const VAILLANT_GROUP_CORPORATE_URL = 'https://www.vaillant-group.com/' as const;

/** B2C touchpoint for UC1 homeowner barrier research (vaillant.de — not a separate Collection). */
export const VAILLANT_GROUP_B2C_TOUCHPOINT_URL = 'https://www.vaillant.de/' as const;
/** B2C Wärmepumpen hub (live vaillant.de — `/heizung/waermepumpe/` returns 404 since IA move). */
export const VAILLANT_GROUP_B2C_WAERMEPUMPE_URL =
  'https://www.vaillant.de/produkte/waermepumpen/' as const;

/** B2B installer portal (vaillant.de/fachpartner/ redirects here). */
export const VAILLANT_GROUP_B2B_FACHPARTNER_URL = 'https://www.myvaillantpro.de/' as const;

export const VAILLANT_GROUP_FLOW_TEMPLATE_ID = 'vaillant-barrier-research-v1' as const;
export const VAILLANT_GROUP_FLOW_UC2_TEMPLATE_ID = 'vaillant-installer-dual-v1' as const;

export const VAILLANT_GROUP_FLOW_DEFAULT_NAME =
  'Vaillant Group · Barrier Research (UC1)' as const;
export const VAILLANT_GROUP_FLOW_UC2_DEFAULT_NAME =
  'Vaillant Group · Installer Dual Perspective (UC2)' as const;

export function isVaillantGroupCollection(platformProjectId: string | null | undefined): boolean {
  return platformProjectId?.trim() === VAILLANT_GROUP_PLATFORM_PROJECT_ID;
}

/** AUDION target-group ids — keep in sync with audion-v3 `vaillant-group-mafo-seed.ts`. */
export const VAILLANT_GROUP_TG_UC1_ALTBAU = 'tg-vg-altbau-familie' as const;
export const VAILLANT_GROUP_TG_UC2_HOMEOWNER = 'tg-vg-homeowner-decision' as const;
export const VAILLANT_GROUP_TG_UC2_INSTALLER = 'tg-vg-fachhandwerker' as const;

export const VAILLANT_GROUP_TG_UC1_ALTBAU_NAME =
  'Familie · unsaniertes Bestandsgebäude' as const;
export const VAILLANT_GROUP_TG_UC2_HOMEOWNER_NAME = 'Endkunden-Entscheider' as const;
export const VAILLANT_GROUP_TG_UC2_INSTALLER_NAME = 'Fachhandwerker · SHK' as const;

/** Default primary personas on flow templates (linked to target groups above). */
export const VAILLANT_GROUP_PERSONA_SANDRA_ALTBAU = 'persona-vg-sandra-altbau' as const;
export const VAILLANT_GROUP_PERSONA_SANDRA_ALTBAU_NAME = 'Sandra Müller' as const;
export const VAILLANT_GROUP_PERSONA_MEISTER_KLAUS = 'persona-vg-meister-klaus' as const;
export const VAILLANT_GROUP_PERSONA_MEISTER_KLAUS_NAME = 'Klaus Brenner' as const;

/**
 * All MaFo demo persona display names (AUDION seed) — used to infer Collection
 * when the Assistant chat has no platformProjectId selected.
 */
export const VAILLANT_GROUP_MAFO_PERSONA_NAMES = [
  'Sandra Müller',
  'Thomas Weber',
  'Lisa Hartmann',
  'Frank Meier',
  'Helmut Krause',
  'Jana Schmitt',
  'Klaus Brenner',
  'Sandra Vogt',
  'Tim Schäfer',
] as const;

export function mentionsVaillantGroupCollection(text: string): boolean {
  return /\bvaillant\s*group\b/i.test(text);
}

export function matchesVaillantGroupMafoPersonaName(name: string | null | undefined): boolean {
  const needle = name?.trim().toLowerCase();
  if (!needle) return false;
  return VAILLANT_GROUP_MAFO_PERSONA_NAMES.some((n) => {
    const hay = n.toLowerCase();
    return hay === needle || hay.includes(needle) || needle.includes(hay);
  });
}
