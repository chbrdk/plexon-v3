# PLEXON App Header v2

Stand: Juni 2026

Gleiches Chrome wie **AUDION Personas/Target Groups v2**:

- Logo-Ecke **absolut** oben links (`AppShell` → `MsqdxAppLayout` sx, wie `msqdx-glass-admin-layout.tsx`)
- Header-Bar **absolut** `top: 0`, `z-index: 1300`
- Zeile mit `margin-left: 230px` (`APP_HEADER_LOGO_INSET_PX`)
- Abgerundete Card `msqdx-glass-admin-header-card`, Seitentitel rechts
- Main-Content mit `APP_HEADER_V2_CONTENT_PADDING_TOP` unter der Bar

## Dateien

| Bereich | Pfad |
|--------|------|
| Konstanten | `lib/layout/app-header-v2-layout.ts` |
| CSS (1:1 aus AUDION) | `styles/app-header-v2.css` |
| Header | `components/layout/PlexonAppHeaderV2.tsx` |
| Page shell | `components/layout/PlexonPageChrome.tsx` |
| Shell-Logo | `components/AppShell.tsx` |

## Nutzung

```tsx
<PlexonPageChrome header={<PlexonAppHeaderV2 title="assistent" />}>
  {pageContent}
</PlexonPageChrome>
```

Aktuell: `/assistant`.
