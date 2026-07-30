'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { type Prismion, type Board, type Connection, type PrismionResultItem } from '@msqdx/react';
import { ReactFlowBoard } from '@/components/board/ReactFlowBoard';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  API_BOARD_COMPLETE,
  BOARD_STORAGE_KEY,
  CHECKION_MCP_BADGE_ID,
  AUDION_MCP_BADGE_ID,
} from '@/lib/constants';
import { getUpstreamCardIdsInOrder, buildHistoryMessages } from '@/lib/board-connection-history';
import type { ParentByPrismionId } from '@/lib/board-thread';
import { findNonOverlappingPosition } from '@/lib/board-collision';

const PROMPT_CARD_W = 360;
/** Height for prompt card: single row (input + round send button). */
const PROMPT_CARD_H = 72;
const RESULT_CARD_W = 380;
const RESULT_CARD_H = 280;
const CARD_GAP = 24;
/** Size of the tool card (CHECKION MCP badge); square so it renders as a circle. */
const TOOL_CARD_SIZE = 56;
const now = new Date().toISOString();

function createPort(side: 'top' | 'right' | 'bottom' | 'left') {
  return { id: `port-${side}`, side, capacity: 'single' as const };
}

function createPromptPrismion(overrides: Partial<Prismion> = {}): Prismion {
  return {
    id: 'prompt-card',
    boardId: 'board-prompt',
    title: 'Prompt',
    prompt: '',
    colorToken: 'var(--color-theme-accent, #00ca55)',
    tags: [],
    position: { x: 0, y: 0, zIndex: 0 },
    size: { w: PROMPT_CARD_W, h: PROMPT_CARD_H, minW: 280, minH: 72 },
    ports: {
      top: createPort('top'),
      right: createPort('right'),
      bottom: createPort('bottom'),
      left: createPort('left'),
    },
    state: 'active',
    createdBy: 'user',
    createdAt: now,
    updatedAt: now,
    revision: 1,
    ...overrides,
  };
}

const OPPOSITE_PORT: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
  right: 'left',
  left: 'right',
  top: 'bottom',
  bottom: 'top',
};

function createResultPrismion(
  id: string,
  userPrompt: string,
  position: { x: number; y: number; zIndex?: number }
): Prismion {
  const title =
    userPrompt.length > 32 ? userPrompt.slice(0, 29) + '…' : userPrompt || 'Result';
  return {
    id,
    boardId: 'board-prompt',
    title,
    prompt: userPrompt,
    colorToken: 'var(--color-theme-accent, #00ca55)',
    tags: [],
    position: { ...position, zIndex: position.zIndex ?? 1 },
    size: { w: RESULT_CARD_W, h: RESULT_CARD_H, minW: 280, minH: 100 },
    ports: {
      top: createPort('top'),
      right: createPort('right'),
      bottom: createPort('bottom'),
      left: createPort('left'),
    },
    state: 'active',
    createdBy: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 1,
  };
}

/** Tool card (CHECKION MCP badge): round card with plug icon in the center. */
function createCheckionBadgePrismion(position: { x: number; y: number }): Prismion {
  return {
    id: CHECKION_MCP_BADGE_ID,
    boardId: 'board-prompt',
    title: 'CHECKION',
    prompt: '',
    colorToken: 'var(--color-theme-accent, #00ca55)',
    tags: [],
    position: { ...position, zIndex: 0 },
    size: { w: TOOL_CARD_SIZE, h: TOOL_CARD_SIZE, minW: TOOL_CARD_SIZE, minH: TOOL_CARD_SIZE },
    ports: {
      top: createPort('top'),
      right: createPort('right'),
      bottom: createPort('bottom'),
      left: createPort('left'),
    },
    state: 'active',
    createdBy: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 1,
    kind: 'tool',
  };
}

/** Tool card (AUDION MCP badge): round card with plug icon in the center. */
function createAudionBadgePrismion(position: { x: number; y: number }): Prismion {
  return {
    id: AUDION_MCP_BADGE_ID,
    boardId: 'board-prompt',
    title: 'AUDION',
    prompt: '',
    colorToken: 'var(--color-theme-accent, #00ca55)',
    tags: [],
    position: { ...position, zIndex: 0 },
    size: { w: TOOL_CARD_SIZE, h: TOOL_CARD_SIZE, minW: TOOL_CARD_SIZE, minH: TOOL_CARD_SIZE },
    ports: {
      top: createPort('top'),
      right: createPort('right'),
      bottom: createPort('bottom'),
      left: createPort('left'),
    },
    state: 'active',
    createdBy: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 1,
    kind: 'tool',
  };
}

const board: Board = {
  id: 'board-prompt',
  shareId: 'share-prompt',
  title: 'Board',
  description: 'Prompt-Eingabe',
  isPublic: false,
  createdAt: now,
  updatedAt: now,
  canvasSettings: {
    backgroundColor: 'transparent',
    patternColor: '#e0e0e0',
    patternSize: 20,
    background: 'plain',
  },
};

type BoardPersistedState = {
  promptPrismion: Prismion;
  promptCardsFromPorts: Prismion[];
  resultPrismions: Prismion[];
  prismionResults: Record<string, PrismionResultItem[]>;
  connections: Connection[];
  /** Explicit parent for nesting. Child id -> parent prompt id. */
  parentByPrismionId?: ParentByPrismionId;
  checkionMcpEnabled?: boolean;
  badgePrismion?: Prismion | null;
  audionMcpEnabled?: boolean;
  audionBadgePrismion?: Prismion | null;
  /** Card IDs that were extracted from a thread onto the board (top-level nodes). */
  extractedCardIds?: string[];
};

/** Derive parentByPrismionId from connections for legacy boards. */
function deriveParentFromConnections(parsed: BoardPersistedState): ParentByPrismionId {
  const parent: ParentByPrismionId = {};
  const resultIds = new Set(parsed.resultPrismions.map((p) => p.id));
  const promptIds = new Set([
    parsed.promptPrismion.id,
    ...parsed.promptCardsFromPorts.map((p) => p.id),
  ]);
  for (const c of parsed.connections) {
    const to = c.toPrismionId ?? '';
    const from = c.fromPrismionId ?? '';
    if (c.direction === 'backward') continue;
    if (resultIds.has(to)) parent[to] = from;
    else if (promptIds.has(from) && promptIds.has(to)) parent[to] = from;
  }
  return parent;
}

function loadBoardState(
  t: (key: string) => string | undefined
): BoardPersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BoardPersistedState;
    if (
      !parsed.promptPrismion ||
      !Array.isArray(parsed.promptCardsFromPorts) ||
      !Array.isArray(parsed.resultPrismions) ||
      !parsed.prismionResults ||
      typeof parsed.prismionResults !== 'object' ||
      !Array.isArray(parsed.connections)
    ) {
      return null;
    }
    if (!parsed.parentByPrismionId || typeof parsed.parentByPrismionId !== 'object') {
      parsed.parentByPrismionId = deriveParentFromConnections(parsed);
      parsed.connections = parsed.connections.filter((c) => !c.id.startsWith('conn-parent-'));
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveBoardState(state: BoardPersistedState) {
  if (typeof window === 'undefined') return;
  try {
    const toSave = {
      ...state,
      parentByPrismionId: state.parentByPrismionId ?? {},
      checkionMcpEnabled: state.checkionMcpEnabled ?? false,
      badgePrismion: state.badgePrismion ?? null,
      audionMcpEnabled: state.audionMcpEnabled ?? false,
      audionBadgePrismion: state.audionBadgePrismion ?? null,
      extractedCardIds: state.extractedCardIds ?? [],
    };
    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore quota or parse errors
  }
}

export default function BoardPage() {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [promptPrismion, setPromptPrismion] = useState<Prismion>(() => {
    const cached = loadBoardState(t);
    if (cached?.promptPrismion) return cached.promptPrismion;
    return createPromptPrismion({ title: t('board.promptCardTitle') ?? 'Prompt' });
  });
  const [promptCardsFromPorts, setPromptCardsFromPorts] = useState<Prismion[]>(() => {
    const cached = loadBoardState(t);
    return cached?.promptCardsFromPorts ?? [];
  });
  const [resultPrismions, setResultPrismions] = useState<Prismion[]>(() => {
    const cached = loadBoardState(t);
    return cached?.resultPrismions ?? [];
  });
  const [prismionResults, setPrismionResults] = useState<Record<string, PrismionResultItem[]>>(() => {
    const cached = loadBoardState(t);
    return cached?.prismionResults ?? {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedPrismionIds, setSelectedPrismionIds] = useState<string[]>([]);
  const [marqueeSelectMode, setMarqueeSelectMode] = useState(false);
  const [connections, setConnections] = useState<Connection[]>(() => {
    const cached = loadBoardState(t);
    return cached?.connections ?? [];
  });
  const [parentByPrismionId, setParentByPrismionId] = useState<ParentByPrismionId>(() => {
    const cached = loadBoardState(t);
    return cached?.parentByPrismionId && typeof cached.parentByPrismionId === 'object'
      ? cached.parentByPrismionId
      : {};
  });
  const [checkionMcpEnabled, setCheckionMcpEnabled] = useState<boolean>(() => {
    const cached = loadBoardState(t);
    return cached?.checkionMcpEnabled ?? false;
  });
  const [badgePrismion, setBadgePrismion] = useState<Prismion | null>(() => {
    const cached = loadBoardState(t);
    return cached?.badgePrismion ?? null;
  });
  const [audionMcpEnabled, setAudionMcpEnabled] = useState<boolean>(() => {
    const cached = loadBoardState(t);
    return cached?.audionMcpEnabled ?? false;
  });
  const [audionBadgePrismion, setAudionBadgePrismion] = useState<Prismion | null>(() => {
    const cached = loadBoardState(t);
    return cached?.audionBadgePrismion ?? null;
  });
  const [extractedCardIds, setExtractedCardIds] = useState<string[]>(() => {
    const cached = loadBoardState(t);
    return Array.isArray(cached?.extractedCardIds) ? cached.extractedCardIds : [];
  });

  const prismions = React.useMemo(
    () => [
      ...(badgePrismion ? [badgePrismion] : []),
      ...(audionBadgePrismion ? [audionBadgePrismion] : []),
      promptPrismion,
      ...promptCardsFromPorts,
      ...resultPrismions,
    ],
    [badgePrismion, audionBadgePrismion, promptPrismion, promptCardsFromPorts, resultPrismions]
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SAVE_DEBOUNCE_MS = 600;
  useEffect(() => {
    const payload = {
      promptPrismion,
      promptCardsFromPorts,
      resultPrismions,
      prismionResults,
      connections,
      parentByPrismionId,
      checkionMcpEnabled,
      badgePrismion,
      audionMcpEnabled,
      audionBadgePrismion,
      extractedCardIds,
    };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveBoardState(payload);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [promptPrismion, promptCardsFromPorts, resultPrismions, prismionResults, connections, parentByPrismionId, checkionMcpEnabled, badgePrismion, audionMcpEnabled, audionBadgePrismion, extractedCardIds]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 };
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const initialPan =
    containerSize != null
      ? {
          x: containerSize.w / 2 - PROMPT_CARD_W / 2,
          y: containerSize.h / 2 - PROMPT_CARD_H / 2,
        }
      : { x: 0, y: 0 };

  const getPrismionById = useCallback(
    (id: string): Prismion | undefined =>
      prismions.find((p) => p.id === id),
    [prismions]
  );

  const handlePrismionMove = useCallback((id: string, position: { x: number; y: number }) => {
    if (id === CHECKION_MCP_BADGE_ID) {
      setBadgePrismion((prev) =>
        prev ? { ...prev, position: { ...position, zIndex: prev.position.zIndex } } : null
      );
      return;
    }
    if (id === AUDION_MCP_BADGE_ID) {
      setAudionBadgePrismion((prev) =>
        prev ? { ...prev, position: { ...position, zIndex: prev.position.zIndex } } : null
      );
      return;
    }
    if (id === 'prompt-card') {
      setPromptPrismion((prev) => ({
        ...prev,
        position: { ...position, zIndex: prev.position.zIndex },
      }));
      return;
    }
    if (promptCardsFromPorts.some((p) => p.id === id)) {
      setPromptCardsFromPorts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, position: { ...position, zIndex: p.position.zIndex } } : p
        )
      );
      return;
    }
    setResultPrismions((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, position: { ...position, zIndex: p.position.zIndex } } : p
      )
    );
  }, [promptCardsFromPorts]);

  const handlePrismionResize = useCallback((id: string, size: { w: number; h: number }) => {
    if (id === CHECKION_MCP_BADGE_ID || id === AUDION_MCP_BADGE_ID) return;
    const isNoOp = (current: { w: number; h: number }) =>
      current.w === size.w && current.h === size.h;
    if (id === 'prompt-card') {
      setPromptPrismion((prev) => {
        if (isNoOp(prev.size)) return prev;
        return { ...prev, size: { ...prev.size, w: size.w, h: size.h } };
      });
      return;
    }
    if (promptCardsFromPorts.some((p) => p.id === id)) {
      setPromptCardsFromPorts((prev) =>
        prev.map((p) => {
          if (p.id !== id || isNoOp(p.size)) return p;
          return { ...p, size: { ...p.size, w: size.w, h: size.h } };
        })
      );
      return;
    }
    setResultPrismions((prev) =>
      prev.map((p) => {
        if (p.id !== id || isNoOp(p.size)) return p;
        return { ...p, size: { ...p.size, w: size.w, h: size.h } };
      })
    );
  }, []);

  const handlePrismionDelete = useCallback((id: string) => {
    setSelectedPrismionIds((prev) => prev.filter((x) => x !== id));
    setConnections((prev) =>
      prev.filter((c) => c.fromPrismionId !== id && c.toPrismionId !== id)
    );
    setParentByPrismionId((prev) => {
      const next = { ...prev };
      delete next[id];
      for (const key of Object.keys(next)) {
        if (next[key] === id) delete next[key];
      }
      return next;
    });
    if (id === CHECKION_MCP_BADGE_ID) {
      setCheckionMcpEnabled(false);
      setBadgePrismion(null);
      return;
    }
    if (id === AUDION_MCP_BADGE_ID) {
      setAudionMcpEnabled(false);
      setAudionBadgePrismion(null);
      return;
    }
    if (id === 'prompt-card') {
      setPromptPrismion(() =>
        createPromptPrismion({ title: t('board.promptCardTitle') ?? 'Prompt' })
      );
      return;
    }
    if (promptCardsFromPorts.some((p) => p.id === id)) {
      setPromptCardsFromPorts((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    setResultPrismions((prev) => prev.filter((p) => p.id !== id));
    setPrismionResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setExtractedCardIds((prev) => prev.filter((x) => x !== id));
    setSelectedPrismionIds((prev) => (prev.includes(id) && prev.length === 1 ? [] : prev.filter((x) => x !== id)));
  }, [promptCardsFromPorts, t]);

  const handlePrismionColorChange = useCallback((id: string, color: string) => {
    if (id === 'prompt-card') {
      setPromptPrismion((prev) => ({ ...prev, backgroundColor: color }));
      return;
    }
    if (id === CHECKION_MCP_BADGE_ID && badgePrismion) {
      setBadgePrismion((prev) => (prev ? { ...prev, backgroundColor: color } : null));
      return;
    }
    if (id === AUDION_MCP_BADGE_ID && audionBadgePrismion) {
      setAudionBadgePrismion((prev) => (prev ? { ...prev, backgroundColor: color } : null));
      return;
    }
    if (promptCardsFromPorts.some((p) => p.id === id)) {
      setPromptCardsFromPorts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, backgroundColor: color } : p))
      );
      return;
    }
    setResultPrismions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, backgroundColor: color } : p))
    );
  }, [badgePrismion, audionBadgePrismion]);

  const handleConnectorCreate = useCallback(
    (fromId: string, port: 'top' | 'right' | 'bottom' | 'left', type: 'prompt' | 'file' | 'image' | 'video' | 'link') => {
      if (type !== 'prompt') return;
      const source = getPrismionById(fromId);
      if (!source) return;
      const sourceW = source.id === 'prompt-card' || promptCardsFromPorts.some((p) => p.id === source.id) ? PROMPT_CARD_W : RESULT_CARD_W;
      const sourceH = source.id === 'prompt-card' || promptCardsFromPorts.some((p) => p.id === source.id) ? PROMPT_CARD_H : RESULT_CARD_H;
      let newPosition: { x: number; y: number };
      switch (port) {
        case 'right':
          newPosition = { x: source.position.x + sourceW + CARD_GAP, y: source.position.y };
          break;
        case 'left':
          newPosition = { x: source.position.x - PROMPT_CARD_W - CARD_GAP, y: source.position.y };
          break;
        case 'bottom':
          newPosition = { x: source.position.x, y: source.position.y + sourceH + CARD_GAP };
          break;
        case 'top':
          newPosition = { x: source.position.x, y: source.position.y - PROMPT_CARD_H - CARD_GAP };
          break;
      }
      const newId = `prompt-${Date.now()}`;
      const safePosition = findNonOverlappingPosition(
        newPosition,
        { w: PROMPT_CARD_W, h: PROMPT_CARD_H },
        newId,
        prismions,
        CARD_GAP
      );
      const maxZ = Math.max(0, ...prismions.map((p) => p.position.zIndex ?? 0));
      const newCard = createPromptPrismion({
        id: newId,
        title: t('board.promptCardTitle') ?? 'Prompt',
        position: { ...safePosition, zIndex: maxZ + 1 },
      });
      setPromptCardsFromPorts((prev) => [...prev, newCard]);
      const toPort = OPPOSITE_PORT[port];
      const ts = new Date().toISOString();
      setConnections((prev) => [
        ...prev,
        {
          id: `conn-${newId}`,
          boardId: board.id,
          fromPrismionId: fromId,
          toPrismionId: newId,
          fromPort: port,
          toPort,
          direction: 'forward',
          strokeWidth: 2,
          createdAt: ts,
          updatedAt: ts,
        },
      ]);
    },
    [getPrismionById, promptCardsFromPorts, prismions, t]
  );

  const handleConnectorDirectionChange = useCallback((connectorId: string, direction: 'forward' | 'backward') => {
    setConnections((prev) =>
      prev.map((c) => (c.id === connectorId ? { ...c, direction, updatedAt: new Date().toISOString() } : c))
    );
  }, []);

  const handleConnectorDelete = useCallback((connectorId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectorId));
  }, []);

  const handleConnectionCreate = useCallback(
    (fromId: string, toId: string, fromPort?: 'top' | 'right' | 'bottom' | 'left', toPort?: 'top' | 'right' | 'bottom' | 'left') => {
      const ts = new Date().toISOString();
      const connId = `conn-${Date.now()}`;
      setConnections((prev) => [
        ...prev,
        {
          id: connId,
          boardId: board.id,
          fromPrismionId: fromId,
          toPrismionId: toId,
          fromPort: fromPort ?? 'right',
          toPort: toPort ?? 'left',
          direction: 'forward' as const,
          strokeWidth: 2,
          createdAt: ts,
          updatedAt: ts,
        },
      ]);
    },
    []
  );

  const handleDoubleClickCanvas = useCallback(
    (graphX: number, graphY: number) => {
      const newId = `prompt-${Date.now()}`;
      const candidatePosition = { x: graphX - PROMPT_CARD_W / 2, y: graphY - PROMPT_CARD_H / 2 };
      const safePosition = findNonOverlappingPosition(
        candidatePosition,
        { w: PROMPT_CARD_W, h: PROMPT_CARD_H },
        newId,
        prismions,
        CARD_GAP
      );
      const maxZ = Math.max(0, ...prismions.map((p) => p.position.zIndex ?? 0));
      const newCard = createPromptPrismion({
        id: newId,
        title: t('board.promptCardTitle') ?? 'Prompt',
        position: { ...safePosition, zIndex: maxZ + 1 },
      });
      setPromptCardsFromPorts((prev) => [...prev, newCard]);
    },
    [prismions, t]
  );

  const handleAddPromptCard = useCallback(() => {
    const anchor = prismions[0];
    const baseX = anchor ? anchor.position.x + (anchor.size?.w ?? PROMPT_CARD_W) + CARD_GAP : 80;
    const baseY = anchor?.position.y ?? 80;
    const newId = `prompt-${Date.now()}`;
    const safePosition = findNonOverlappingPosition(
      { x: baseX, y: baseY },
      { w: PROMPT_CARD_W, h: PROMPT_CARD_H },
      newId,
      prismions,
      CARD_GAP
    );
    const maxZ = Math.max(0, ...prismions.map((p) => p.position.zIndex ?? 0));
    const newCard = createPromptPrismion({
      id: newId,
      title: t('board.promptCardTitle') ?? 'Prompt',
      position: { ...safePosition, zIndex: maxZ + 1 },
    });
    setPromptCardsFromPorts((prev) => [...prev, newCard]);
  }, [prismions, t]);

  const handleConnectorWaypointsChange = useCallback((connectorId: string, waypoints: { x: number; y: number }[]) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connectorId ? { ...c, waypoints, updatedAt: new Date().toISOString() } : c
      )
    );
  }, []);

  const handleCheckionMcpToggle = useCallback(
    (enabled: boolean) => {
      setCheckionMcpEnabled(enabled);
      if (enabled) {
        const candidateBadgePosition = {
          x: promptPrismion.position.x - TOOL_CARD_SIZE - CARD_GAP,
          y: promptPrismion.position.y,
        };
        const badgePosition = findNonOverlappingPosition(
          candidateBadgePosition,
          { w: TOOL_CARD_SIZE, h: TOOL_CARD_SIZE },
          CHECKION_MCP_BADGE_ID,
          prismions,
          CARD_GAP
        );
        setBadgePrismion(createCheckionBadgePrismion(badgePosition));
        const ts = new Date().toISOString();
        setConnections((prev) => [
          ...prev,
          {
            id: `conn-${CHECKION_MCP_BADGE_ID}`,
            boardId: board.id,
            fromPrismionId: CHECKION_MCP_BADGE_ID,
            toPrismionId: 'prompt-card',
            fromPort: 'right' as const,
            toPort: 'left' as const,
            direction: 'forward' as const,
            strokeWidth: 2,
            createdAt: ts,
            updatedAt: ts,
          },
        ]);
      } else {
        setBadgePrismion(null);
        setConnections((prev) =>
          prev.filter(
            (c) =>
              c.fromPrismionId !== CHECKION_MCP_BADGE_ID &&
              c.toPrismionId !== CHECKION_MCP_BADGE_ID
          )
        );
      }
    },
    [promptPrismion.position, prismions]
  );

  const handleAudionMcpToggle = useCallback(
    (enabled: boolean) => {
      setAudionMcpEnabled(enabled);
      if (enabled) {
        const anchor = badgePrismion ?? promptPrismion;
        const candidateBadgePosition = {
          x: anchor.position.x - TOOL_CARD_SIZE - CARD_GAP,
          y: anchor.position.y,
        };
        const badgePosition = findNonOverlappingPosition(
          candidateBadgePosition,
          { w: TOOL_CARD_SIZE, h: TOOL_CARD_SIZE },
          AUDION_MCP_BADGE_ID,
          prismions,
          CARD_GAP
        );
        setAudionBadgePrismion(createAudionBadgePrismion(badgePosition));
        const ts = new Date().toISOString();
        setConnections((prev) => [
          ...prev,
          {
            id: `conn-${AUDION_MCP_BADGE_ID}`,
            boardId: board.id,
            fromPrismionId: AUDION_MCP_BADGE_ID,
            toPrismionId: 'prompt-card',
            fromPort: 'right' as const,
            toPort: 'left' as const,
            direction: 'forward' as const,
            strokeWidth: 2,
            createdAt: ts,
            updatedAt: ts,
          },
        ]);
      } else {
        setAudionBadgePrismion(null);
        setConnections((prev) =>
          prev.filter(
            (c) =>
              c.fromPrismionId !== AUDION_MCP_BADGE_ID &&
              c.toPrismionId !== AUDION_MCP_BADGE_ID
          )
        );
      }
    },
    [promptPrismion.position, badgePrismion, prismions]
  );

  const handleConnectorDrop = useCallback(
    (fromPrismionId: string, fromPort: 'top' | 'right' | 'bottom' | 'left', toPrismionId: string, toPort: 'top' | 'right' | 'bottom' | 'left') => {
      setConnections((prev) => {
        const exists = prev.some(
          (c) =>
            c.fromPrismionId === fromPrismionId &&
            c.fromPort === fromPort &&
            c.toPrismionId === toPrismionId &&
            c.toPort === toPort
        );
        if (exists) return prev;
        const ts = new Date().toISOString();
        return [
          ...prev,
          {
            id: `conn-drag-${Date.now()}`,
            boardId: board.id,
            fromPrismionId,
            toPrismionId,
            fromPort,
            toPort,
            strokeWidth: 2,
            createdAt: ts,
            updatedAt: ts,
          },
        ];
      });
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedPrismionIds.length === 0) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as Node;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable))
      ) {
        return;
      }
      e.preventDefault();
      for (const id of selectedPrismionIds) {
        handlePrismionDelete(id);
      }
      setSelectedPrismionIds([]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPrismionIds, handlePrismionDelete]);

  const handlePromptSubmit = useCallback(
    async (id: string, prompt: string) => {
      if (id === CHECKION_MCP_BADGE_ID || id === AUDION_MCP_BADGE_ID || !prompt.trim() || submitting) return;
      setSubmitting(true);
      try {
        const prismionIds = new Set(prismions.map((p) => p.id));
        const orderedUpstream = getUpstreamCardIdsInOrder(id, connections, prismionIds);
        const historyMessages = buildHistoryMessages(orderedUpstream, prismions, prismionResults);
        const hasCheckionInUpstreamChain = orderedUpstream.includes(CHECKION_MCP_BADGE_ID);
        const hasAudionInUpstreamChain = orderedUpstream.includes(AUDION_MCP_BADGE_ID);
        const body: {
          prompt: string;
          messages?: { role: 'user' | 'assistant'; content: string }[];
          useCheckionMcp?: boolean;
          useAudionMcp?: boolean;
        } = {
          prompt: prompt.trim(),
          useCheckionMcp: hasCheckionInUpstreamChain,
          useAudionMcp: hasAudionInUpstreamChain,
        };
        if (historyMessages.length > 0) body.messages = historyMessages;

        // Debug: Chat history for this submit (filter console by [board/history])
        console.log('[board/history] submit', {
          cardId: id,
          useCheckionMcp: hasCheckionInUpstreamChain,
          useAudionMcp: hasAudionInUpstreamChain,
          connectionsCount: connections.length,
          connectionsFromTo: connections.map((c) => ({ from: c.fromPrismionId, to: c.toPrismionId, dir: c.direction })),
          prismionIds: Array.from(prismionIds),
          orderedUpstream,
          historyMessagesCount: historyMessages.length,
          historyPreview: historyMessages.map((m) => ({ role: m.role, contentLength: m.content.length, contentStart: m.content.slice(0, 80) })),
          bodyKeys: Object.keys(body),
          bodyHasMessages: 'messages' in body && Array.isArray(body.messages),
        });

        const res = await fetch(API_BOARD_COMPLETE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        const resultId = `result-${Date.now()}`;
        const sourceCard = prismions.find((p) => p.id === id);
        const promptPos = sourceCard?.position ?? promptPrismion.position;
        const fromH = sourceCard && (sourceCard.id === 'prompt-card' || promptCardsFromPorts.some((p) => p.id === sourceCard.id)) ? PROMPT_CARD_H : RESULT_CARD_H;
        const candidatePosition = {
          x: promptPos.x,
          y: promptPos.y + fromH + CARD_GAP,
        };
        const newPosition = findNonOverlappingPosition(
          candidatePosition,
          { w: RESULT_CARD_W, h: RESULT_CARD_H },
          resultId,
          prismions,
          CARD_GAP
        );
        const maxZ = Math.max(0, ...prismions.map((p) => p.position.zIndex ?? 0));
        let content: string;
        if (!res.ok) {
          const err = data?.error ?? data?.details ?? res.statusText;
          content = `Error: ${err}`;
        } else {
          content = data?.text ?? '(No response)';
        }
        const newPrismion = createResultPrismion(resultId, prompt.trim(), { ...newPosition, zIndex: maxZ + 1 });
        setResultPrismions((prev) => [...prev, newPrismion]);
        setPrismionResults((prev) => ({
          ...prev,
          [resultId]: [{ type: 'text' as const, content }],
        }));
        setParentByPrismionId((prev) => ({ ...prev, [resultId]: id }));
        const connId = `conn-${resultId}`;
        const ts = new Date().toISOString();
        setConnections((prev) => [
          ...prev,
          {
            id: connId,
            boardId: board.id,
            fromPrismionId: id,
            toPrismionId: resultId,
            fromPort: 'bottom',
            toPort: 'top',
            direction: 'forward',
            strokeWidth: 2,
            createdAt: ts,
            updatedAt: ts,
          },
        ]);
        setPromptPrismion((prev) =>
          id === 'prompt-card' ? { ...prev, prompt: prompt.trim(), updatedAt: new Date().toISOString() } : prev
        );
        setPromptCardsFromPorts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, prompt: prompt.trim(), updatedAt: new Date().toISOString() } : p
          )
        );
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, promptPrismion.position, resultPrismions, promptCardsFromPorts, prismions, connections, prismionResults]
  );

  /** anchorId: thread root ('prompt-card'), a result card id, or a follow-up prompt id (e.g. when thread has no results yet). */
  const handleAddPromptBelowResult = useCallback(
    (anchorId: string, initialPrompt?: string) => {
      const resultCard = resultPrismions.find((p) => p.id === anchorId);
      const promptCard =
        anchorId === 'prompt-card'
          ? promptPrismion
          : promptCardsFromPorts.find((p) => p.id === anchorId);
      const anchorCard = resultCard ?? promptCard;
      if (!anchorCard) return;
      const anchorH = anchorCard.size?.h ?? (resultCard ? RESULT_CARD_H : PROMPT_CARD_H);
      const candidatePosition = {
        x: anchorCard.position.x,
        y: anchorCard.position.y + anchorH + CARD_GAP,
      };
      const newId = `prompt-${Date.now()}`;
      const safePosition = findNonOverlappingPosition(
        candidatePosition,
        { w: PROMPT_CARD_W, h: PROMPT_CARD_H },
        newId,
        prismions,
        CARD_GAP
      );
      const maxZ = Math.max(0, ...prismions.map((p) => p.position.zIndex ?? 0));
      const newCard = createPromptPrismion({
        id: newId,
        title: t('board.promptCardTitle') ?? 'Prompt',
        position: { ...safePosition, zIndex: maxZ + 1 },
      });
      setPromptCardsFromPorts((prev) => [...prev, newCard]);
      const ts = new Date().toISOString();
      const parentPromptId = resultCard
        ? (() => {
            const conn = connections.find((c) => c.toPrismionId === anchorId);
            return conn?.fromPrismionId ?? anchorId;
          })()
        : anchorId;
      setParentByPrismionId((p) => ({ ...p, [newId]: parentPromptId }));
      setConnections((prev) => [
        ...prev,
        {
          id: `conn-${newId}`,
          boardId: board.id,
          fromPrismionId: anchorId,
          toPrismionId: newId,
          fromPort: 'bottom' as const,
          toPort: 'top' as const,
          direction: 'forward' as const,
          strokeWidth: 2,
          createdAt: ts,
          updatedAt: ts,
        },
      ]);
      if (initialPrompt?.trim()) {
        handlePromptSubmit(newId, initialPrompt.trim());
      }
    },
    [resultPrismions, promptPrismion, promptCardsFromPorts, prismions, connections, t, handlePromptSubmit]
  );

  const handlePortCheckionMcpToggle = useCallback(() => {
    handleCheckionMcpToggle(!checkionMcpEnabled);
  }, [checkionMcpEnabled, handleCheckionMcpToggle]);

  const handlePortAudionMcpToggle = useCallback(() => {
    handleAudionMcpToggle(!audionMcpEnabled);
  }, [audionMcpEnabled, handleAudionMcpToggle]);

  const handleResultContentChange = useCallback((nodeId: string, content: string) => {
    setPrismionResults((prev) => {
      const items = prev[nodeId] ?? [];
      const next = [...items];
      if (next.length === 0) {
        next.push({ type: 'richtext', content });
      } else {
        next[0] = { ...next[0], type: 'richtext' as const, content };
      }
      return { ...prev, [nodeId]: next };
    });
  }, []);

  const handleExtractFromThread = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setExtractedCardIds((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));
    if (nodeId === 'prompt-card') {
      setPromptPrismion((prev) => ({
        ...prev,
        position: { ...position, zIndex: prev.position.zIndex ?? 0 },
      }));
      return;
    }
    if (promptCardsFromPorts.some((p) => p.id === nodeId)) {
      setPromptCardsFromPorts((prev) =>
        prev.map((p) =>
          p.id === nodeId ? { ...p, position: { ...position, zIndex: p.position.zIndex ?? 0 } } : p
        )
      );
      return;
    }
    setResultPrismions((prev) =>
      prev.map((p) =>
        p.id === nodeId ? { ...p, position: { ...position, zIndex: p.position.zIndex ?? 0 } } : p
      )
    );
  }, [promptCardsFromPorts]);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {containerSize && (
          <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
            <ReactFlowBoard
              prismions={prismions}
              connections={connections}
              parentByPrismionId={parentByPrismionId}
              selectedPrismionIds={selectedPrismionIds}
              extractedCardIds={extractedCardIds}
              onExtractFromThread={handleExtractFromThread}
              onSelectPrismion={(id) => setSelectedPrismionIds(id ? [id] : [])}
              onPrismionMove={handlePrismionMove}
              onPrismionResize={handlePrismionResize}
              onPrismionDelete={handlePrismionDelete}
              onPrismionColorChange={handlePrismionColorChange}
              onResultContentChange={handleResultContentChange}
              onConnectorDelete={handleConnectorDelete}
              onConnectorDirectionChange={handleConnectorDirectionChange}
              onDoubleClickCell={(id) => setSelectedPrismionIds([id])}
              onDoubleClickCanvas={handleDoubleClickCanvas}
              onConnectionCreate={handleConnectionCreate}
              onConnectorCreatePrismion={handleConnectorCreate}
              showCheckionMcpOption
              checkionMcpEnabled={checkionMcpEnabled}
              onCheckionMcpToggle={handlePortCheckionMcpToggle}
              showAudionMcpOption
              audionMcpEnabled={audionMcpEnabled}
              onAudionMcpToggle={handlePortAudionMcpToggle}
              onPromptSubmit={handlePromptSubmit}
              onAddPromptBelowResult={handleAddPromptBelowResult}
              prismionResults={prismionResults}
              style={{
                width: containerSize.w,
                height: containerSize.h,
                minHeight: 400,
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAddPromptCard}
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 10,
              }}
            >
              + {t('board.promptCardTitle') ?? 'Prompt'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
