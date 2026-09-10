-- Assistant chat document uploads (DOCX/PDF). Spec: specs/domain/assistant-document-attachments.md
CREATE TABLE IF NOT EXISTS "assistant_chat_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "filename" text NOT NULL,
  "extracted_text" text NOT NULL,
  "char_count" integer NOT NULL,
  "truncated" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL
);
