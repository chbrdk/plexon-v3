-- Flow report cart pins (Wave 26)
-- history_run_id uses '' (not NULL) so the unique index works in PostgreSQL.
CREATE TABLE IF NOT EXISTS "collection_flow_report_pins" (
  "id" text PRIMARY KEY NOT NULL,
  "platform_project_id" text NOT NULL REFERENCES "platform_projects"("id") ON DELETE CASCADE,
  "flow_id" text NOT NULL REFERENCES "collection_test_flows"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "history_run_id" text DEFAULT '' NOT NULL,
  "node_id" text NOT NULL,
  "output_snapshot" jsonb NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "collection_flow_report_pins_flow_user_idx"
  ON "collection_flow_report_pins" ("flow_id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "collection_flow_report_pins_unique_uidx"
  ON "collection_flow_report_pins" ("flow_id", "user_id", "node_id", "history_run_id");
