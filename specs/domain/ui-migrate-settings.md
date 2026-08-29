# UI rebuild — Settings

**Status:** Accepted — Wave 2 done — 2026-07-31 · **Reshape 2026-08-28** · **Polish 2026-08-29** (2-col + accent)  
**Route:** `/settings`  
**Reference:** `@msqdx/ui` `SettingsShell` · `AccentSwatchGroup` · product settings  
**DS:** `SettingsShell`, `SettingsBand`, `AccentSwatchGroup`, `SectionChrome`, `Field`, `Input`, `ToggleGroup`, `Text`, `Button`, `Avatar`

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Profile name / avatar URL | **reshape** | Dense Profile: Avatar + URL under mark; fields right; no upload |
| Locale | **keep** | ToggleGroup en/de; PATCH immediately |
| Theme | **keep** | light / dark / auto → `themePreference` |
| Brand / accent color | **reshape** | Move into Appearance; `accentPreference` on profile (not extras / not local-only) |
| Password / security | **keep** | Extras, denser |
| API tokens | **keep** | Extras |
| Long lede / band help | **drop** | No magazine novels; optional one-line meta only |
| Four theme IDs / V2 | **drop** | `migrateLegacyThemeId` |

## Composition

Mount `SettingsShell` (2-col bands): Account → Profile → Appearance (theme + accent) → Language → extras (password, tokens, about).

## Acceptance

1. Settings uses 2-col `SettingsShell`; no Brand extras band.
2. Appearance offers theme + `AccentSwatchGroup`; accent PATCHes profile.
3. Locale + themePreference + accentPreference persist via profile APIs.
4. Avatar initials use accent; URL field remains (no upload).
