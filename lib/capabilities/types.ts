/**
 * Capability Catalog types — Agent ↔ Collection Flow shared contract.
 * @see specs/domain/capability-catalog.md
 */

export type CapabilityOwner = 'audion' | 'checkion' | 'brandion' | 'echon' | 'plexon';

export type CapabilitySideEffect = 'read' | 'write' | 'job';

export type CapabilityConfirmation = 'none' | 'destructive' | 'human_gate';

export type CapabilityId =
  | 'checkion.scan'
  | 'checkion.domain_scan'
  | 'checkion.geo_job'
  | 'brandion.brand_measure'
  | 'audion.persona_bootstrap'
  | 'audion.journey_segment'
  | 'plexon.collection_flow.run';

export type CapabilitySurfaces = {
  agent: boolean;
  flow: boolean;
};

export type CapabilityAgentBinding = {
  toolNames: string[];
  intentTypes: string[];
};

export type CapabilityFlowBinding = {
  nodeKinds: string[];
};

export type CapabilityInputField = {
  name: string;
  required: boolean;
};

export type CapabilityRecord = {
  id: CapabilityId;
  owner: CapabilityOwner;
  title: string;
  description: string;
  inputFields: CapabilityInputField[];
  outputCatalogRoot: string | null;
  sideEffect: CapabilitySideEffect;
  confirmation: CapabilityConfirmation;
  surfaces: CapabilitySurfaces;
  agent: CapabilityAgentBinding | null;
  flow: CapabilityFlowBinding | null;
  executorId: string;
};

export type CapabilityExecuteSource = 'agent' | 'flow';

export type CapabilityExecuteContext = {
  platformProjectId?: string | null;
  checkionProjectId?: string | null;
  audionProjectId?: string | null;
  brandionGuidelineId?: string | null;
  source: CapabilityExecuteSource;
  nodeId?: string;
};

export type CapabilityResult = {
  ok: boolean;
  catalogRoot?: string;
  catalogBundle?: Record<string, unknown>;
  agentPayload?: unknown;
  error?: string;
};

export type CapabilityExecutor = (
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
) => Promise<CapabilityResult>;

export type PromoteRejectCode =
  | 'explore_only'
  | 'unknown_capability'
  | 'unbound_required_input'
  | 'empty_trace';

export type PromoteTraceStep = {
  capabilityId: string;
  inputs?: Record<string, unknown>;
};
