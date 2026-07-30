# Board – React Flow Integration

## Übersicht

Das PLEXON-Board nutzt seit der Umstellung **React Flow** ([@xyflow/react](https://reactflow.dev/), v12) statt maxGraph/mxGraph. Die Diagramm-Logik liegt vollständig in PLEXON.

## Komponenten

- **`components/board/ReactFlowBoard.tsx`**: React-Flow-Canvas
  - **Nodes** = Prismions (Cards): `promptCard` (Rechteck) und `toolCard` (Kreis/Badge)
  - **Edges** = Connections mit SmoothStep, optionalen Pfeilen
  - Handles an allen vier Seiten (top, right, bottom, left) für Verbindungen
  - Callbacks: `onPrismionMove`, `onPrismionResize`, `onPrismionDelete`, `onConnectorDelete`, `onConnectionCreate`, `onDoubleClickCanvas`, `onDoubleClickCell`, `onSelectPrismion`

## Verwendung

- **`app/board/page.tsx`**: State (prismions, connections, …) und Handler; rendert `ReactFlowBoard` mit denselben Props wie zuvor `MaxGraphBoard`.
- **Design-System**: Kein Graph-Paket mehr. `@msqdx/react` exportiert nur noch Prismion/Connection-Typen und Board-Utils (`wouldOverlap`).

## Entfernt

- **@msqdx/graph** (maxGraph): Paket und Workspace-Eintrag im MSQDX-DS entfernt
- **@maxgraph/core**: Aus PLEXON-`package.json` entfernt
- Dockerfile: Kein Kopieren von `packages/graph` mehr

## Build

- **Lokal**: `DS_BASE=../MSQDX-DS/msqdx-design-system npm run build` (oder passender Pfad zum Design-System)
- **Docker**: Dockerfile referenziert nur noch `react` und `tokens` aus dem Design-System
