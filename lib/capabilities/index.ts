/**
 * Capability Catalog public barrel.
 * @see specs/domain/capability-catalog.md
 */

export {
  assertCapabilityRecord,
  getCapability,
  listAgentCapabilities,
  listCapabilities,
  listFlowCapabilities,
  validateCapabilityCatalog,
} from '@/lib/capabilities/catalog';
export {
  capabilityIdFromAgentIntent,
  capabilityIdFromAgentTool,
  resolveAgentCapability,
} from '@/lib/capabilities/adapters/agent';
export {
  FLOW_ORCHESTRATION_KINDS,
  capabilityIdFromFlowNodeKind,
  resolveFlowCapability,
} from '@/lib/capabilities/adapters/flow';
export {
  normalizeScanCatalogFromAgentPreview,
  normalizeScanCatalogFromFlowFields,
  type AgentScanPreviewForCatalog,
} from '@/lib/capabilities/catalog-normalize-scan';
export {
  executeCheckionScan,
  executeCheckionScanCapability,
  type CheckionScanAgentPayload,
  type CheckionScanCapabilityResult,
  type CheckionScanFlowPayload,
} from '@/lib/capabilities/executors/checkion-scan';
export {
  executeCheckionDomainScan,
  executeCheckionDomainScanCapability,
  type CheckionDomainScanAgentPayload,
  type CheckionDomainScanFlowPayload,
} from '@/lib/capabilities/executors/checkion-domain-scan';
export {
  executeCheckionGeoJob,
  executeCheckionGeoJobCapability,
  type CheckionGeoJobCapabilityResult,
  type CheckionGeoJobPayload,
} from '@/lib/capabilities/executors/checkion-geo-job';
export {
  executeAudionPersonaBootstrap,
  executeAudionPersonaBootstrapCapability,
  type AudionPersonaBootstrapPayload,
} from '@/lib/capabilities/executors/audion-persona-bootstrap';
export {
  executeAudionJourneySegment,
  executeAudionJourneySegmentCapability,
} from '@/lib/capabilities/executors/audion-journey-segment';
export {
  executePlexonCollectionFlowRun,
  executePlexonCollectionFlowRunCapability,
  type CollectionFlowRunAgentPayload,
} from '@/lib/capabilities/executors/plexon-collection-flow-run';
export {
  classifyPromoteTrace,
  buildPlaybookRecipe,
  buildPromotedFlowDocument,
  extractExploreHintsFromHistory,
  extractPromoteTraceFromHistory,
  persistPromotedFlow,
  COLLECTION_FLOW_TEMPLATE_ASSISTANT_PROMOTE,
  type PromoteClassification,
  type PromoteFlowPreview,
  type PromotePlaybookRecipe,
} from '@/lib/capabilities/promote';
export {
  ENV_CAPABILITY_CATALOG_RUNTIME,
  isCapabilityCatalogRuntimeEnabled,
} from '@/lib/capabilities/runtime-flag';
export type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityId,
  CapabilityRecord,
  CapabilityResult,
  PromoteRejectCode,
  PromoteTraceStep,
} from '@/lib/capabilities/types';
