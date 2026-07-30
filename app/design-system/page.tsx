'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import {
  MsqdxTypography,
  MsqdxCard,
  MsqdxButton,
  MsqdxPrismionPorts,
  MsqdxPrismionResult,
  MsqdxPrismionToolbar,
  MsqdxConnectorEdge,
  MsqdxPresenceList,
  MsqdxPresenceLayer,
  MsqdxUserToolbar,
  MsqdxPrismionCard,
  MsqdxBoardHeader,
  MsqdxBoardOnboarding,
  MsqdxBoardToolbar,
  MsqdxBoardCanvas,
  MsqdxBoardCanvasFunctional,
  MsqdxBoardGrid,
  MsqdxCommandPalette,
  MsqdxConnectorMenu,
  MsqdxContextMenu,
  MsqdxInspectorPanel,
  MsqdxMergeDrawer,
  MsqdxSimpleBoardCanvas,
  type Prismion,
  type Board,
  type BoardParticipant,
  type Connector,
  type Connection,
  type Presence,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';

// ─── Demo data ─────────────────────────────────────────────────────────────

const now = new Date().toISOString();

const createPort = (side: 'top' | 'right' | 'bottom' | 'left') => ({
  id: `port-${side}`,
  side,
  capacity: 'single' as const,
});

const demoPrismion: Prismion = {
  id: 'prismion-demo',
  boardId: 'board-demo',
  title: 'Demo Prismion',
  prompt: 'Describe your idea here…',
  colorToken: 'green',
  tags: [],
  position: { x: 100, y: 100, zIndex: 0 },
  size: { w: 280, h: 200, minW: 200, minH: 120 },
  ports: {
    top: createPort('top'),
    right: createPort('right'),
    bottom: createPort('bottom'),
    left: createPort('left'),
  },
  state: 'active',
  createdBy: 'user-1',
  createdAt: now,
  updatedAt: now,
  revision: 1,
};

const demoBoard: Board = {
  id: 'board-demo',
  shareId: 'share-demo',
  title: 'Demo Board',
  description: 'Design System Showcase',
  isPublic: false,
  createdAt: now,
  updatedAt: now,
  canvasSettings: {
    backgroundColor: '#f5f5f5',
    patternColor: '#e0e0e0',
    patternSize: 20,
    background: 'dots',
  },
};

const demoParticipants: BoardParticipant[] = [
  {
    id: 'p1',
    boardId: demoBoard.id,
    userId: 'user-1',
    userName: 'Alex',
    userColor: '#4ade80',
    isActive: true,
    lastActiveAt: now,
    role: 'OWNER',
    joinedAt: now,
  },
  {
    id: 'p2',
    boardId: demoBoard.id,
    userId: 'user-2',
    userName: 'Sam',
    userColor: '#60a5fa',
    isActive: false,
    lastActiveAt: now,
    role: 'EDITOR',
    joinedAt: now,
  },
];

const demoPresences: Presence[] = [
  {
    userId: 'user-1',
    boardId: demoBoard.id,
    cursor: { x: 200, y: 150 },
    selectedPrismionIds: [],
    colorToken: '#4ade80',
    lastActiveAt: now,
  },
  {
    userId: 'user-2',
    boardId: demoBoard.id,
    cursor: { x: 400, y: 100 },
    selectedPrismionIds: ['prismion-demo'],
    colorToken: '#60a5fa',
    lastActiveAt: now,
  },
];

const demoConnector: Connector = {
  id: 'conn-demo',
  boardId: demoBoard.id,
  from: { prismionId: 'p-a', port: 'right' },
  to: { prismionId: 'p-b', port: 'left' },
  createdBy: 'user-1',
  createdAt: now,
};

const demoPrismionA: Prismion = {
  ...demoPrismion,
  id: 'p-a',
  title: 'A',
  position: { x: 50, y: 80, zIndex: 0 },
};
const demoPrismionB: Prismion = {
  ...demoPrismion,
  id: 'p-b',
  title: 'B',
  position: { x: 380, y: 80, zIndex: 0 },
};
const prismionsForEdge: Record<string, Prismion> = {
  'p-a': demoPrismionA,
  'p-b': demoPrismionB,
};

const demoConnection: Connection = {
  id: 'conn-1',
  boardId: demoBoard.id,
  fromPrismionId: 'p-a',
  toPrismionId: 'p-b',
  fromPort: 'right',
  toPort: 'left',
  strokeWidth: 2,
  createdAt: now,
  updatedAt: now,
};

// ─── Component section wrapper ─────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <MsqdxCard
      variant="flat"
      borderRadius="button"
      sx={{
        p: 2,
        mb: 2,
        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
        bgcolor: 'var(--color-card-bg)',
        color: 'var(--color-text-on-light)',
      }}
    >
      <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 1.5, fontFamily: 'monospace' }}>
        {title}
      </MsqdxTypography>
      <Box sx={{ position: 'relative' }}>{children}</Box>
    </MsqdxCard>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const { t } = useI18n();
  const [commandOpen, setCommandOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextPos] = useState({ x: 200, y: 200 });
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  return (
    <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1000, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <MsqdxTypography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('designSystem.title') ?? 'Design System – Neue Komponenten'}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mt: 1 }}>
          {t('designSystem.subtitle') ?? 'Alle Board- und Prismion-Komponenten aus @msqdx/react live dargestellt.'}
        </MsqdxTypography>
      </Box>

      <Section title="MsqdxPrismionPorts">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <MsqdxPrismionPorts />
        </Box>
      </Section>

      <Section title="MsqdxPrismionResult">
        <MsqdxPrismionResult
          items={[
            { type: 'text', content: 'Ergebnis-Text 1' },
            { type: 'richtext', content: '<p>Rich <strong>Text</strong></p>' },
            { type: 'link', url: 'https://example.com', label: 'Beispiel-Link' },
          ]}
        />
      </Section>

      <Section title="MsqdxPrismionToolbar">
        <Box sx={{ display: 'inline-block' }}>
          <MsqdxPrismionToolbar
            onBranch={() => {}}
            onMerge={() => {}}
            onLockToggle={() => {}}
            onArchive={() => {}}
            onDelete={() => {}}
            locked={false}
            variant="bar"
          />
        </Box>
      </Section>

      <Section title="MsqdxConnectorEdge">
        <Box sx={{ position: 'relative', height: 120, bgcolor: 'var(--color-bg-subtle)', borderRadius: 1 }}>
          <MsqdxConnectorEdge
            connector={demoConnector}
            prismions={prismionsForEdge}
          />
        </Box>
      </Section>

      <Section title="MsqdxPresenceList">
        <MsqdxPresenceList presences={demoPresences} maxVisible={5} />
      </Section>

      <Section title="MsqdxPresenceLayer">
        <Box sx={{ position: 'relative', height: 56, bgcolor: 'var(--color-bg-subtle)', borderRadius: 1 }}>
          <MsqdxPresenceLayer presences={demoPresences} maxVisible={5} />
        </Box>
      </Section>

      <Section title="MsqdxUserToolbar">
        <MsqdxUserToolbar
          displayName="Demo User"
          avatarUrl=""
          onChangeName={() => {}}
          onChangeAvatar={() => {}}
        />
      </Section>

      <Section title="MsqdxPrismionCard">
        <Box sx={{ maxWidth: 320 }}>
          <MsqdxPrismionCard
            prismion={demoPrismion}
            selected={false}
            results={[
              { type: 'text', content: 'Kurzer Ergebnis-Text' },
            ]}
          />
        </Box>
      </Section>

      <Section title="MsqdxBoardHeader">
        <MsqdxBoardHeader
          board={demoBoard}
          participants={demoParticipants}
          boardShareUrl="https://example.com/board/share-demo"
        />
      </Section>

      <Section title="MsqdxBoardOnboarding">
        <MsqdxBoardOnboarding boardId={demoBoard.id} onComplete={() => {}} />
      </Section>

      <Section title="MsqdxBoardToolbar">
        <MsqdxBoardToolbar
          zoom={zoom}
          onZoomChange={setZoom}
          pan={pan}
          onPanChange={setPan}
        />
      </Section>

      <Section title="MsqdxBoardGrid">
        <Box sx={{ position: 'relative', height: 120, overflow: 'hidden', borderRadius: 1 }}>
          <MsqdxBoardGrid visible snapToGrid={false} zoom={1} />
        </Box>
      </Section>

      <Section title="MsqdxCommandPalette">
        <MsqdxButton variant="outlined" onClick={() => setCommandOpen(true)}>
          Command Palette öffnen
        </MsqdxButton>
        <MsqdxCommandPalette
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          title="Command Palette"
        >
          <MsqdxTypography variant="body2">Inhalt (z. B. Befehle oder Suche)</MsqdxTypography>
        </MsqdxCommandPalette>
      </Section>

      <Section title="MsqdxConnectorMenu">
        <Box sx={{ position: 'relative', height: 80 }}>
          <MsqdxConnectorMenu
            isOpen
            position={{ x: 120, y: 24 }}
            port="right"
            onClose={() => {}}
            onCreatePrismion={() => {}}
            onAttachToExisting={() => {}}
          />
        </Box>
      </Section>

      <Section title="MsqdxContextMenu">
        <MsqdxButton variant="outlined" onClick={() => setContextOpen(true)}>
          Kontextmenü öffnen
        </MsqdxButton>
        <MsqdxContextMenu
          open={contextOpen}
          x={contextPos.x}
          y={contextPos.y}
          onClose={() => setContextOpen(false)}
          title="Aktionen"
        >
          <Box sx={{ p: 1 }}>
            <MsqdxTypography variant="body2">Option 1</MsqdxTypography>
            <MsqdxTypography variant="body2">Option 2</MsqdxTypography>
          </Box>
        </MsqdxContextMenu>
      </Section>

      <Section title="MsqdxInspectorPanel">
        <MsqdxButton variant="outlined" onClick={() => setInspectorOpen(true)}>
          Inspector Panel öffnen
        </MsqdxButton>
        <MsqdxInspectorPanel
          open={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
          title="Inspector"
          width={280}
        >
          <MsqdxTypography variant="body2">Eigenschaften des ausgewählten Elements.</MsqdxTypography>
        </MsqdxInspectorPanel>
      </Section>

      <Section title="MsqdxMergeDrawer">
        <MsqdxButton variant="outlined" onClick={() => setMergeOpen(true)}>
          Merge Drawer öffnen
        </MsqdxButton>
        <MsqdxMergeDrawer
          open={mergeOpen}
          onClose={() => setMergeOpen(false)}
          title="Merge"
          height={240}
        >
          <MsqdxTypography variant="body2">Merge-Vorschläge oder Diff-Inhalte.</MsqdxTypography>
        </MsqdxMergeDrawer>
      </Section>

      <Section title="MsqdxSimpleBoardCanvas">
        <Box sx={{ height: 320, border: '1px solid var(--color-border-subtle)', borderRadius: 1, overflow: 'hidden' }}>
          <MsqdxSimpleBoardCanvas
            board={demoBoard}
            prismions={[demoPrismionA, demoPrismionB]}
            connections={[demoConnection]}
          />
        </Box>
      </Section>

      <Section title="MsqdxBoardCanvas (controlled zoom/pan)">
        <Box sx={{ height: 280, border: '1px solid var(--color-border-subtle)', borderRadius: 1, overflow: 'hidden' }}>
          <MsqdxBoardCanvas
            board={demoBoard}
            prismions={[demoPrismionA, demoPrismionB]}
            connections={[demoConnection]}
            participants={demoParticipants}
            zoom={zoom}
            pan={pan}
            onZoomChange={setZoom}
            onPanChange={setPan}
          />
        </Box>
      </Section>

      <Section title="MsqdxBoardCanvasFunctional">
        <Box sx={{ height: 280, border: '1px solid var(--color-border-subtle)', borderRadius: 1, overflow: 'hidden' }}>
          <MsqdxBoardCanvasFunctional
            board={demoBoard}
            prismions={[demoPrismionA, demoPrismionB]}
            connections={[demoConnection]}
            participants={demoParticipants}
          />
        </Box>
      </Section>

      {/* Referenztabelle */}
      <MsqdxCard
        variant="flat"
        borderRadius="button"
        sx={{
          p: 2,
          mt: 3,
          border: '1px solid var(--color-secondary-dx-grey-light-tint)',
          bgcolor: 'var(--color-card-bg)',
          color: 'var(--color-text-on-light)',
        }}
      >
        <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 2 }}>
          {t('designSystem.tableTitle') ?? 'Komponente → MSQDX-Äquivalent'}
        </MsqdxTypography>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid var(--color-border-subtle)', fontWeight: 600 }}>
                  {t('designSystem.columnComponent') ?? 'Komponente'}
                </th>
                <th style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid var(--color-border-subtle)', fontWeight: 600 }}>
                  {t('designSystem.columnMsqdx') ?? 'MSQDX-Äquivalent'}
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ['PrismionPorts', 'MsqdxPrismionPorts'],
                ['PrismionResult', 'MsqdxPrismionResult'],
                ['PrismionToolbar', 'MsqdxPrismionToolbar'],
                ['ConnectorEdge', 'MsqdxConnectorEdge'],
                ['PresenceList', 'MsqdxPresenceList'],
                ['PresenceLayer', 'MsqdxPresenceLayer'],
                ['UserToolbar', 'MsqdxUserToolbar'],
                ['PrismionCard', 'MsqdxPrismionCard'],
                ['BoardHeader', 'MsqdxBoardHeader'],
                ['BoardOnboarding', 'MsqdxBoardOnboarding'],
                ['BoardToolbar', 'MsqdxBoardToolbar'],
                ['BoardCanvas', 'MsqdxBoardCanvas'],
                ['BoardCanvasFunctional', 'MsqdxBoardCanvasFunctional'],
                ['BoardGrid', 'MsqdxBoardGrid'],
                ['CommandPalette', 'MsqdxCommandPalette'],
                ['ConnectorMenu', 'MsqdxConnectorMenu'],
                ['ContextMenu', 'MsqdxContextMenu'],
                ['InspectorPanel', 'MsqdxInspectorPanel'],
                ['MergeDrawer', 'MsqdxMergeDrawer'],
                ['SimpleBoardCanvas', 'MsqdxSimpleBoardCanvas'],
              ].map(([comp, msqdx]) => (
                <tr key={comp} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{comp}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--color-primary-main, #1976d2)' }}>{msqdx}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </MsqdxCard>
    </Box>
  );
}
