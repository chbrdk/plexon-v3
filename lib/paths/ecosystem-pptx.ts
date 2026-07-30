/**
 * Central paths for the PLEXON ecosystem enablement PowerPoint.
 * @see knowledge/plexon-ecosystem-pptx.md
 */

import path from 'node:path';

/** Repo-relative directory for stakeholder presentations */
export const ECOSYSTEM_PPTX_DIR = 'assets/presentations';

/** Filename of the generated deck */
export const ECOSYSTEM_PPTX_FILENAME = 'plexon-oekosystem.pptx';

/** Relative path from PLEXON repo root */
export const ECOSYSTEM_PPTX_RELATIVE = path.join(ECOSYSTEM_PPTX_DIR, ECOSYSTEM_PPTX_FILENAME);

export function ecosystemPptxAbsolutePath(repoRoot: string): string {
  return path.join(repoRoot, ECOSYSTEM_PPTX_RELATIVE);
}
