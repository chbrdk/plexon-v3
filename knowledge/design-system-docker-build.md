# Design System im PLEXON-Docker-Build

PLEXON baut das Design System (@msqdx/react) im Docker-Build per **git clone** ein. Die Prismion-/Board-Komponenten (MsqdxPrismionPorts, MsqdxBoardHeader, …) sind nur verfügbar, wenn sie im geklonten **Branch** enthalten und im Build ausgegeben werden.

## Branch wählen

Es wird der Branch geklont, den du per Build-Arg angibst:

- **Standard:** `DESIGN_SYSTEM_BRANCH=main` (Dockerfile-Default).
- **Anderer Branch (z. B. mit Prismion):** Beim Bauen setzen:
  ```bash
  docker build --build-arg DESIGN_SYSTEM_BRANCH=develop -t plexon .
  ```
  In Coolify: unter „Build“ einen **Build Argument** anlegen: Name `DESIGN_SYSTEM_BRANCH`, Wert z. B. `main` oder `develop` (je nachdem, wo Prismion liegt).

Wenn Prismion nur im **Original-Repo** (lokal) existiert, musst du die Änderungen auf den Branch pushen, der geklont wird (z. B. `main` oder `develop`), damit der Docker-Build sie enthält.

## Ablauf im Dockerfile

1. **deps-Stage:** `git clone -b "${DESIGN_SYSTEM_BRANCH}"` von `DESIGN_SYSTEM_REPO` nach `/msqdx-design-system`, danach `npm install && npm run build` im Design-System-Repo.
2. **builder-Stage:** Design System wird nach `/msqdx-design-system` kopiert; ein Symlink `/app/msqdx-design-system` → `/msqdx-design-system` stellt sicher, dass `file:../msqdx-design-system` aus `/app` aufgelöst wird. Danach `npm run build`.

Wenn die **deps-Stage gecacht** ist (z. B. `#10 CACHED`), wird weder neu geklont noch neu gebaut. Enthielt der geklonte Stand beim letzten Build **keine** Prismion-Komponenten (oder ist der Build fehlgeschlagen), fehlen sie in `dist/` und damit in den Exporten von `@msqdx/react`.

## Wenn „MsqdxPrismionPorts is not exported“ auftritt

1. **Sicherstellen, dass Prismion im Design-System-Repo ist:** Im Repo `msqdx-design-system` müssen `packages/react/src/components/prismion/` und der Export in `packages/react/src/components/index.ts` (bzw. `src/index.ts`) vorhanden sein und auf den Branch gepusht sein, der geklont wird (z. B. `main`).

2. **Docker-Cache für deps invalidieren:** Beim nächsten PLEXON-Build die Cache-Layer für die Design-System-Schritte neu ausführen:
   - `docker build --no-cache -t plexon .`
   - oder in Coolify einen **Redeploy ohne Cache** auslösen.

3. **Lokal prüfen:** Im Repo `msqdx-design-system` unter `packages/react`: `npm run build`. Anschließend prüfen, ob `dist/components/prismion/index.js` existiert und die Komponenten exportiert werden.

## Export im Design-System-Paket

In `packages/react/src/index.ts` werden die Prismion-Komponenten sowohl über `export * from './components'` als auch explizit über `export * from './components/prismion'` bereitgestellt, damit Bundler (Next.js/webpack) sie zuverlässig vom Paketeinstieg auflösen.

## Docker-Warnung „SecretsUsedInArgOrEnv“

Coolify (oder andere Plattformen) können Build-ARGs für Umgebungsvariablen wie `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `CHECKION_ADMIN_API_KEY`, `PLEXON_SERVICE_SECRET` setzen. Docker warnt: **Sensible Daten nicht per ARG/ENV ins Image legen** – sie landen in Layer-History. Besser: diese Werte nur zur **Laufzeit** setzen (z. B. als Environment in Coolify), nicht als Build-Argumente. Die Dockerfiles im Repo verwenden keine ARGs für Secrets; falls deine Plattform welche injiziert, nach Möglichkeit auf Runtime-Env umstellen.
