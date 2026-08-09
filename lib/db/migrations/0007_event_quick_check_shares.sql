-- Public read-only Quick Check share links (report snapshot + token hash)
CREATE TABLE IF NOT EXISTS "event_quick_check_shares" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL REFERENCES "assistant_workflow_runs"("id") ON DELETE CASCADE,
  "created_by_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "share_token_hash" text NOT NULL,
  "report_snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "event_quick_check_shares_run_id_idx" ON "event_quick_check_shares" ("run_id");
CREATE UNIQUE INDEX IF NOT EXISTS "event_quick_check_shares_token_hash_uidx" ON "event_quick_check_shares" ("share_token_hash");
