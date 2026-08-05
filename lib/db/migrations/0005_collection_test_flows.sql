-- Collection Test Flow (Wave 1 quality path)
-- Spec: specs/domain/collection-test-flow.md
CREATE TABLE IF NOT EXISTS "collection_test_flows" (
  "id" text PRIMARY KEY NOT NULL,
  "platform_project_id" text NOT NULL REFERENCES "platform_projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "flow" jsonb NOT NULL,
  "owner_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "template_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "collection_test_flows_platform_project_id_idx"
  ON "collection_test_flows" ("platform_project_id");
