/**
 * Access model B — Collection / capability project visibility.
 *
 * Member see/open/edit: creator (`created_by_user_id` / `ownerPlexonUserId`) OR
 * `user_platform_project_assignments` OR legacy product assignment via binding.
 * Company membership alone does **not** grant visibility.
 *
 * Product UIs filter via `accessible-collections` (live) and/or local owner id.
 * Spec: `specs/domain/collection-projects.md` invariant 5.
 */

export {}
