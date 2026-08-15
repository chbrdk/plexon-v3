/**
 * Creation MagazineTemplate wire shapes (consumer-side).
 * SSOT: creation-v3 `@creation-v3/contracts` + specs/domain/magazine-template.md
 */

export type CreationSceneNode = {
  id: string;
  type: string;
  name?: string;
  props?: Record<string, unknown>;
  style?: Record<string, string | number>;
  tokenBindings?: Record<string, string>;
  breakpoints?: Record<string, unknown>;
  hidden?: boolean;
  locked?: boolean;
  children?: CreationSceneNode[];
};

export type CreationCompositionScene = {
  id: string;
  name: string;
  version: 1;
  platformProjectId?: string | null;
  activeBreakpoint?: string;
  activePrintPreset?: string;
  root: CreationSceneNode;
  updatedAt: string;
};

export type CreationMagazineTemplateSlotDef = {
  dataSlot: string;
  nodeId: string;
  nodeType: string;
};

export type CreationMagazineTemplate = {
  templateId: string;
  version: number;
  status: 'draft' | 'published';
  role: string;
  platformProjectId: string;
  name: string;
  sceneSnapshot: CreationCompositionScene;
  sourceSceneId?: string | null;
  slotSchema: CreationMagazineTemplateSlotDef[];
  compatVersion: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
