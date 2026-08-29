-- Accent preference (UI color) on users — light/dark/auto theme is separate.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accent_preference" text;
