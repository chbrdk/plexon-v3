-- Cross-app appearance preference (light | dark | auto)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "theme_preference" text;
