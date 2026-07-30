'use client';

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  NodeResizer,
  BaseEdge,
  EdgeToolbar,
  getSmoothStepPath,
  useStore,
  useStoreApi,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
  ConnectionLineType,
  ConnectionMode,
  Position,
  useNodesState,
  useEdgesState,
  useUpdateNodeInternals,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  ReactFlowProvider,
  type OnInit,
} from '@xyflow/react';
import { Plus, MessageSquare, FileText, Image, Video, Link as LinkIcon, Plug, ArrowRight, ArrowLeft, Bold, Italic, Underline, Type, Palette, Move } from 'lucide-react';
import { Box, Popover } from '@mui/material';
import { isHtmlContent, sanitizeCardContentHtml } from '@/lib/board-card-content';
import { getThreadRootId, getThreadChildrenInOrder, getThreadRootIdFromParent, getChildrenInOrder, getThreadSequenceFlattened, getThreadSequenceFlattenedFromConnections, type ParentByPrismionId } from '@/lib/board-thread';
import '@xyflow/react/dist/style.css';
import type { Prismion } from '@msqdx/react';
import type { Connection as BoardConnection } from '@msqdx/react';
import type { PrismionResultItem } from '@msqdx/react';
import { MsqdxInput, MsqdxIconButton, MsqdxIcon, MarkdownContent, MsqdxPrismionToolbar } from '@msqdx/react';
import { MSQDX_EFFECTS, MSQDX_NEUTRAL, MSQDX_BRAND_COLOR_CSS, MSQDX_TYPOGRAPHY, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';

const NODE_TYPE_PROMPT = 'promptCard';
const NODE_TYPE_TOOL = 'toolCard';

const PORT_SIZE = 24;
const MENU_RADIUS = 52;
const PORT_MENU_BUTTON_SIZE = 28;
/** Card border radius: 32px from MSQDX (prompt + result cards). Use px string so MUI doesn’t treat number as theme multiplier. */
const CARD_BORDER_RADIUS_PX = '32px';
const CARD_GAP_PX = 24;
/** Gap between cards inside the thread container (prompt / result / trailing), in px. */
const THREAD_GAP_PX = 12;

/** DataTransfer type for dragging a prismion out of a thread. */
const DRAG_PRISMION_ID_KEY = 'application/x-plexon-prismion-id';
const PROMPT_CARD_H_PX = 72;
/** Default widths for layout (parent expands to fit children). */
const PROMPT_CARD_W_DEFAULT = 360;
const RESULT_CARD_W_DEFAULT = 380;
const RESULT_CARD_H_DEFAULT = 280;
const PROMPT_CARD_H_LAYOUT = 72;

const HANDLE_IDS = ['top', 'right', 'bottom', 'left'] as const;
const HANDLE_POSITIONS: Record<(typeof HANDLE_IDS)[number], Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/** Compute connection point at node border (top/right/bottom/left). Uses internals.positionAbsolute like React Flow; fallback to position + measured/style. */
function getFloatingEdgePoint(
  node: {
    position?: { x: number; y: number };
    measured?: { width?: number; height?: number };
    style?: unknown;
    internals?: { positionAbsolute?: { x: number; y: number } };
  },
  handleId: string
): { x: number; y: number } {
  const pos = node.internals?.positionAbsolute ?? node.position ?? { x: 0, y: 0 };
  const { x, y } = pos;
  const styleObj = node.style as { width?: unknown; height?: unknown } | undefined;
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' ? Number.parseFloat(v) || 100 : 100);
  const w = node.measured?.width ?? num(styleObj?.width);
  const h = node.measured?.height ?? num(styleObj?.height);
  switch (handleId) {
    case 'left':
      return { x, y: y + h / 2 };
    case 'right':
      return { x: x + w, y: y + h / 2 };
    case 'top':
      return { x: x + w / 2, y };
    case 'bottom':
      return { x: x + w / 2, y: y + h };
    default:
      return { x: x + w / 2, y: y + h / 2 };
  }
}

function handleToPosition(handleId: string): Position {
  switch (handleId) {
    case 'left': return Position.Left;
    case 'right': return Position.Right;
    case 'top': return Position.Top;
    case 'bottom': return Position.Bottom;
    default: return Position.Right;
  }
}

/** Simple Floating Edge with direction switch in the middle. See https://reactflow.dev/examples/edges/simple-floating-edges */
const SimpleFloatingEdge = React.memo(function SimpleFloatingEdge(props: {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: { direction?: 'forward' | 'backward' };
  style?: React.CSSProperties;
  markerEnd?: unknown;
  markerStart?: unknown;
  onDirectionChange?: (connectorId: string, direction: 'forward' | 'backward') => void;
}) {
  const { id, source, target, sourceHandle, targetHandle, data, style, markerEnd, markerStart, onDirectionChange } = props;
  const direction = data?.direction ?? 'forward';
  const sourceNode = useStore((s) => s.nodeLookup.get(source));
  const targetNode = useStore((s) => s.nodeLookup.get(target));

  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourcePoint = getFloatingEdgePoint(sourceNode, sourceHandle ?? 'right');
  const targetPoint = getFloatingEdgePoint(targetNode, targetHandle ?? 'left');
  const sourcePosition = handleToPosition(sourceHandle ?? 'right');
  const targetPosition = handleToPosition(targetHandle ?? 'left');

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    sourcePosition,
    targetPosition,
  });

  const handleDirectionClick = useCallback(() => {
    if (!onDirectionChange) return;
    const next = direction === 'forward' ? 'backward' : 'forward';
    onDirectionChange(id, next);
  }, [id, direction, onDirectionChange]);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={style}
        markerEnd={markerEnd as React.ComponentProps<typeof BaseEdge>['markerEnd']}
        markerStart={markerStart as React.ComponentProps<typeof BaseEdge>['markerStart']}
      />
      {onDirectionChange && (
        <EdgeToolbar edgeId={id} x={labelX} y={labelY} isVisible alignX="center" alignY="center" style={{ pointerEvents: 'all' }}>
          <Box
            className="nodrag nopan"
            component="button"
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              handleDirectionClick();
            }}
            sx={{
              pointerEvents: 'all',
              cursor: 'pointer',
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: '#fff',
              border: `2px solid ${MSQDX_NEUTRAL[300]}`,
              boxShadow: MSQDX_EFFECTS.shadows.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: MSQDX_BRAND_COLOR_CSS,
              p: 0,
              '&:hover': {
                borderColor: MSQDX_BRAND_COLOR_CSS,
                bgcolor: MSQDX_NEUTRAL[50],
              },
            }}
            aria-label={direction === 'forward' ? 'Richtung umkehren (Pfeil zur Quelle)' : 'Richtung umkehren (Pfeil zum Ziel)'}
          >
            {direction === 'forward' ? (
              <ArrowRight size={12} strokeWidth={2.5} />
            ) : (
              <ArrowLeft size={12} strokeWidth={2.5} />
            )}
          </Box>
        </EdgeToolbar>
      )}
    </>
  );
});

/** Port size; position is left to React Flow default (center of each side) so connection drag works. */
const PORT_STYLE: Record<(typeof HANDLE_IDS)[number], React.CSSProperties> = {
  top: {},
  right: {},
  bottom: {},
  left: {},
};

export type PortSide = 'top' | 'right' | 'bottom' | 'left';

export type PortMenuKind = 'prompt' | 'file' | 'image' | 'video' | 'link' | 'checkion' | 'audion';

export interface ReactFlowBoardProps {
  prismions: Prismion[];
  connections: BoardConnection[];
  /** Explicit parent map for nesting (child id -> parent id). When set, used instead of connection-based children. */
  parentByPrismionId?: ParentByPrismionId;
  selectedPrismionIds?: string[];
  onSelectPrismion?: (id: string | null) => void;
  onPrismionMove?: (id: string, position: { x: number; y: number }) => void;
  onPrismionResize?: (id: string, size: { w: number; h: number }) => void;
  onPrismionDelete?: (id: string) => void;
  onPrismionColorChange?: (id: string, color: string) => void;
  /** Called when user edits result card content in the WYSIWYG editor (saves HTML). */
  onResultContentChange?: (nodeId: string, content: string) => void;
  onConnectorDelete?: (connectorId: string) => void;
  /** Toggle connection direction (forward = arrow to target, backward = arrow to source). */
  onConnectorDirectionChange?: (connectorId: string, direction: 'forward' | 'backward') => void;
  onDoubleClickCell?: (id: string) => void;
  onDoubleClickCanvas?: (flowX: number, flowY: number) => void;
  onConnectionCreate?: (fromId: string, toId: string, fromPort?: PortSide, toPort?: PortSide) => void;
  /** Create new prismion from port menu (e.g. Prompt, Document). */
  onConnectorCreatePrismion?: (fromId: string, port: PortSide, type: 'prompt' | 'file' | 'image' | 'video' | 'link') => void;
  showCheckionMcpOption?: boolean;
  checkionMcpEnabled?: boolean;
  onCheckionMcpToggle?: () => void;
  showAudionMcpOption?: boolean;
  audionMcpEnabled?: boolean;
  onAudionMcpToggle?: () => void;
  /** Submit prompt from a prompt card (nodeId, prompt). */
  onPromptSubmit?: (nodeId: string, prompt: string) => void;
  /** Create a new prompt card below a result card; optional initialPrompt is submitted on the new card. */
  onAddPromptBelowResult?: (resultNodeId: string, initialPrompt?: string) => void;
  /** Results per prismion id (for result cards). */
  prismionResults?: Record<string, PrismionResultItem[]>;
  /** Card IDs extracted from a thread (rendered as top-level nodes). */
  extractedCardIds?: string[];
  /** Called when a nested card is dragged out or extracted onto the board. */
  onExtractFromThread?: (nodeId: string, position: { x: number; y: number }) => void;
  className?: string;
  style?: React.CSSProperties;
}

function getFirstResultText(results: PrismionResultItem[] | undefined): string | undefined {
  if (!results?.length) return undefined;
  const first = results[0];
  if (first.type === 'text' || first.type === 'richtext') return first.content;
  return undefined;
}

function prismionToNode(
  p: Prismion,
  selected: boolean,
  prismionResults?: Record<string, PrismionResultItem[]>
): Node {
  const isTool = p.kind === 'tool';
  const isResultCard = p.id.startsWith('result-');
  const label = p.title || (p.prompt ? String(p.prompt).slice(0, 40) + (p.prompt.length > 40 ? '…' : '') : p.id);
  const resultContent = isResultCard ? getFirstResultText(prismionResults?.[p.id]) : undefined;
  return {
    id: p.id,
    type: isTool ? NODE_TYPE_TOOL : NODE_TYPE_PROMPT,
    position: { x: p.position.x, y: p.position.y },
    width: p.size.w,
    height: p.size.h,
    data: {
      label,
      title: p.title,
      prompt: p.prompt,
      resultContent,
      minResizeWidth: p.size.minW,
      minResizeHeight: p.size.minH,
      cardColor: (p as Prismion & { backgroundColor?: string }).backgroundColor,
    },
    style: {
      width: p.size.w,
      ...(isResultCard ? { height: 'auto' as const, minHeight: p.size.h } : { height: p.size.h }),
      minWidth: p.size.minW,
      minHeight: p.size.minH,
      ...(isTool
        ? {
            background: (p as Prismion & { backgroundColor?: string }).backgroundColor ?? '#fff',
            border: selected ? `2px solid ${MSQDX_BRAND_COLOR_CSS}` : `1px solid ${MSQDX_NEUTRAL[200]}`,
            borderRadius: '50%',
            boxShadow: MSQDX_EFFECTS.shadows.lg,
          }
        : {
            background: 'transparent',
            border: 'none',
            borderRadius: 0,
            boxShadow: 'none',
          }),
      padding: 0,
      overflow: 'visible',
    },
    selected,
  };
}

function connectionToEdge(c: BoardConnection): Edge {
  return {
    id: c.id,
    source: c.fromPrismionId,
    target: c.toPrismionId,
    sourceHandle: c.fromPort ?? 'right',
    targetHandle: c.toPort ?? 'left',
    type: 'floating',
    animated: false,
    data: { direction: c.direction ?? 'forward' },
    markerEnd: c.direction === 'backward' ? undefined : { type: 'arrowclosed' },
    markerStart: c.direction === 'backward' ? { type: 'arrowclosed' } : undefined,
    style: { strokeWidth: c.strokeWidth ?? 2 },
  };
}

const MENU_ACTIONS: { key: PortMenuKind; label: string; Icon: React.ComponentType<{ size?: number }>; color: string }[] = [
  { key: 'prompt', label: 'Prompt', Icon: MessageSquare, color: '#2563eb' },
  { key: 'file', label: 'Dokument', Icon: FileText, color: MSQDX_NEUTRAL[600] },
  { key: 'image', label: 'Bild', Icon: Image, color: '#16a34a' },
  { key: 'video', label: 'Video', Icon: Video, color: MSQDX_BRAND_PRIMARY.purple },
  { key: 'link', label: 'Link', Icon: LinkIcon, color: MSQDX_BRAND_PRIMARY.orange },
];

function PortCircleMenu({
  x,
  y,
  side,
  onAction,
  onClose,
  showCheckionMcpOption,
  checkionMcpEnabled,
  onCheckionMcpToggle,
  showAudionMcpOption,
  audionMcpEnabled,
  onAudionMcpToggle,
}: {
  x: number;
  y: number;
  side: PortSide;
  onAction: (kind: PortMenuKind) => void;
  onClose: () => void;
  showCheckionMcpOption?: boolean;
  checkionMcpEnabled?: boolean;
  onCheckionMcpToggle?: () => void;
  showAudionMcpOption?: boolean;
  audionMcpEnabled?: boolean;
  onAudionMcpToggle?: () => void;
}) {
  const getStartDeg = (s: PortSide): number => {
    switch (s) {
      case 'top': return -170;
      case 'right': return -80;
      case 'bottom': return 10;
      case 'left': return 100;
    }
  };
  const startDeg = getStartDeg(side);
  const spanDeg = 160;
  const actions = [
    ...MENU_ACTIONS,
    ...(showCheckionMcpOption ? [{ key: 'checkion' as const, label: 'CHECKION', Icon: Plug, color: MSQDX_BRAND_COLOR_CSS }] : []),
    ...(showAudionMcpOption ? [{ key: 'audion' as const, label: 'AUDION', Icon: Plug, color: MSQDX_BRAND_COLOR_CSS }] : []),
  ];
  const count = actions.length;
  const step = count > 1 ? spanDeg / (count - 1) : 0;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as globalThis.Node | null;
      if (ref.current && target && !ref.current.contains(target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      }}
    >
      {actions.map((action, idx) => {
        const angleDeg = startDeg + idx * step;
        const angleRad = (angleDeg * Math.PI) / 180;
        const tx = Math.cos(angleRad) * MENU_RADIUS;
        const ty = Math.sin(angleRad) * MENU_RADIUS;
        const isCheckion = action.key === 'checkion';
        const isAudion = action.key === 'audion';
        const isMcpToggle = isCheckion || isAudion;
        const mcpEnabled = isCheckion ? checkionMcpEnabled : isAudion ? audionMcpEnabled : false;
        const mcpLabel = isCheckion ? 'CHECKION MCP' : isAudion ? 'AUDION MCP' : action.label;
        return (
          <button
            key={action.key}
            type="button"
            onClick={() => {
              if (isCheckion) onCheckionMcpToggle?.();
              else if (isAudion) onAudionMcpToggle?.();
              else if (!isMcpToggle) onAction(action.key);
              onClose();
            }}
            title={isMcpToggle ? (mcpEnabled ? `${mcpLabel} an` : `${mcpLabel} aus`) : action.label}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: PORT_MENU_BUTTON_SIZE,
              height: PORT_MENU_BUTTON_SIZE,
              marginLeft: -PORT_MENU_BUTTON_SIZE / 2 + tx,
              marginTop: -PORT_MENU_BUTTON_SIZE / 2 + ty,
              borderRadius: '50%',
              background: MSQDX_BRAND_COLOR_CSS,
              border: `2px solid ${MSQDX_NEUTRAL[100]}`,
              boxShadow: MSQDX_EFFECTS.shadows.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              ...(isMcpToggle && mcpEnabled && {
                background: 'color-mix(in srgb, var(--color-theme-accent, #00ca55) 18%, transparent)',
                borderColor: 'var(--color-theme-accent, #00ca55)',
              }),
            }}
          >
            <action.Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}

type NodeData = {
  label?: string;
  title?: string;
  prompt?: string;
  /** First result text for result cards (id starts with result-). */
  resultContent?: string;
  /** Right-click on port opens circle menu; no conflict with drag (left-drag = connect). */
  onHandleContextMenu?: (handleId: PortSide, e: React.MouseEvent) => void;
  /** Submit prompt from this card (prompt text). */
  onPromptSubmit?: (prompt: string) => void;
  /** Create prompt card below this result card; if initialPrompt is set, submit it on the new card. */
  onAddPromptBelowResult?: (resultNodeId: string, initialPrompt?: string) => void;
  /** When true, target handles are on top so dropping a connection works; when false, source on top so starting works. */
  isConnecting?: boolean;
  /** Min size for NodeResizer (from prismion.size). */
  minResizeWidth?: number;
  minResizeHeight?: number;
  /** Card toolbar: delete (and optional lock/archive). When set, PrismionToolbar is shown top-right. */
  onCardDelete?: () => void;
  /** Card background color (hex). When set, color picker is shown and card uses this color. */
  cardColor?: string;
  /** Called when user picks a new card color. */
  onCardColorChange?: (color: string) => void;
  /** Called when user saves edited result content (HTML string). */
  onResultContentChange?: (content: string) => void;
  /** True when this card is nested inside a parent prompt (show "Auf Board ziehen"). */
  isNested?: boolean;
  /** Extract this card from the thread onto the board (position is computed by the board). */
  onExtractToBoard?: () => void;
  /** When set, this node is a thread root: render these as real DOM children (prompt > result + prompt). */
  nestedChildren?: NodeData[];
  /** React Flow node id (prismion id); set for nested children so keys and callbacks work. */
  nodeId?: string;
  /** Thread root only: last result card id in this thread, for adding a new prompt below via trailing card. */
  lastResultIdInThread?: string;
  /** Thread root only: computed width/height so the container can wrap and React Flow can sync. */
  threadWidth?: number;
  threadHeight?: number;
  /** True when this node is the single container card (thread); only the container has tools/lines/connections; inner cards are just nested content. */
  isThreadContainer?: boolean;
};

function PortHandles({ data, visible }: { data: NodeData; visible: boolean }) {
  const onHandleContextMenu = data.onHandleContextMenu;
  const isConnecting = data.isConnecting ?? false;
  const sourceZ = isConnecting ? 25 : 35;
  const targetZ = isConnecting ? 35 : 25;
  const showHandles = visible || isConnecting;
  const handleSizeStyle: React.CSSProperties = {
    width: PORT_SIZE,
    height: PORT_SIZE,
    borderRadius: '50%',
    border: `2px solid ${MSQDX_NEUTRAL[100]}`,
    boxShadow: MSQDX_EFFECTS.shadows.sm,
    cursor: 'crosshair',
    opacity: showHandles ? 1 : 0,
    pointerEvents: showHandles ? 'auto' : 'none',
    transition: 'opacity 0.15s ease',
  };
  return (
    <>
      {HANDLE_IDS.map((id) => (
        <Handle
          key={id}
          type="source"
          position={HANDLE_POSITIONS[id]}
          id={id}
          title="Ziehen zum Verbinden · Rechtsklick: Menü"
          onContextMenu={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onHandleContextMenu?.(id, e);
          }}
          style={{
            ...handleSizeStyle,
            zIndex: sourceZ,
            background: MSQDX_BRAND_COLOR_CSS,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={14} color="#fff" style={{ pointerEvents: 'none', flexShrink: 0 }} />
        </Handle>
      ))}
      {HANDLE_IDS.map((id) => (
        <Handle
          key={`t-${id}`}
          type="target"
          position={HANDLE_POSITIONS[id]}
          id={id}
          style={{
            width: PORT_SIZE,
            height: PORT_SIZE,
            borderRadius: '50%',
            zIndex: targetZ,
            background: 'transparent',
            border: 'none',
            opacity: showHandles ? 1 : 0,
            pointerEvents: showHandles ? 'auto' : 'none',
            transition: 'opacity 0.15s ease',
          }}
        />
      ))}
    </>
  );
}

function CardNode({ data, selected, id }: { data: NodeData; selected?: boolean; id?: string }) {
  const [promptInput, setPromptInput] = useState('');
  const [cardHovered, setCardHovered] = useState(false);
  const [ghostHovered, setGhostHovered] = useState(false);
  const [ghostPromptInput, setGhostPromptInput] = useState('');
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [fontSizeAnchor, setFontSizeAnchor] = useState<HTMLElement | null>(null);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const editAreaRef = useRef<HTMLDivElement>(null);
  const toolbarWrapRef = useRef<HTMLDivElement>(null);
  const isResultCard = !!data.resultContent;

  const editorPresetColors = [
    MSQDX_NEUTRAL[800],
    MSQDX_NEUTRAL[600],
    MSQDX_NEUTRAL[400],
    '#c53030',
    '#2b6cb0',
    '#276749',
    MSQDX_BRAND_COLOR_CSS,
  ];
  const isPromptCard = !!data.onPromptSubmit;
  const isInitialState = !data.prompt || data.prompt.trim() === '';
  const handleSubmit = useCallback(() => {
    const value = promptInput.trim();
    if (value && data.onPromptSubmit) {
      data.onPromptSubmit(value);
      setPromptInput('');
    }
  }, [promptInput, data.onPromptSubmit]);

  const minW = data.minResizeWidth ?? 200;
  const minH = data.minResizeHeight ?? 72;

  const resultContent = data.resultContent ?? '';
  const canEditResult = isResultCard && !!data.onResultContentChange;

  React.useEffect(() => {
    if (!isEditingResult || !editAreaRef.current) return;
    const el = editAreaRef.current;
    if (isHtmlContent(resultContent)) {
      el.innerHTML = resultContent;
    } else {
      el.innerHTML = resultContent ? `<p>${resultContent.replace(/\n/g, '</p><p>')}</p>` : '<p></p>';
    }
    el.focus();
  }, [isEditingResult]);

  const handleResultBlur = useCallback(() => {
    if (!editAreaRef.current || !data.onResultContentChange) return;
    const html = editAreaRef.current.innerHTML.trim();
    if (html) data.onResultContentChange(html);
    setIsEditingResult(false);
  }, [data.onResultContentChange]);

  const handleFormat = useCallback((cmd: string) => {
    document.execCommand(cmd, false);
    editAreaRef.current?.focus();
  }, []);

  const handleFontSize = useCallback((sizePx: number) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      editAreaRef.current?.focus();
      return;
    }
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      editAreaRef.current?.focus();
      return;
    }
    const span = document.createElement('span');
    span.style.fontSize = `${sizePx}px`;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    } catch {
      // ignore
    }
    editAreaRef.current?.focus();
  }, []);

  const handleForeColor = useCallback((hex: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, hex);
    editAreaRef.current?.focus();
  }, []);

  // Trailing prompt input state for thread (blank card at end)
  const [trailingPromptInput, setTrailingPromptInput] = useState('');

  // Container card: only this card has tools, resize, connections; inner cards are just nested content (no handles/lines).
  if (data.isThreadContainer) {
    const threadW = data.threadWidth;
    const threadH = data.threadHeight;
    const isEmptyThread = !data.nestedChildren?.length;
    if (isEmptyThread) {
      const minW = data.minResizeWidth ?? 200;
      const minH = data.minResizeHeight ?? 72;
      return (
        <Box
          className="board-thread-container"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: `${THREAD_GAP_PX}px`,
            position: 'relative',
            width: threadW != null ? `${threadW}px` : '100%',
            height: threadH != null ? `${threadH}px` : '100%',
            minWidth: threadW ?? 280,
            minHeight: threadH ?? PROMPT_CARD_H_PX + 24,
            overflow: 'visible',
            background: data.cardColor ?? '#fff',
            border: selected ? `2px solid ${MSQDX_BRAND_COLOR_CSS}` : `1px solid ${MSQDX_NEUTRAL[200]}`,
            boxShadow: MSQDX_EFFECTS.shadows.lg,
            borderRadius: '32px',
            padding: 2,
            boxSizing: 'border-box',
          }}
          onMouseEnter={() => setCardHovered(true)}
          onMouseLeave={() => setCardHovered(false)}
        >
          <NodeResizer minWidth={minW} minHeight={minH} isVisible={selected} color={MSQDX_BRAND_COLOR_CSS} lineClassName="nodrag nopan" handleClassName="nodrag nopan" />
          {(data.onCardDelete || data.onCardColorChange) && (
            <Box ref={toolbarWrapRef} className="nodrag nopan" sx={{ position: 'absolute', top: -4, right: -4, zIndex: 10, pointerEvents: 'auto', transform: 'scale(1.15)', transformOrigin: 'top right', overflow: 'visible', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MsqdxPrismionToolbar
                onDelete={data.onCardDelete}
                {...({ onColorClick: data.onCardColorChange ? () => setColorPickerAnchor(toolbarWrapRef.current) : undefined } as React.ComponentProps<typeof MsqdxPrismionToolbar>)}
                onBranch={() => {}}
                onMerge={() => {}}
                onLockToggle={() => {}}
                onArchive={() => {}}
              />
              {data.onCardColorChange && (
                <Popover open={!!colorPickerAnchor} anchorEl={colorPickerAnchor} onClose={() => setColorPickerAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { p: 1.5 } } }}>
                  <input type="color" value={data.cardColor ?? '#ffffff'} onChange={(e) => data.onCardColorChange?.(e.target.value)} style={{ width: 48, height: 32, border: 'none', cursor: 'pointer', borderRadius: 4 }} onClick={(e) => e.stopPropagation()} />
                </Popover>
              )}
            </Box>
          )}
          <PortHandles data={data} visible={cardHovered} />
          <div className="board-card-wrap" style={{ position: 'relative', width: '100%', minHeight: PROMPT_CARD_H_PX, borderRadius: 0, overflow: 'visible' }}>
            <Box sx={{ position: 'absolute', inset: 0, background: '#fff', border: `1px solid ${MSQDX_NEUTRAL[200]}`, boxShadow: MSQDX_EFFECTS.shadows.lg, borderRadius: '32px', pointerEvents: 'none' }} />
            <Box className="board-card-inner nodrag nopan" sx={{ position: 'relative', zIndex: 1, padding: 1.5, width: '100%', minHeight: 60, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ minHeight: 16, flexShrink: 0 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MsqdxInput className="nodrag nopan" value={promptInput} onChange={(e) => setPromptInput((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} placeholder="Weiterer Prompt…" fullWidth size="small" sx={{ '& input': { fontSize: MSQDX_TYPOGRAPHY.fontSize['2xs'] } }} />
                <MsqdxIconButton className="nodrag nopan" size="xs" onClick={handleSubmit} aria-label="Senden" sx={{ boxShadow: 'none', minWidth: 28, minHeight: 28, width: 28, height: 28, color: MSQDX_BRAND_COLOR_CSS, '&:hover': { boxShadow: 'none', backgroundColor: 'transparent' } }}>
                  <MsqdxIcon name="Send" size="sm" />
                </MsqdxIconButton>
              </Box>
            </Box>
          </div>
        </Box>
      );
    }
  }

  // Thread container with children: root (read-only) + nestedChildren + trailing prompt
  if (data.isThreadContainer && data.nestedChildren && data.nestedChildren.length > 0) {
    const lastResultId = data.lastResultIdInThread;
    const anchorId = lastResultId ?? id ?? '';
    const handleTrailingSubmit = () => {
      if (!anchorId || !data.onAddPromptBelowResult) return;
      data.onAddPromptBelowResult(anchorId, trailingPromptInput.trim() || undefined);
      setTrailingPromptInput('');
    };
    const threadW = data.threadWidth;
    const threadH = data.threadHeight;
    return (
      <Box
        className="board-thread-container"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: `${THREAD_GAP_PX}px`,
          position: 'relative',
          width: threadW != null ? `${threadW}px` : '100%',
          height: threadH != null ? `${threadH}px` : '100%',
          minWidth: threadW != null ? threadW : undefined,
          minHeight: threadH != null ? threadH : undefined,
          overflow: 'visible',
          background: data.cardColor ?? '#fff',
          border: selected ? `2px solid ${MSQDX_BRAND_COLOR_CSS}` : `1px solid ${MSQDX_NEUTRAL[200]}`,
          boxShadow: MSQDX_EFFECTS.shadows.lg,
          borderRadius: '32px',
          padding: 2,
          boxSizing: 'border-box',
        }}
        onMouseEnter={() => setCardHovered(true)}
        onMouseLeave={() => setCardHovered(false)}
      >
        <NodeResizer
          minWidth={minW}
          minHeight={minH}
          isVisible={selected}
          color={MSQDX_BRAND_COLOR_CSS}
          lineClassName="nodrag nopan"
          handleClassName="nodrag nopan"
        />
        {(data.onCardDelete || data.onCardColorChange) && (
          <Box ref={toolbarWrapRef} className="nodrag nopan" sx={{ position: 'absolute', top: -4, right: -4, zIndex: 10, pointerEvents: 'auto', transform: 'scale(1.15)', transformOrigin: 'top right', overflow: 'visible', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MsqdxPrismionToolbar
              onDelete={data.onCardDelete}
              {...({ onColorClick: data.onCardColorChange ? () => setColorPickerAnchor(toolbarWrapRef.current) : undefined } as React.ComponentProps<typeof MsqdxPrismionToolbar>)}
              onBranch={() => {}}
              onMerge={() => {}}
              onLockToggle={() => {}}
              onArchive={() => {}}
            />
            {data.onCardColorChange && (
              <Popover open={!!colorPickerAnchor} anchorEl={colorPickerAnchor} onClose={() => setColorPickerAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { p: 1.5 } } }}>
                <input type="color" value={data.cardColor ?? '#ffffff'} onChange={(e) => data.onCardColorChange?.(e.target.value)} style={{ width: 48, height: 32, border: 'none', cursor: 'pointer', borderRadius: 4 }} onClick={(e) => e.stopPropagation()} />
              </Popover>
            )}
          </Box>
        )}
        <PortHandles data={data} visible={cardHovered} />
        <div
          className="board-card-wrap"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: PROMPT_CARD_H_PX,
            maxHeight: PROMPT_CARD_H_PX + 32,
            borderRadius: 0,
            overflow: 'visible',
          }}
        >
          <Box className="board-card-inner" onClick={(e) => e.stopPropagation()} sx={{ position: 'relative', zIndex: 1, padding: 1.5, paddingTop: 0.25, width: '100%', minHeight: PROMPT_CARD_H_PX - 24, boxSizing: 'border-box', overflow: 'hidden', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Box
              className="nodrag nopan"
              component="div"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_PRISMION_ID_KEY, id ?? '');
                e.dataTransfer.effectAllowed = 'move';
              }}
              sx={{ minHeight: 16, marginLeft: -0.5, marginRight: -0.5, marginTop: -0.5, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '10px 10px 0 0', '&:active': { cursor: 'grabbing' } }}
            >
              <Box sx={{ width: 28, height: 4, borderRadius: 2, bgcolor: MSQDX_NEUTRAL[300], opacity: 0.7 }} />
            </Box>
            <Box sx={{ fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono, fontSize: MSQDX_TYPOGRAPHY.fontSize.sm, color: (data.prompt?.trim() ?? '') ? MSQDX_NEUTRAL[800] : MSQDX_NEUTRAL[400], whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {(data.prompt?.trim() ?? '') || '\u00A0'}
            </Box>
          </Box>
        </div>
        {data.nestedChildren.map((c) => (
          <div
            key={c.nodeId ?? c.title ?? ''}
            className="board-card-wrap"
            style={{
              position: 'relative',
              width: '100%',
              minHeight: c.resultContent ? 100 : 72,
              borderRadius: 0,
              overflow: 'visible',
            }}
          >
            <Box sx={{ position: 'absolute', inset: 0, background: c.cardColor ?? '#fff', border: `1px solid ${MSQDX_NEUTRAL[200]}`, boxShadow: MSQDX_EFFECTS.shadows.lg, padding: 0, pointerEvents: 'none', borderRadius: '32px', cornerShape: 'round scoop round round' }} />
            <Box className="board-card-inner" sx={{ position: 'relative', zIndex: 1, padding: 1.5, width: '100%', minHeight: 60, boxSizing: 'border-box', overflow: 'hidden', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box
                className="nodrag nopan"
                component="div"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_PRISMION_ID_KEY, c.nodeId ?? '');
                  e.dataTransfer.effectAllowed = 'move';
                }}
                sx={{ minHeight: 16, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, '&:active': { cursor: 'grabbing' } }}
              >
                <Box sx={{ width: 28, height: 4, borderRadius: 2, bgcolor: MSQDX_NEUTRAL[300], opacity: 0.7 }} />
              </Box>
              {c.resultContent != null ? (
                <Box sx={{ fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono, fontSize: MSQDX_TYPOGRAPHY.fontSize.sm, color: MSQDX_NEUTRAL[800] }}>
                  {isHtmlContent(c.resultContent) ? (
                    <Box component="div" sx={{ fontFamily: 'inherit', fontSize: 'inherit', '& p, & span, & li': { fontFamily: 'inherit' }, '& p': { margin: '0 0 0.35em 0' }, '& ul, & ol': { margin: '0.35em 0', paddingLeft: 2 } }} dangerouslySetInnerHTML={{ __html: sanitizeCardContentHtml(c.resultContent) }} />
                  ) : (
                    <MarkdownContent content={c.resultContent} />
                  )}
                </Box>
              ) : (
                <Box sx={{ fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono, fontSize: MSQDX_TYPOGRAPHY.fontSize.sm, color: (c.prompt?.trim() ?? '') ? MSQDX_NEUTRAL[800] : MSQDX_NEUTRAL[400], whiteSpace: 'pre-wrap', minHeight: 24 }}>
                  {(c.prompt?.trim() ?? '') || (c.title?.trim() ?? '') || '\u00A0'}
                </Box>
              )}
            </Box>
          </div>
        ))}
        {data.onAddPromptBelowResult && (
          <div
            className="board-card-wrap board-thread-trailing-prompt"
            style={{ position: 'relative', width: '100%', minHeight: PROMPT_CARD_H_PX, borderRadius: 0, overflow: 'visible' }}
          >
            <Box sx={{ position: 'absolute', inset: 0, background: '#fff', border: `1px solid ${MSQDX_NEUTRAL[200]}`, boxShadow: MSQDX_EFFECTS.shadows.lg, borderRadius: '32px', pointerEvents: 'none' }} />
            <Box className="board-card-inner nodrag nopan" sx={{ position: 'relative', zIndex: 1, padding: 1.5, width: '100%', minHeight: 60, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ minHeight: 16, flexShrink: 0 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MsqdxInput className="nodrag nopan" value={trailingPromptInput} onChange={(e) => setTrailingPromptInput((e.target as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && handleTrailingSubmit()} placeholder="Weiterer Prompt…" fullWidth size="small" sx={{ '& input': { fontSize: MSQDX_TYPOGRAPHY.fontSize['2xs'] } }} />
                <MsqdxIconButton className="nodrag nopan" size="xs" onClick={handleTrailingSubmit} aria-label="Senden" sx={{ boxShadow: 'none', minWidth: 28, minHeight: 28, width: 28, height: 28, color: MSQDX_BRAND_COLOR_CSS, '&:hover': { boxShadow: 'none', backgroundColor: 'transparent' } }}>
                  <MsqdxIcon name="Send" size="sm" />
                </MsqdxIconButton>
              </Box>
            </Box>
          </div>
        )}
      </Box>
    );
  }

  return (
    <div
      className="board-card-wrap"
      style={{
        position: 'relative',
        width: '100%',
        height: isResultCard ? 'auto' : '100%',
        minHeight: isResultCard ? 100 : undefined,
        borderRadius: 0,
        overflow: 'visible',
      }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      <NodeResizer
        minWidth={minW}
        minHeight={minH}
        isVisible={selected}
        color={MSQDX_BRAND_COLOR_CSS}
        lineClassName="nodrag nopan"
        handleClassName="nodrag nopan"
      />
      {(data.onCardDelete || data.onCardColorChange || data.onExtractToBoard) && (
        <Box
          ref={toolbarWrapRef}
          className="nodrag nopan"
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            zIndex: 10,
            pointerEvents: 'auto',
            transform: 'scale(1.15)',
            transformOrigin: 'top right',
            overflow: 'visible',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {data.isNested && data.onExtractToBoard && (
            <MsqdxIconButton
              size="xs"
              onClick={() => data.onExtractToBoard?.()}
              title="Auf Board ziehen"
              aria-label="Auf Board ziehen"
              sx={{
                backgroundColor: MSQDX_BRAND_COLOR_CSS,
                color: '#fff',
                border: `2px solid ${MSQDX_NEUTRAL[100]}`,
                boxShadow: MSQDX_EFFECTS.shadows.sm,
                '&:hover': { backgroundColor: MSQDX_BRAND_COLOR_CSS, opacity: 0.9 },
              }}
            >
              <Move size={14} />
            </MsqdxIconButton>
          )}
          <MsqdxPrismionToolbar
            onDelete={data.onCardDelete}
            {...({
              onColorClick: data.onCardColorChange
                ? () => setColorPickerAnchor(toolbarWrapRef.current)
                : undefined,
            } as React.ComponentProps<typeof MsqdxPrismionToolbar>)}
            onBranch={() => {}}
            onMerge={() => {}}
            onLockToggle={() => {}}
            onArchive={() => {}}
          />
          {data.onCardColorChange && (
            <Popover
              open={!!colorPickerAnchor}
              anchorEl={colorPickerAnchor}
              onClose={() => setColorPickerAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { p: 1.5 } } }}
            >
              <input
                type="color"
                value={data.cardColor ?? '#ffffff'}
                onChange={(e) => data.onCardColorChange?.(e.target.value)}
                style={{ width: 48, height: 32, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                onClick={(e) => e.stopPropagation()}
              />
            </Popover>
          )}
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: data.cardColor ?? '#fff',
          border: selected ? `2px solid ${MSQDX_BRAND_COLOR_CSS}` : `1px solid ${MSQDX_NEUTRAL[200]}`,
          boxShadow: MSQDX_EFFECTS.shadows.lg,
          padding: 0,
          pointerEvents: 'none',
          borderRadius: '32px',
          // CSS corner-shape: only top-right = scoop (concave), others round (MDN corner-shape)
          cornerShape: 'round scoop round round',
        }}
      />
      <Box
        className="board-card-inner"
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'relative',
          zIndex: 1,
          padding: 1.5,
          paddingTop: isPromptCard ? 0.25 : 0.5,
          ...(isResultCard && { paddingLeft: 2, paddingRight: 2 }),
          width: '100%',
          height: isResultCard ? 'auto' : '100%',
          minHeight: isResultCard ? 100 : undefined,
          boxSizing: 'border-box',
          overflow: 'hidden',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: isPromptCard ? 0.25 : 1,
          ...(isPromptCard && { justifyContent: 'flex-start' }),
        }}
      >
        {/* Drag handle: compact strip at top for dragging (no nodrag = node drags from here) */}
        <Box
          aria-label="Ziehen zum Verschieben"
          sx={{
            minHeight: isPromptCard ? 16 : 28,
            marginBottom: isPromptCard ? 0 : 0.25,
            marginLeft: -0.5,
            marginRight: -0.5,
            marginTop: -0.5,
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: '10px 10px 0 0',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 4,
              borderRadius: 2,
              bgcolor: MSQDX_NEUTRAL[300],
              opacity: 0.7,
            }}
          />
        </Box>
        {isResultCard ? (
          <>
            <Box
              className="nodrag nopan board-card-content"
              sx={{
                color: MSQDX_NEUTRAL[800],
                fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
                fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
                borderRadius: 0,
                overflow: 'visible',
                minHeight: 60,
              }}
            >
              {isEditingResult ? (
                <>
                  <Box
                    className="board-card-editor-toolbar"
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      mb: 0.5,
                      flexWrap: 'wrap',
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <MsqdxIconButton size="xs" onClick={() => handleFormat('bold')} title="Fett" sx={{ minWidth: 28, height: 28 }}>
                      <Bold size={14} />
                    </MsqdxIconButton>
                    <MsqdxIconButton size="xs" onClick={() => handleFormat('italic')} title="Kursiv" sx={{ minWidth: 28, height: 28 }}>
                      <Italic size={14} />
                    </MsqdxIconButton>
                    <MsqdxIconButton size="xs" onClick={() => handleFormat('underline')} title="Unterstrichen" sx={{ minWidth: 28, height: 28 }}>
                      <Underline size={14} />
                    </MsqdxIconButton>
                    <MsqdxIconButton
                      size="xs"
                      title="Schriftgröße"
                      sx={{ minWidth: 28, height: 28 }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFontSizeAnchor(e.currentTarget as HTMLElement);
                      }}
                    >
                      <Type size={14} />
                    </MsqdxIconButton>
                    <Popover
                      open={!!fontSizeAnchor}
                      anchorEl={fontSizeAnchor}
                      onClose={() => setFontSizeAnchor(null)}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                      slotProps={{ paper: { sx: { mt: 0.5 } } }}
                      disableAutoFocus
                      disableEnforceFocus
                      disableRestoreFocus
                    >
                      <Box onMouseDown={(e) => e.preventDefault()} sx={{ p: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        {([12, 14, 16] as const).map((px) => (
                          <Box
                            key={px}
                            component="button"
                            type="button"
                            tabIndex={-1}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFontSize(px);
                              setFontSizeAnchor(null);
                            }}
                            sx={{
                              fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
                              fontSize: px === 12 ? MSQDX_TYPOGRAPHY.fontSize.xs : px === 14 ? MSQDX_TYPOGRAPHY.fontSize.sm : MSQDX_TYPOGRAPHY.fontSize.base,
                              padding: '4px 8px',
                              textAlign: 'left',
                              border: 'none',
                              borderRadius: 1,
                              cursor: 'pointer',
                              bgcolor: 'transparent',
                              '&:hover': { bgcolor: MSQDX_NEUTRAL[100] },
                            }}
                          >
                            {px === 12 ? 'Klein' : px === 14 ? 'Normal' : 'Groß'} ({px}px)
                          </Box>
                        ))}
                      </Box>
                    </Popover>
                    <MsqdxIconButton
                      size="xs"
                      title="Textfarbe"
                      sx={{ minWidth: 28, height: 28 }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setColorAnchor(e.currentTarget as HTMLElement);
                      }}
                    >
                      <Palette size={14} />
                    </MsqdxIconButton>
                    <Popover
                      open={!!colorAnchor}
                      anchorEl={colorAnchor}
                      onClose={() => setColorAnchor(null)}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                      slotProps={{ paper: { sx: { mt: 0.5 } } }}
                      disableAutoFocus
                      disableEnforceFocus
                      disableRestoreFocus
                    >
                      <Box onMouseDown={(e) => e.preventDefault()} sx={{ p: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 160 }}>
                        {editorPresetColors.map((hex) => (
                          <Box
                            key={hex}
                            component="button"
                            type="button"
                            tabIndex={-1}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleForeColor(hex);
                              setColorAnchor(null);
                            }}
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: 1,
                              bgcolor: hex,
                              border: `2px solid ${MSQDX_NEUTRAL[300]}`,
                              cursor: 'pointer',
                              '&:hover': { borderColor: MSQDX_BRAND_COLOR_CSS },
                            }}
                          />
                        ))}
                      </Box>
                    </Popover>
                  </Box>
                  <Box
                    ref={editAreaRef}
                    component="div"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={handleResultBlur}
                    sx={{
                      outline: 'none',
                      minHeight: 40,
                      fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
                      fontFamily: `${MSQDX_TYPOGRAPHY.fontFamily.mono} !important`,
                      '& p, & span, & div': { fontFamily: 'inherit' },
                      '& p': { margin: '0 0 0.35em 0' },
                      '& p:last-child': { marginBottom: 0 },
                    }}
                  />
                </>
              ) : (
                <Box
                  onDoubleClick={(e) => {
                    if (canEditResult) {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEditingResult(true);
                    }
                  }}
                  sx={{
                    fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
                    fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
                    cursor: canEditResult ? 'text' : 'default',
                    userSelect: 'text',
                    '&:hover': canEditResult ? { outline: '1px dashed ' + MSQDX_NEUTRAL[300], outlineOffset: 2, borderRadius: 4 } : undefined,
                  }}
                  title={canEditResult ? 'Doppelklick zum Bearbeiten' : undefined}
                >
                  {isHtmlContent(resultContent) ? (
                    <Box
                      component="div"
                      sx={{
                        fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
                        fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
                        '& p, & span, & li': { fontFamily: 'inherit' },
                        '& p': { margin: '0 0 0.35em 0' },
                        '& ul, & ol': { margin: '0.35em 0', paddingLeft: 2 },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeCardContentHtml(resultContent),
                      }}
                    />
                  ) : (
                    <MarkdownContent content={resultContent} />
                  )}
                </Box>
              )}
            </Box>
            {data.onAddPromptBelowResult && id && (
              <Box
                className="nodrag nopan"
                onMouseEnter={() => setGhostHovered(true)}
                onMouseLeave={() => setGhostHovered(false)}
                sx={{
                  marginTop: CARD_GAP_PX,
                  width: '100%',
                  minHeight: PROMPT_CARD_H_PX,
                  borderRadius: CARD_BORDER_RADIUS_PX,
                  border: `1px solid ${MSQDX_NEUTRAL[200]}`,
                  boxShadow: MSQDX_EFFECTS.shadows.lg,
                  bgcolor: '#fff',
                  opacity: ghostHovered ? 1 : 0.5,
                  overflow: 'hidden',
                  transition: 'opacity 0.15s ease',
                  boxSizing: 'border-box',
                  padding: 1.5,
                  paddingTop: 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                {/* Same drag-handle strip as real prompt card */}
                <Box
                  sx={{
                    minHeight: 28,
                    marginBottom: 0.25,
                    marginLeft: -0.5,
                    marginRight: -0.5,
                    marginTop: -0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    borderRadius: '10px 10px 0 0',
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: MSQDX_NEUTRAL[300],
                      opacity: 0.7,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MsqdxInput
                    className="nodrag nopan"
                    value={ghostPromptInput}
                    onChange={(e) => setGhostPromptInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      const value = ghostPromptInput.trim();
                      data.onAddPromptBelowResult?.(id, value || undefined);
                      setGhostPromptInput('');
                    }}
                    placeholder="Enter your prompt..."
                    fullWidth
                    size="small"
                    sx={{ '& input': { fontSize: MSQDX_TYPOGRAPHY.fontSize['2xs'] } }}
                  />
                  <MsqdxIconButton
                    className="nodrag nopan"
                    size="xs"
                    onClick={() => {
                      const value = ghostPromptInput.trim();
                      data.onAddPromptBelowResult?.(id, value || undefined);
                      setGhostPromptInput('');
                    }}
                    aria-label="Senden"
                    sx={{
                      boxShadow: 'none',
                      minWidth: 28,
                      minHeight: 28,
                      width: 28,
                      height: 28,
                      color: MSQDX_BRAND_COLOR_CSS,
                      '&:hover': { boxShadow: 'none', backgroundColor: 'transparent' },
                    }}
                  >
                    <MsqdxIcon name="Send" size="sm" />
                  </MsqdxIconButton>
                </Box>
              </Box>
            )}
          </>
        ) : isPromptCard && (data.prompt?.trim() ?? '') ? (
          /* Prompt card with submitted text: read-only (e.g. after all thread children extracted) */
          <Box sx={{ fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono, fontSize: MSQDX_TYPOGRAPHY.fontSize.sm, color: MSQDX_NEUTRAL[800], whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {data.prompt?.trim() ?? '\u00A0'}
          </Box>
        ) : isPromptCard ? (
          /* Prompt card: input + small round send button, no shadow, brand color icon */
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, margin: 0, marginTop: 0 }}>
            <MsqdxInput
              className="nodrag nopan"
              value={promptInput}
              onChange={(e) => setPromptInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter your prompt..."
              fullWidth
              size="small"
              sx={{ margin: 0, '& input': { fontSize: MSQDX_TYPOGRAPHY.fontSize['2xs'] } }}
            />
            <MsqdxIconButton
              className="nodrag nopan"
              size="xs"
              onClick={handleSubmit}
              aria-label="Senden"
              sx={{
                boxShadow: 'none',
                minWidth: 28,
                minHeight: 28,
                width: 28,
                height: 28,
                color: MSQDX_BRAND_COLOR_CSS,
                '&:hover': { boxShadow: 'none', backgroundColor: 'transparent' },
              }}
            >
              <MsqdxIcon name="Send" size="sm" />
            </MsqdxIconButton>
          </Box>
        ) : (
          /* Fallback: title + prompt text */
          <>
            <Box
              component="h3"
              sx={{
                fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
                fontSize: MSQDX_TYPOGRAPHY.fontSize.xs,
                fontWeight: 600,
                color: MSQDX_NEUTRAL[900],
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {data.title || data.label || 'Prompt'}
            </Box>
            {!isInitialState && (
              <Box
                sx={{
                  fontSize: MSQDX_TYPOGRAPHY.fontSize['2xs'],
                  fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
                  color: MSQDX_NEUTRAL[700],
                  whiteSpace: 'pre-wrap',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                }}
              >
                {data.prompt}
              </Box>
            )}
          </>
        )}
      </Box>
      <PortHandles data={data} visible={cardHovered} />
    </div>
  );
}

function ToolNode({ data, selected }: { data: NodeData; selected?: boolean }) {
  const [cardHovered, setCardHovered] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
  const toolbarWrapRef = useRef<HTMLDivElement>(null);
  const minS = Math.max(data.minResizeWidth ?? 40, data.minResizeHeight ?? 40);
  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'visible' }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      <NodeResizer
        minWidth={minS}
        minHeight={minS}
        isVisible={selected}
        color={MSQDX_BRAND_COLOR_CSS}
        keepAspectRatio
        lineClassName="nodrag nopan"
        handleClassName="nodrag nopan"
      />
      {(data.onCardDelete || data.onCardColorChange) && (
        <Box
          ref={toolbarWrapRef}
          className="nodrag nopan"
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            zIndex: 10,
            pointerEvents: 'auto',
            overflow: 'visible',
          }}
        >
          <MsqdxPrismionToolbar
            onDelete={data.onCardDelete}
            {...({
              onColorClick: data.onCardColorChange
                ? () => setColorPickerAnchor(toolbarWrapRef.current)
                : undefined,
            } as React.ComponentProps<typeof MsqdxPrismionToolbar>)}
            onBranch={() => {}}
            onMerge={() => {}}
            onLockToggle={() => {}}
            onArchive={() => {}}
          />
          {data.onCardColorChange && (
            <Popover
              open={!!colorPickerAnchor}
              anchorEl={colorPickerAnchor}
              onClose={() => setColorPickerAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { p: 1.5 } } }}
            >
              <input
                type="color"
                value={data.cardColor ?? '#ffffff'}
                onChange={(e) => data.onCardColorChange?.(e.target.value)}
                style={{ width: 48, height: 32, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                onClick={(e) => e.stopPropagation()}
              />
            </Popover>
          )}
        </Box>
      )}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
          fontSize: MSQDX_TYPOGRAPHY.fontSize['2xs'],
          fontWeight: 600,
          color: MSQDX_NEUTRAL[700],
        }}
      >
        {data.label || 'MCP'}
      </div>
      <PortHandles data={data} visible={cardHovered} />
    </div>
  );
}

const nodeTypes = {
  [NODE_TYPE_PROMPT]: CardNode,
  [NODE_TYPE_TOOL]: ToolNode,
};

function ReactFlowBoardInner({
  prismions,
  connections,
  parentByPrismionId = {},
  selectedPrismionIds = [],
  onSelectPrismion,
  onPrismionMove,
  onPrismionResize,
  onPrismionDelete,
  onPrismionColorChange,
  onResultContentChange,
  onConnectorDelete,
  onConnectorDirectionChange,
  onDoubleClickCell,
  onDoubleClickCanvas,
  onConnectionCreate,
  onConnectorCreatePrismion,
  showCheckionMcpOption = false,
  checkionMcpEnabled = false,
  onCheckionMcpToggle,
  showAudionMcpOption = false,
  audionMcpEnabled = false,
  onAudionMcpToggle,
  onPromptSubmit,
  onAddPromptBelowResult,
  prismionResults,
  extractedCardIds = [],
  onExtractFromThread,
  style = { width: '100%', height: '100%' },
}: ReactFlowBoardProps) {
  const edgeTypes = useMemo(
    () => ({
      floating: (edgeProps: React.ComponentProps<typeof SimpleFloatingEdge>) => (
        <SimpleFloatingEdge {...edgeProps} onDirectionChange={onConnectorDirectionChange} />
      ),
    }),
    [onConnectorDirectionChange]
  );
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const [menuOpen, setMenuOpen] = useState<{ nodeId: string; handleId: PortSide; x: number; y: number } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleHandleContextMenu = useCallback((nodeId: string, handleId: PortSide, e: React.MouseEvent) => {
    setMenuOpen({ nodeId, handleId, x: e.clientX, y: e.clientY });
  }, []);

  const nodes = useMemo(() => {
    const extractedSet = new Set(extractedCardIds ?? []);
    const prismionIds = new Set(prismions.map((p) => p.id));
    const byId = new Map(prismions.map((p) => [p.id, p]));
    const isPromptRoot = (id: string) => id === 'prompt-card' || id.startsWith('prompt-');

    const enrich = (p: Prismion, n: Node, opts?: { isNested?: boolean; extractPosition?: { x: number; y: number }; skipAddPromptBelowResult?: boolean }) => {
      const nodeData: NodeData = {
        ...n.data,
        onHandleContextMenu: (handleId: PortSide, e: React.MouseEvent) => handleHandleContextMenu(p.id, handleId, e),
        onPromptSubmit: (prompt: string) => onPromptSubmit?.(p.id, prompt),
        ...(p.id.startsWith('result-') && onAddPromptBelowResult && !opts?.skipAddPromptBelowResult && { onAddPromptBelowResult }),
        ...(p.id.startsWith('result-') && onResultContentChange && { onResultContentChange: (content: string) => onResultContentChange(p.id, content) }),
        isConnecting,
        minResizeWidth: p.size.minW,
        minResizeHeight: p.size.minH,
        onCardDelete: onPrismionDelete ? () => onPrismionDelete(p.id) : undefined,
        cardColor: (p as Prismion & { backgroundColor?: string }).backgroundColor,
        onCardColorChange: onPrismionColorChange ? (color: string) => onPrismionColorChange(p.id, color) : undefined,
        ...(opts?.isNested && onExtractFromThread && opts?.extractPosition && {
          isNested: true,
          onExtractToBoard: () => onExtractFromThread(p.id, opts.extractPosition!),
        }),
      };
      return { ...n, data: nodeData } as Node<NodeData>;
    };

    const result: Node<NodeData>[] = [];
    const emitted = new Set<string>();

    for (const p of prismions) {
      if ((p as Prismion & { kind?: string }).kind === 'tool') {
        const n = prismionToNode(p, selectedPrismionIds.includes(p.id), prismionResults);
        result.push(enrich(p, n));
        emitted.add(p.id);
        continue;
      }
      if (extractedSet.has(p.id)) {
        const n = prismionToNode(p, selectedPrismionIds.includes(p.id), prismionResults);
        result.push(enrich(p, n, { skipAddPromptBelowResult: true }));
        emitted.add(p.id);
        continue;
      }
      if (isPromptRoot(p.id)) {
        const useParentMap = parentByPrismionId && Object.keys(parentByPrismionId).length > 0;
        const hasNoParent = useParentMap ? !parentByPrismionId[p.id] : getThreadRootId(p.id, connections, prismionIds, prismions) === null;
        const isInitialPrompt = p.id === 'prompt-card';
        const isThreadRoot = hasNoParent || isInitialPrompt;
        if (!isThreadRoot) {
          // Follow-up prompt (e.g. prompt-2): part of another thread; skip building a second thread, fall through to skip logic below
        } else {
        const flattenedSequence = useParentMap
          ? getThreadSequenceFlattened(p.id, parentByPrismionId, prismions)
          : getThreadSequenceFlattenedFromConnections(p.id, connections, prismions);
        const nonExtracted = flattenedSequence.filter((id) => !extractedSet.has(id));
        if (nonExtracted.length > 0) {
          // Real DOM nesting: one node for the whole thread; nestedChildren in conversation order (flat)
          const childIdsLayoutOrder = nonExtracted;
          let parentH = PROMPT_CARD_H_LAYOUT + THREAD_GAP_PX;
          let parentW = p.size.w ?? PROMPT_CARD_W_DEFAULT;
          for (const cid of childIdsLayoutOrder) {
            const cp = byId.get(cid);
            const ch = cp?.size?.h ?? (cid.startsWith('result-') ? RESULT_CARD_H_DEFAULT : PROMPT_CARD_H_LAYOUT);
            const cw = cp?.size?.w ?? (cid.startsWith('result-') ? RESULT_CARD_W_DEFAULT : PROMPT_CARD_W_DEFAULT);
            parentH += ch + THREAD_GAP_PX;
            parentW = Math.max(parentW, cw);
          }
          parentH += PROMPT_CARD_H_PX;
          const extractPosition = { x: p.position.x + parentW + CARD_GAP_PX, y: p.position.y };
          const nestedChildrenData: NodeData[] = [];
          for (const cid of childIdsLayoutOrder) {
            const cp = byId.get(cid)!;
            const childNode = prismionToNode(cp, selectedPrismionIds.includes(cid), prismionResults);
            const enriched = enrich(cp, {
              ...childNode,
              parentId: p.id,
              position: { x: 0, y: 0 },
              width: childNode.width,
              height: childNode.height,
              style: childNode.style,
            }, { isNested: true, extractPosition });
            nestedChildrenData.push({ ...(enriched.data as NodeData), nodeId: cid });
            emitted.add(cid);
          }
          const parentNode = prismionToNode(p, selectedPrismionIds.includes(p.id), prismionResults);
          const parentEnriched = enrich(p, {
            ...parentNode,
            position: { x: p.position.x, y: p.position.y },
            style: {
              ...parentNode.style,
              width: parentW,
              height: parentH,
              minWidth: p.size.minW,
              minHeight: PROMPT_CARD_H_LAYOUT,
            },
            width: parentW,
            height: parentH,
          }) as Node<NodeData> & { measured?: { width: number; height: number } };
          parentEnriched.measured = { width: parentW, height: parentH };
          (parentEnriched.data as NodeData).nestedChildren = nestedChildrenData;
          (parentEnriched.data as NodeData).threadWidth = parentW;
          (parentEnriched.data as NodeData).threadHeight = parentH;
          const lastResultIdInThread = [...childIdsLayoutOrder].reverse().find((cid) => cid.startsWith('result-')) ?? undefined;
          if (lastResultIdInThread) (parentEnriched.data as NodeData).lastResultIdInThread = lastResultIdInThread;
          if (onAddPromptBelowResult) (parentEnriched.data as NodeData).onAddPromptBelowResult = onAddPromptBelowResult;
          (parentEnriched.data as NodeData).isThreadContainer = true;
          result.push(parentEnriched);
          emitted.add(p.id);
          continue;
        }
        if (isInitialPrompt) {
          const emptyW = p.size.w ?? PROMPT_CARD_W_DEFAULT;
          const emptyH = PROMPT_CARD_H_LAYOUT + THREAD_GAP_PX + PROMPT_CARD_H_PX;
          const parentNode = prismionToNode(p, selectedPrismionIds.includes(p.id), prismionResults);
          const parentEnriched = enrich(p, {
            ...parentNode,
            position: { x: p.position.x, y: p.position.y },
            style: {
              ...parentNode.style,
              width: emptyW,
              height: emptyH,
              minWidth: p.size.minW,
              minHeight: PROMPT_CARD_H_LAYOUT,
            },
            width: emptyW,
            height: emptyH,
          }) as Node<NodeData> & { measured?: { width: number; height: number } };
          parentEnriched.measured = { width: emptyW, height: emptyH };
          (parentEnriched.data as NodeData).nestedChildren = [];
          (parentEnriched.data as NodeData).threadWidth = emptyW;
          (parentEnriched.data as NodeData).threadHeight = emptyH;
          if (onAddPromptBelowResult) (parentEnriched.data as NodeData).onAddPromptBelowResult = onAddPromptBelowResult;
          (parentEnriched.data as NodeData).isThreadContainer = true;
          result.push(parentEnriched);
          emitted.add(p.id);
          continue;
        }
        }
      }
      const useParentMap = parentByPrismionId && Object.keys(parentByPrismionId).length > 0;
      const rootId = useParentMap
        ? getThreadRootIdFromParent(p.id, parentByPrismionId)
        : getThreadRootId(p.id, connections, prismionIds, prismions);
      // Skip if this card is a descendant inside a thread that is still rendered as a thread (root not extracted).
      if (rootId !== null && rootId !== p.id && !extractedSet.has(p.id) && !extractedSet.has(rootId)) {
        const inThread = useParentMap
          ? getThreadSequenceFlattened(rootId, parentByPrismionId, prismions)
          : getThreadSequenceFlattenedFromConnections(rootId, connections, prismions);
        if (inThread.includes(p.id)) continue;
      }
      const n = prismionToNode(p, selectedPrismionIds.includes(p.id), prismionResults);
      result.push(enrich(p, n));
      emitted.add(p.id);
    }
    return result;
  }, [prismions, connections, parentByPrismionId, selectedPrismionIds, extractedCardIds, handleHandleContextMenu, isConnecting, onPromptSubmit, onAddPromptBelowResult, prismionResults, onPrismionDelete, onPrismionColorChange, onResultContentChange, onExtractFromThread]);
  const nodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const edges = useMemo(
    () =>
      connections
        .filter((c) => nodeIds.has(c.fromPrismionId) && nodeIds.has(c.toPrismionId))
        .map(connectionToEdge),
    [connections, nodeIds]
  );

  const [nodesState, setNodesState] = useNodesState(nodes);
  const [edgesState, setEdgesState] = useEdgesState(edges);
  const updateNodeInternals = useUpdateNodeInternals();
  const storeApi = useStoreApi();

  const skipEdgeSyncRef = useRef(false);
  const lastSyncRef = useRef({ nodeSig: '', edgeSig: '' });
  // Sync from props when nodes/edges or node dimensions (e.g. thread container after extract) change.
  React.useEffect(() => {
    const nodeSig = nodes
      .map((n) => {
        const d = n.data as NodeData;
        const nestedLen = d.nestedChildren?.length ?? -1;
        return `${n.id}:${n.selected ? 1 : 0}:${(n.style as { width?: number })?.width ?? ''}:${(n.style as { height?: number })?.height ?? ''}:${d.cardColor ?? ''}:${d.resultContent ?? ''}:${n.parentId ?? ''}:${nestedLen}`;
      })
      .join(',');
    const edgeSig = edges
      .map((e) => `${e.id}:${(e.data as { direction?: string })?.direction ?? 'forward'}`)
      .join(',');
    if (lastSyncRef.current.nodeSig === nodeSig && lastSyncRef.current.edgeSig === edgeSig) {
      return;
    }
    lastSyncRef.current = { nodeSig, edgeSig };
    setNodesState(nodes);
    storeApi.getState().setNodes(nodes);
    const threadNodeIds = nodes.filter((n) => (n.data as NodeData).nestedChildren?.length != null).map((n) => n.id);
    if (threadNodeIds.length > 0) {
      const idList = [...threadNodeIds];
      const t = setTimeout(() => idList.forEach((id) => updateNodeInternals(id)), 50);
      return () => clearTimeout(t);
    }
    if (skipEdgeSyncRef.current) {
      skipEdgeSyncRef.current = false;
      setEdgesState((prev) => (edges.length >= prev.length ? edges : prev));
    } else {
      setEdgesState(edges);
    }
  }, [nodes, edges, setNodesState, setEdgesState, updateNodeInternals, storeApi]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodesState((nds) => {
        const next = applyNodeChanges(changes, nds);
        for (const ch of changes) {
          if (ch.type === 'position' && ch.dragging === false && ch.position && 'id' in ch) {
            const n = next.find((x) => x.id === ch.id);
            if (n) {
              const parentId = (n as Node<NodeData>).parentId;
              if (parentId && onExtractFromThread) {
                const parent = next.find((x) => x.id === parentId);
                if (parent) {
                  const pNode = parent as {
                    measured?: { width?: number; height?: number };
                    position: { x: number; y: number };
                    width?: number;
                    height?: number;
                    style?: { width?: number; height?: number };
                  };
                  const pw = pNode.measured?.width ?? (typeof pNode.width === 'number' ? pNode.width : pNode.style?.width) ?? 0;
                  const ph = pNode.measured?.height ?? (typeof pNode.height === 'number' ? pNode.height : pNode.style?.height) ?? 0;
                  const px = ch.position.x;
                  const py = ch.position.y;
                  if (px < 0 || py < 0 || px > pw || py > ph) {
                    onExtractFromThread(ch.id as string, { x: parent.position.x + px, y: parent.position.y + py });
                    continue;
                  }
                }
              }
              if (onPrismionMove) onPrismionMove(ch.id as string, { x: n.position.x, y: n.position.y });
            }
          }
          if (ch.type === 'remove' && 'id' in ch && onPrismionDelete) {
            onPrismionDelete(ch.id as string);
          }
          if (ch.type === 'dimensions' && 'id' in ch && onPrismionResize) {
            const n = next.find((x) => x.id === ch.id) as Node<NodeData> | undefined;
            if (!n) continue;
            const style = (n as { style?: { width?: number; height?: number } }).style;
            const w = n.measured?.width ?? (typeof style?.width === 'number' ? style.width : undefined);
            const h = n.measured?.height ?? (typeof style?.height === 'number' ? style.height : undefined);
            if (w != null && h != null) {
              onPrismionResize(ch.id as string, { w, h });
            }
          }
          if (ch.type === 'select' && onSelectPrismion) {
            const selected = next.filter((n) => n.selected);
            onSelectPrismion(selected.length === 1 ? selected[0]!.id : null);
          }
        }
        return next;
      });
    },
    [
      setNodesState,
      onPrismionMove,
      onPrismionDelete,
      onPrismionResize,
      onSelectPrismion,
      onExtractFromThread,
    ]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdgesState((eds) => {
        const next = applyEdgeChanges(changes, eds);
        for (const ch of changes) {
          if (ch.type === 'remove' && 'id' in ch && onConnectorDelete) {
            onConnectorDelete(ch.id as string);
          }
        }
        return next;
      });
    },
    [setEdgesState, onConnectorDelete]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      setEdgesState((eds) => addEdge({ ...params, type: 'floating' }, eds));
      skipEdgeSyncRef.current = true;
      if (onConnectionCreate) {
        const fromPort = (params.sourceHandle as PortSide) ?? 'right';
        const toPort = (params.targetHandle as PortSide) ?? 'left';
        onConnectionCreate(params.source, params.target, fromPort, toPort);
      }
    },
    [onConnectionCreate, setEdgesState]
  );

  const onConnectStart = useCallback(() => {
    setIsConnecting(true);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
  }, []);

  const onInit = useCallback((inst: ReactFlowInstance) => {
    reactFlowRef.current = inst;
    // fitView after nodes are in the DOM so cards are visible
    setTimeout(() => {
      inst.fitView({ padding: 0.2, minZoom: 0.1, maxZoom: 2 });
    }, 200);
  }, []);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onDoubleClickCell?.(node.id);
    },
    [onDoubleClickCell]
  );

  const handlePaneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }, []);

  const handlePaneDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const prismionId = e.dataTransfer?.getData(DRAG_PRISMION_ID_KEY);
      if (!prismionId || !onExtractFromThread || !reactFlowRef.current) return;
      const pos = reactFlowRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onExtractFromThread(prismionId, pos);
    },
    [onExtractFromThread]
  );

  const paneDoubleClickRef = useRef<{ t: number }>({ t: 0 });
  const handlePaneDoubleClick = useCallback(
    (evt: React.MouseEvent) => {
      const target = evt.target as HTMLElement;
      if (target.closest('.react-flow__node')) return;
      const now = Date.now();
      if (now - paneDoubleClickRef.current.t < 400 && onDoubleClickCanvas && reactFlowRef.current) {
        const { screenToFlowPosition } = reactFlowRef.current;
        const pos = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
        onDoubleClickCanvas(pos.x, pos.y);
        paneDoubleClickRef.current.t = 0;
      } else {
        paneDoubleClickRef.current.t = now;
      }
    },
    [onDoubleClickCanvas]
  );

  return (
    <div
      style={{ ...style, minHeight: 300, position: 'relative' }}
      onDoubleClick={handlePaneDoubleClick}
      onDragOver={handlePaneDragOver}
      onDrop={handlePaneDrop}
    >
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onInit={onInit}
        onNodeDoubleClick={onNodeDoubleClick}
        onDrop={handlePaneDrop}
        onDragOver={handlePaneDragOver}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.1, maxZoom: 2 }}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'floating' }}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        deleteKeyCode={['Delete', 'Backspace']}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={MSQDX_NEUTRAL[200]}
          nodeStrokeColor={MSQDX_NEUTRAL[400]}
          nodeStrokeWidth={1}
          maskColor="rgba(240, 240, 240, 0.7)"
          pannable
          zoomable
        />
      </ReactFlow>
      {typeof document !== 'undefined' &&
        menuOpen &&
        createPortal(
          <PortCircleMenu
            x={menuOpen.x}
            y={menuOpen.y}
            side={menuOpen.handleId}
            onAction={(kind) => {
              if (kind !== 'checkion' && kind !== 'audion' && onConnectorCreatePrismion)
                onConnectorCreatePrismion(menuOpen.nodeId, menuOpen.handleId, kind);
            }}
            onClose={() => setMenuOpen(null)}
            showCheckionMcpOption={showCheckionMcpOption}
            checkionMcpEnabled={checkionMcpEnabled}
            onCheckionMcpToggle={onCheckionMcpToggle}
            showAudionMcpOption={showAudionMcpOption}
            audionMcpEnabled={audionMcpEnabled}
            onAudionMcpToggle={onAudionMcpToggle}
          />,
          document.body
        )}
    </div>
  );
}

export function ReactFlowBoard(props: ReactFlowBoardProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowBoardInner {...props} />
    </ReactFlowProvider>
  );
}
