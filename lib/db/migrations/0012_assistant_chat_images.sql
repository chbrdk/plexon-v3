-- Assistant chat image uploads (Vision attach). Spec: specs/domain/assistant-image-attachments.md
CREATE TABLE IF NOT EXISTS "assistant_chat_images" (
  "id" text PRIMARY KEY NOT NULL,
  "data_url" text NOT NULL,
  "mime_type" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL
);
