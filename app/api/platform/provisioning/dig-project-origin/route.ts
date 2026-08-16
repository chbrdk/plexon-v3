/**
 * Legacy DIG origin path — forwards to canonical SPIRION logic.
 * Body may still send `digProjectId`; new callers should use spirion-project-origin + `spirionProjectId`.
 */
export { POST } from '../spirion-project-origin/route';
