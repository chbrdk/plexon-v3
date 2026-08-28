# API — Auth / services profile (themePreference)

**Status:** Accepted — 2026-08-28  
**Routes:** `GET/PATCH /api/auth/profile` · `GET/PATCH /api/services/profile`

## themePreference

User appearance preference stored on `users.theme_preference`.

| Value | Meaning |
|-------|---------|
| `light` | Resolve to `data-theme="msqdx"` |
| `dark` | Resolve to `data-theme="msqdx-dark"` |
| `auto` | Follow `prefers-color-scheme` |

Default when null: `dark`.

### Response / body fields

Alongside existing `locale`, profile JSON includes:

```json
{ "themePreference": "light" | "dark" | "auto" }
```

PATCH accepts `themePreference` (same enum). Invalid values → 400.

### Services profile

`GET/PATCH /api/services/profile` (service secret) MUST read/write the same column so product BFFs can sync prefs cross-app.

## Acceptance

1. GET returns `themePreference` when set (or default `dark` when null).
2. PATCH persists and returns updated value.
3. Migration adds nullable `theme_preference` text column.
