-- Collection Knowledge Pack (dedicated SoT; not platform_projects.metadata)
-- Spec: specs/domain/collection-knowledge-pack.md
CREATE TABLE IF NOT EXISTS "collection_knowledge_packs" (
  "id" text PRIMARY KEY NOT NULL,
  "platform_project_id" text NOT NULL REFERENCES "platform_projects"("id") ON DELETE CASCADE,
  "revision" integer DEFAULT 1 NOT NULL,
  "schema_version" text NOT NULL,
  "facets" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "collection_knowledge_packs_platform_project_id_uidx"
  ON "collection_knowledge_packs" ("platform_project_id");
