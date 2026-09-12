-- Wave A/B data plane: outbox, pack events, collection projections
-- Specs: platform-outbox-delivery.md · collection-read-model.md
CREATE TABLE IF NOT EXISTS "platform_outbox" (
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 8 NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "platform_outbox_status_next_attempt_idx"
  ON "platform_outbox" ("status", "next_attempt_at");

CREATE TABLE IF NOT EXISTS "collection_knowledge_pack_events" (
  "id" text PRIMARY KEY NOT NULL,
  "pack_id" text NOT NULL REFERENCES "collection_knowledge_packs"("id") ON DELETE CASCADE,
  "facet_id" text NOT NULL,
  "revision" integer NOT NULL,
  "actor_type" text NOT NULL,
  "actor_user_id" text,
  "product_id" text,
  "run_id" text,
  "source_uri" text,
  "patch_summary" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "collection_knowledge_pack_events_pack_id_idx"
  ON "collection_knowledge_pack_events" ("pack_id");

CREATE TABLE IF NOT EXISTS "collection_projections" (
  "platform_project_id" text PRIMARY KEY NOT NULL REFERENCES "platform_projects"("id") ON DELETE CASCADE,
  "revision" integer DEFAULT 1 NOT NULL,
  "snapshot" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
