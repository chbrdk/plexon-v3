-- Report cart pins + public shared reports (conversation-scoped)
CREATE TABLE IF NOT EXISTS "assistant_report_pins" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL REFERENCES "assistant_conversations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "message_id" text NOT NULL,
  "block_id" text NOT NULL,
  "block_snapshot" jsonb NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "assistant_report_pins_conversation_id_idx" ON "assistant_report_pins" ("conversation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "assistant_report_pins_conv_msg_block_uidx" ON "assistant_report_pins" ("conversation_id", "message_id", "block_id");

CREATE TABLE IF NOT EXISTS "assistant_shared_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL REFERENCES "assistant_conversations"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "ui_layout" jsonb NOT NULL,
  "narrative" jsonb NOT NULL,
  "share_token_hash" text NOT NULL,
  "is_public" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "assistant_shared_reports_conversation_id_idx" ON "assistant_shared_reports" ("conversation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "assistant_shared_reports_token_hash_uidx" ON "assistant_shared_reports" ("share_token_hash");
