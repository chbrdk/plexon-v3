# Assistant document attachments

**Status:** Accepted — 2026-09-10 (v2 DOCX/PDF) · Extended 2026-09-10 (PPTX / MD / TXT)  
**Surfaces:** Assistant expand + embed (same `AssistantChat` as image attachments)  
**API:** `POST /api/assistant/documents/upload` (`API_ASSISTANT_DOCUMENTS_UPLOAD`) · Complete body `documentIds`  
**Companion:** `specs/domain/assistant-image-attachments.md` (Vision)  
**Out of scope:** Legacy `.doc`, binary/opaque assets (zip/video/…), Knowledge/RAG ingest, A/B, Blob/S3

## Purpose

Users attach text-bearing briefs so the orchestrator can ground free-chat answers in extracted document text. Text is merged into the **user** turn sent to Anthropic (not the system prompt).

## Supported formats

| Ext | Extract |
|-----|---------|
| `.docx` | mammoth plain text |
| `.pdf` | pdf-parse `getText()`; if thin/empty → screenshot first N pages + tesseract.js OCR (`eng+deu`) |
| `.pptx` | JSZip + slide XML `<a:t>` runs (AUDION knowledge pattern) |
| `.md` / `.markdown` | UTF-8 with light markdown strip |
| `.txt` | UTF-8 plain |

## Client

1. Pick supported files (multi, max **4** pending docs; images remain separate, max 4) via Paperclip, **drag-and-drop**, or paste of file items. Accept: `ASSISTANT_DOCUMENT_UPLOAD_ACCEPT`.
2. Composer shows a short hint: images → vision, documents → text (OCR for scans).
3. `POST /api/assistant/documents/upload` multipart field `file` → `{ documentId, filename, charCount, truncated, usedOcr? }` (session user owns the row).
4. Pending chips (filename + OCR badge when `usedOcr`) + remove.
5. Send: `documentIds` alongside optional `imageIds` / `prompt`. Empty prompt OK when ≥1 document **or** ≥1 image.

## Server

- Max file **15 MB** (`ASSISTANT_DOCUMENT_UPLOAD_MAX_BYTES`).
- Max extracted chars **200 000** (`ASSISTANT_DOCUMENT_UPLOAD_MAX_CHARS`); truncate with `\n\n[… truncated]`.
- Durable store: Postgres `assistant_chat_documents` (`user_id` + payload columns) when `DATABASE_URL` set; else memory map.
- **Ownership:** put/resolve require the session `userId`. Cross-user resolve → not found.
- **Quotas (per user):** max **40** active docs (`ASSISTANT_DOCUMENT_MAX_ACTIVE_PER_USER`); max **40** uploads / rolling hour (`ASSISTANT_DOCUMENT_UPLOAD_MAX_PER_HOUR`) → **429**.
- Orphan TTL **3600 s** (`ASSISTANT_DOCUMENT_UPLOAD_TTL_SECONDS`).
- Reject unsupported types → 415; empty extract → 422; empty file → 400.
- Filenames sanitized (basename only, no path traversal / control chars).
- PPTX: max **80** slides; per-slide XML soft-capped (~2 MB) against zip bombs.
- **PDF OCR:** when embedded text < **40** chars (`ASSISTANT_PDF_OCR_MIN_TEXT_CHARS`), render up to **5** pages (`ASSISTANT_PDF_OCR_MAX_PAGES`) via `getScreenshot` + `@napi-rs/canvas`, then tesseract.js (`ASSISTANT_PDF_OCR_LANGS`). OCR failures fall back to embedded text (may still 422 if empty).
- Auth: session required.
- Complete: attachments force `free_chat` so Vision/doc text are not dropped by deterministic intents.

## Merge (model-facing user prompt)

```
### Attached document: {filename}

{extracted text}
---
{user content}
```

Multiple docs: blocks joined with `\n\n---\n\n`. Merge runs **before** Vision image parts on the current turn. Intent routing uses the **raw** user `prompt` (without doc prefix).

## Persist

User `assistant_messages`:

- `content`: trimmed prompt, or `'(document attachment)'` / `'(image attachment)'` when empty
- `metadata.documents`: `{ id, filename, charCount }[]` (chips; no full text in transcript)
- `metadata.images`: unchanged from image attachments

## Done when

1. Composer accepts DOCX/PDF/PPTX/MD/TXT alongside images (picker, paste, drag-and-drop); pending chips + remove.
2. Upload + Complete accept `documentIds`; empty prompt + docs succeeds; resolve is user-scoped.
3. Merged text reaches Anthropic on the current turn; history stays short (no re-extract).
4. Unit/smoke tests cover extract (incl. PPTX/MD), merge, ownership fail-closed, composer paste/DnD affordance.
