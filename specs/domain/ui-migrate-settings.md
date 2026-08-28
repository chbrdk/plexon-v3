# UI rebuild — Settings

**Status:** Accepted — Wave 2 done — 2026-07-31 · **Reshape 2026-08-28** (SettingsShell + cross-app prefs)  
**Route:** `/settings`  
**Reference:** `@msqdx/ui` `SettingsShell` · product settings · `specs/api/auth-profile-theme-preference.md`  
**DS:** `SettingsShell`, `SettingsBand`, `SectionChrome`, `Field`, `Input`, `ToggleGroup`, `Text`, `Button`, `Avatar`

## Challenge — keep / reshape / drop

| Capability | Decision | Notes |
|------------|----------|-------|
| Profile name / avatar | **keep** | Compact Profile band |
| Locale | **reshape** | ToggleGroup en/de; PATCH profile immediately |
| Theme | **reshape** | Only light / dark / auto → `themePreference` on profile |
| Brand / accent color | **keep** | Extras slot |
| Password / security | **keep** | Extras slot, denser magazine band |
| API tokens | **keep** | Extras slot |
| Four theme IDs / V2 | **drop** | Migrate stored ids via `migrateLegacyThemeId` |

## Composition

Mount `SettingsShell` with band order: Account → Profile → Appearance → Language → extras (password, tokens, brand, about).

## Acceptance

1. Settings uses `SettingsShell` from `@msqdx/ui`.
2. Appearance offers only light / dark / auto; applies via `applyThemePreference`.
3. Locale + themePreference persist via `PATCH /api/auth/profile` on change.
4. Smoke: settings headings + preference toggles.
