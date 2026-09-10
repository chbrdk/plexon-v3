-- User-scoped assistant attachment ownership
ALTER TABLE "assistant_chat_images" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "assistant_chat_documents" ADD COLUMN IF NOT EXISTS "user_id" text;
CREATE INDEX IF NOT EXISTS "assistant_chat_images_user_id_idx" ON "assistant_chat_images" ("user_id");
CREATE INDEX IF NOT EXISTS "assistant_chat_documents_user_id_idx" ON "assistant_chat_documents" ("user_id");
