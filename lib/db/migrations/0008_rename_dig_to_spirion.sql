-- Rename legacy DIG product ids to SPIRION (2026-08-16).
-- Run against Plexon Postgres after deploying code that uses product id `spirion`.
-- Safe to re-run: only updates rows still labeled `dig`.

UPDATE platform_project_product_bindings
SET product_id = 'spirion', updated_at = now()
WHERE product_id = 'dig';

UPDATE user_product_entitlements
SET product_id = 'spirion', updated_at = now()
WHERE product_id = 'dig';

UPDATE user_product_provisioning
SET product_id = 'spirion', updated_at = now()
WHERE product_id = 'dig';

UPDATE user_product_project_assignments
SET product_id = 'spirion', updated_at = now()
WHERE product_id = 'dig';
