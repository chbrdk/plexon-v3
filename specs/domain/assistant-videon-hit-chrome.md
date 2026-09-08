# Assistant VIDEON hit chrome

**Status:** Accepted — 2026-09-08  
**Depends:** `assistant-videon-mcp.md` · `videon-v3/specs/api/media-frame.md` · `videon-v3/specs/domain/scene-hit-model.md`  
**Implements:** `UiVideoHitStrip` · `/api/assistant/videon-frame` · `/api/assistant/videon-preview`

## Purpose

Visual chrome for assistant scene hits beyond a single poster: sibling filmstrip frames and a bounded muted hover preview — without putting video bytes into MCP payloads.

## Filmstrip

1. WHEN multiple hits share a `mediaAssetId` (or MCP supplies sibling scene keys) THEN the card MAY show a horizontal filmstrip of poster URLs (same frame proxy, distinct `t`).  
2. WHEN a strip frame activates THEN it MUST seek the primary deep link to that scene/`t`.  
3. Strip length MUST be capped (≤ 8 frames per card).

## Muted preview

1. WHEN the operator hovers/focuses a hit card THEN the UI MAY play a muted ≤ 3s preview around `startMs` via same-origin `GET /api/assistant/videon-preview`.  
2. Plexon MUST proxy to VIDEON `GET /api/media/:id/preview` with service secret + session actor (Model B).  
3. Preview MUST NOT be an unbounded stream; duration and bitrate MUST be bounded in the Product API spec.  
4. MCP payloads MUST NOT include preview bytes or signed URLs.

## Non-goals

- Full NLE playback in chat  
- Autoplay with sound  
- Embedding ffmpeg output into SSE/MCP JSON
