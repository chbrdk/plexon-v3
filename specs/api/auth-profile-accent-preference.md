# API — Auth / services profile (accentPreference)

**Status:** Accepted — 2026-08-29  
**Routes:** `GET/PATCH /api/auth/profile` · `GET/PATCH /api/services/profile`  
**Related:** `auth-profile-theme-preference.md`, `@msqdx/ui` `accentPreference.ts`

## accentPreference

User UI accent stored on `users.accent_preference`.

| Value | Preview |
|-------|---------|
| `purple` | `#b638ff` |
| `blue` | `#3b82f6` |
| `pink` | `#f256b6` |
| `orange` | `#ff6a3b` |
| `green` | `#00ca55` (default) |
| `yellow` | `#fef14d` |
| `grey` | `#d4d2d2` |
| `ink` | `#0f172a` |

Default when null: `green`.

### Response / body fields

Alongside `locale` and `themePreference`:

```json
{ "accentPreference": "green" }
```

PATCH accepts `accentPreference` (same enum). Invalid values → 400.

Legacy client storage may still hold CSS var names (e.g. `--color-secondary-dx-green`); clients MUST migrate via `migrateLegacyAccent` before PATCH.

### Services profile

`GET/PATCH /api/services/profile` MUST read/write the same column so product BFFs sync prefs cross-app.

## Acceptance

1. GET returns `accentPreference` (or default `green` when null).
2. PATCH persists and returns updated value.
3. Migration adds nullable `accent_preference` text column.
