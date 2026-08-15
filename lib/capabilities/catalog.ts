/**
 * Capability Catalog registry (Wave C1 pilot set).
 * @see specs/domain/capability-catalog.md
 */

import type { CapabilityId, CapabilityRecord } from '@/lib/capabilities/types';

const PILOT: CapabilityRecord[] = [
  {
    id: 'checkion.scan',
    owner: 'checkion',
    title: 'Page scan',
    description: 'CHECKION single/deep page quality scan; writes scan.* catalog.',
    inputFields: [
      { name: 'url', required: true },
      { name: 'scanMode', required: false },
    ],
    outputCatalogRoot: 'scan',
    sideEffect: 'job',
    confirmation: 'none',
    surfaces: { agent: true, flow: true },
    agent: {
      toolNames: ['checkion_scan_single'],
      intentTypes: ['quick_scan'],
    },
    flow: { nodeKinds: ['scan'] },
    executorId: 'checkion-scan',
  },
  {
    id: 'checkion.domain_scan',
    owner: 'checkion',
    title: 'Domain scan',
    description: 'CHECKION domain crawl; writes domain.* catalog.',
    inputFields: [
      { name: 'url', required: true },
      { name: 'depth', required: false },
    ],
    outputCatalogRoot: 'domain',
    sideEffect: 'job',
    confirmation: 'none',
    surfaces: { agent: true, flow: true },
    agent: {
      toolNames: ['checkion_scan_domain'],
      intentTypes: ['domain_scan'],
    },
    flow: { nodeKinds: ['domain_scan'] },
    executorId: 'checkion-domain-scan',
  },
  {
    id: 'checkion.geo_job',
    owner: 'checkion',
    title: 'GEO job',
    description: 'CHECKION GEO / E-E-A-T job; writes geo.* catalog.',
    inputFields: [
      { name: 'text', required: false },
      { name: 'queries', required: false },
    ],
    outputCatalogRoot: 'geo',
    sideEffect: 'job',
    confirmation: 'none',
    surfaces: { agent: true, flow: true },
    agent: {
      toolNames: ['checkion_geo_eeat'],
      intentTypes: ['geo_analysis'],
    },
    flow: { nodeKinds: ['geo_job'] },
    executorId: 'checkion-geo-job',
  },
  {
    id: 'brandion.brand_measure',
    owner: 'brandion',
    title: 'Brand measure',
    description: 'BRANDION Measured evaluate; writes brand.* catalog.',
    inputFields: [
      { name: 'guidelineId', required: true },
      { name: 'url', required: false },
    ],
    outputCatalogRoot: 'brand',
    sideEffect: 'job',
    confirmation: 'none',
    surfaces: { agent: true, flow: true },
    agent: {
      toolNames: [],
      intentTypes: [],
    },
    flow: { nodeKinds: ['brand_measure'] },
    executorId: 'brandion-brand-measure',
  },
  {
    id: 'audion.persona_bootstrap',
    owner: 'audion',
    title: 'Persona bootstrap',
    description: 'AUDION persona bootstrap; writes persona.* catalog.',
    inputFields: [{ name: 'companyName', required: false }],
    outputCatalogRoot: 'persona',
    sideEffect: 'write',
    confirmation: 'none',
    surfaces: { agent: true, flow: true },
    agent: {
      toolNames: [],
      intentTypes: ['persona_bootstrap'],
    },
    flow: { nodeKinds: ['persona_bootstrap'] },
    executorId: 'audion-persona-bootstrap',
  },
  {
    id: 'audion.journey_segment',
    owner: 'audion',
    title: 'Journey segment',
    description:
      'AUDION journey segment boundary (Wave C4). Micro-nodes stay Flow-authored; Agent uses journey_outline/generate or a journey-quality Flow.',
    inputFields: [{ name: 'platformProjectId', required: false }],
    outputCatalogRoot: 'journey',
    sideEffect: 'job',
    confirmation: 'none',
    surfaces: { agent: true, flow: false },
    agent: {
      toolNames: [],
      intentTypes: ['journey_outline', 'journey_generate'],
    },
    flow: null,
    executorId: 'audion-journey-segment',
  },
  {
    id: 'plexon.collection_flow.run',
    owner: 'plexon',
    title: 'Run Collection Flow',
    description: 'Start an existing Collection Flow by id (Wave C2).',
    inputFields: [
      { name: 'platformProjectId', required: true },
      { name: 'flowId', required: true },
    ],
    outputCatalogRoot: null,
    sideEffect: 'job',
    confirmation: 'none',
    surfaces: { agent: true, flow: false },
    agent: {
      toolNames: [],
      intentTypes: ['run_collection_flow'],
    },
    flow: null,
    executorId: 'plexon-collection-flow-run',
  },
  {
    id: 'dig.capture',
    owner: 'dig',
    title: 'Capture design reference',
    description: 'Capture a URL or asset into the Design Intelligence Graph (stub until Wave 2).',
    inputFields: [
      { name: 'platformProjectId', required: true },
      { name: 'url', required: false },
    ],
    outputCatalogRoot: null,
    sideEffect: 'write',
    confirmation: 'none',
    surfaces: { agent: true, flow: true },
    agent: { toolNames: [], intentTypes: [] },
    flow: null,
    executorId: 'dig-stub',
  },
  {
    id: 'dig.enrich',
    owner: 'dig',
    title: 'Enrich design capture',
    description: 'Run LLM enrichment on a DIG capture (stub until Wave 2).',
    inputFields: [
      { name: 'platformProjectId', required: true },
      { name: 'captureId', required: true },
    ],
    outputCatalogRoot: null,
    sideEffect: 'job',
    confirmation: 'none',
    surfaces: { agent: true, flow: true },
    agent: { toolNames: [], intentTypes: [] },
    flow: null,
    executorId: 'dig-stub',
  },
  {
    id: 'dig.reference_search',
    owner: 'dig',
    title: 'Search design references',
    description: 'Search Collection-scoped design references in DIG (stub until Wave 2).',
    inputFields: [
      { name: 'platformProjectId', required: true },
      { name: 'query', required: true },
    ],
    outputCatalogRoot: null,
    sideEffect: 'read',
    confirmation: 'none',
    surfaces: { agent: true, flow: false },
    agent: { toolNames: [], intentTypes: [] },
    flow: null,
    executorId: 'dig-stub',
  },
  {
    id: 'dig.reference_pack',
    owner: 'dig',
    title: 'Build reference pack',
    description: 'Assemble a design reference pack from DIG library hits (stub until Wave 2).',
    inputFields: [
      { name: 'platformProjectId', required: true },
      { name: 'captureIds', required: false },
    ],
    outputCatalogRoot: null,
    sideEffect: 'read',
    confirmation: 'none',
    surfaces: { agent: true, flow: false },
    agent: { toolNames: [], intentTypes: [] },
    flow: null,
    executorId: 'dig-stub',
  },
  {
    id: 'dig.generate',
    owner: 'dig',
    title: 'Generate from references',
    description: 'Generate design variants grounded in DIG references (stub until Wave 2).',
    inputFields: [
      { name: 'platformProjectId', required: true },
      { name: 'prompt', required: true },
    ],
    outputCatalogRoot: null,
    sideEffect: 'write',
    confirmation: 'none',
    surfaces: { agent: true, flow: true },
    agent: { toolNames: [], intentTypes: [] },
    flow: null,
    executorId: 'dig-stub',
  },
];

const BY_ID = new Map<CapabilityId, CapabilityRecord>(PILOT.map((c) => [c.id, c]));

export function listCapabilities(): CapabilityRecord[] {
  return [...PILOT];
}

export function getCapability(id: string): CapabilityRecord | null {
  return BY_ID.get(id as CapabilityId) ?? null;
}

export function listAgentCapabilities(): CapabilityRecord[] {
  return PILOT.filter((c) => c.surfaces.agent);
}

export function listFlowCapabilities(): CapabilityRecord[] {
  return PILOT.filter((c) => c.surfaces.flow);
}

export function assertCapabilityRecord(c: CapabilityRecord): string[] {
  const errors: string[] = [];
  if (!c.id.includes('.')) errors.push(`${c.id}: id must be owner.name`);
  if (!c.title.trim()) errors.push(`${c.id}: title required`);
  if (!c.executorId.trim()) errors.push(`${c.id}: executorId required`);
  if (c.surfaces.agent && !c.agent) errors.push(`${c.id}: agent binding required`);
  if (c.surfaces.flow && !c.flow) errors.push(`${c.id}: flow binding required`);
  if (c.surfaces.flow && !c.outputCatalogRoot && c.id !== 'plexon.collection_flow.run') {
    // meta run has no catalog; other flow surfaces need a root
    if (c.flow) errors.push(`${c.id}: outputCatalogRoot required for flow surface`);
  }
  if (c.surfaces.flow && c.flow && c.flow.nodeKinds.length === 0) {
    errors.push(`${c.id}: flow.nodeKinds must be non-empty`);
  }
  return errors;
}

export function validateCapabilityCatalog(): string[] {
  return PILOT.flatMap(assertCapabilityRecord);
}
