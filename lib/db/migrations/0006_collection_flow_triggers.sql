-- Wave 15: flow webhook secrets + collection_flow_runs
-- Spec: specs/domain/collection-test-flow.md

ALTER TABLE "collection_test_flows"
  ADD COLUMN IF NOT EXISTS "webhook_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "collection_test_flows"
  ADD COLUMN IF NOT EXISTS "webhook_secret_hash" text;
ALTER TABLE "collection_test_flows"
  ADD COLUMN IF NOT EXISTS "webhook_secret_hint" text;

CREATE TABLE IF NOT EXISTS "collection_flow_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "flow_id" text NOT NULL REFERENCES "collection_test_flows"("id") ON DELETE CASCADE,
  "platform_project_id" text NOT NULL REFERENCES "platform_projects"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'queued' NOT NULL,
  "trigger" text NOT NULL,
  "request" jsonb,
  "verdict" jsonb,
  "last_run" jsonb,
  "callback_url" text,
  "callback_status" text,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "collection_flow_runs_flow_id_created_at_idx"
  ON "collection_flow_runs" ("flow_id", "created_at");
