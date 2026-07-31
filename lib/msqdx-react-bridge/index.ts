/**
 * Narrow @msqdx/react bridge — magazine primitives from @msqdx/ui;
 * board types from legacy DS; no full MUI design-system re-export.
 */
export type {
  Prismion,
  Board,
  Connection,
  Connector,
  Presence,
  BoardParticipant,
} from '../../../msqdx-design-system/packages/react/src/types/prismion'

export type PrismionResultItem =
  | { type: 'markdown'; content: string; label?: string }
  | { type: 'text'; content: string; label?: string }
  | { type: string; content?: string; label?: string; [key: string]: unknown }

export type BrandColor = 'purple' | 'yellow' | 'pink' | 'orange' | 'green' | 'black'

export { wouldOverlap } from '../../../msqdx-design-system/packages/react/src/lib/board-utils'

export {
  MsqdxTypography,
  MsqdxButton,
  MsqdxIconButton,
  MsqdxFormField,
  MsqdxInput,
  MsqdxCard,
  MsqdxMoleculeCard,
  MsqdxDivider,
  MsqdxAvatar,
  MsqdxChip,
  MsqdxSelect,
  MsqdxLogo,
  MsqdxIcon,
  MsqdxAppLayout,
  MsqdxAdminNav,
  MsqdxGlassChatPanel,
  MsqdxStepper,
  MsqdxTooltip,
  MsqdxPrismionToolbar,
  MarkdownContent,
  MsqdxCornerTabSection,
  MsqdxCornerTabSectionTab,
  type AdminNavItem,
  type MsqdxIconButtonProps,
} from './primitives'
