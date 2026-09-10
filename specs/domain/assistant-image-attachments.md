# Assistant image attachments (v1)

**Status:** Accepted — 2026-09-10  
**Surfaces:** Assistant expand (`/assistant`) + embed flyout (`/assistant/embed`) — same `AssistantChat`  
**API:** `POST /api/assistant/images/upload` (`API_ASSISTANT_IMAGES_UPLOAD`) · Complete body `imageIds`  
**Companion vision (tools only):** `lib/assistant/tool-result-multimodal.ts` (Creation scene preview)  
**Out of scope v1:** A/B compare, DOCX/PDF, Blob/S3, unauthenticated guests

## Purpose

Users attach screenshots or design stills to a free-chat turn so the Anthropic orchestrator can reason with vision on the **current** user turn.

## Client

1. Pick `image/*` (multi, max **4** pending) via Paperclip, **drag-and-drop** onto the composer, or **clipboard paste** (screenshot / image files).
2. Compress (canvas max edge **1024px**, JPEG quality **0.7**) → data URL.
3. `POST /api/assistant/images/upload` `{ image: dataUrl }` → `{ imageId }` (session user owns the row).
4. Pending thumbs + remove in the composer.
5. Send: `imageIds` on Complete; `prompt` may be empty when ≥1 image.

## Server store (durable)

- Primary: Postgres `assistant_chat_images` (`id`, `user_id`, `data_url`, `mime_type`, `created_at`, `expires_at`) when `DATABASE_URL` is set.
- Fallback: in-memory map (local/tests), keyed entries include `userId`.
- **Ownership:** put/resolve require the session `userId`. Resolve of another user's id → not found (fail-closed).
- **Quotas (per user):** max **40** active (non-expired) images (`ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER`); max **60** uploads / rolling hour (`ASSISTANT_IMAGE_UPLOAD_MAX_PER_HOUR`) → **429**.
- Orphan TTL **3600 s** (`ASSISTANT_IMAGE_UPLOAD_TTL_SECONDS`).
- Max decoded payload **10 MB** (`ASSISTANT_IMAGE_UPLOAD_MAX_BYTES`).
- Data URL must start with `data:image/` and be `;base64` with valid payload.
- MIME allowlist: JPEG / PNG / WebP / GIF (`ASSISTANT_IMAGE_ALLOWED_MIME_TYPES`) — **SVG rejected** (XSS if rendered).
- **EXIF/metadata strip:** client canvas re-encode drops metadata; server `stripAssistantImageDataUrlMetadata` removes JPEG APP1–15/COM and PNG text/eXIf chunks before persist.
- Auth: session required (same as Complete).
- Complete: unparseable resolved images → 400; attachments force `free_chat`.
- UI: restore pending attachments + draft prompt on send failure.

## Persist

User `assistant_messages` row:

- `content`: trimmed prompt, or `'(image attachment)'` when prompt empty
- `metadata.images`: `{ id, dataUrl }[]` (compressed thumbs for UI)

Resolve for the LLM uses the durable store by `imageId` (fail-closed if missing/expired).

## Orchestrator (Anthropic)

- Current user turn: multimodal content parts — `text` + `image` (`source.type = base64`).
- Empty prompt with images → text fallback: `Please review the attached image(s).`
- Prior history turns: **text-only** (token budget); UI may still show thumbs from `metadata.images`.
- Missing/expired IDs → Complete error (400).

## Limits (canonical constants)

| Knob | Value | Constant |
|------|-------|----------|
| Max edge (compress) | 1024 px | `ASSISTANT_IMAGE_COMPRESS_MAX_EDGE_PX` |
| JPEG quality | 0.7 | `ASSISTANT_IMAGE_COMPRESS_QUALITY` |
| Max decoded bytes | 10 MB | `ASSISTANT_IMAGE_UPLOAD_MAX_BYTES` |
| Orphan TTL | 3600 s | `ASSISTANT_IMAGE_UPLOAD_TTL_SECONDS` |
| Max images / turn | 4 | `ASSISTANT_IMAGE_MAX_PER_TURN` |
| Max active / user | 40 | `ASSISTANT_IMAGE_MAX_ACTIVE_PER_USER` |
| Max uploads / hour / user | 60 | `ASSISTANT_IMAGE_UPLOAD_MAX_PER_HOUR` |

## Done when

1. Composer exposes attach + pending thumbs on expand and overlay (picker, paste, drag-and-drop).
2. Upload + Complete accept `imageIds`; empty prompt + images succeeds; resolve is user-scoped.
3. Anthropic current turn includes image blocks; history stays text-only.
4. Unit/smoke tests cover store ownership, resolve fail-closed, `buildUserTurnContent`, composer paste/DnD affordance.
