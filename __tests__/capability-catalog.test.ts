import { describe, expect, it } from 'vitest';
import {
  classifyPromoteTrace,
  capabilityIdFromAgentIntent,
  capabilityIdFromAgentTool,
  capabilityIdFromFlowNodeKind,
  getCapability,
  isCapabilityCatalogRuntimeEnabled,
  listCapabilities,
  normalizeScanCatalogFromAgentPreview,
  normalizeScanCatalogFromFlowFields,
  validateCapabilityCatalog,
} from '@/lib/capabilities';
import { resolveCatalogPath, setContextBundle, emptyRunContext } from '@/lib/collection-flow-run-context';

describe('capability catalog (Wave C1)', () => {
  it('validates pilot registry', () => {
    expect(validateCapabilityCatalog()).toEqual([]);
    expect(listCapabilities().length).toBeGreaterThanOrEqual(6);
    expect(getCapability('checkion.scan')?.flow?.nodeKinds).toContain('scan');
  });

  it('maps agent intent/tool and flow kind to checkion.scan', () => {
    expect(capabilityIdFromAgentIntent('quick_scan')).toBe('checkion.scan');
    expect(capabilityIdFromAgentTool('checkion_scan_single')).toBe('checkion.scan');
    expect(capabilityIdFromFlowNodeKind('scan')).toBe('checkion.scan');
  });

  it('does not map orchestration kinds to capabilities', () => {
    expect(capabilityIdFromFlowNodeKind('compare')).toBeNull();
    expect(capabilityIdFromFlowNodeKind('human_confirm')).toBeNull();
    expect(capabilityIdFromFlowNodeKind('prompt')).toBeNull();
  });

  it('defaults CAPABILITY_CATALOG_RUNTIME off', () => {
    expect(isCapabilityCatalogRuntimeEnabled()).toBe(false);
  });

  it('contract: agent scan preview and flow fields share scan.* catalog paths', () => {
    const agentBundle = normalizeScanCatalogFromAgentPreview({
      id: 'scan-1',
      url: 'https://example.test',
      score: 82,
      stats: { errors: 1, warnings: 3, notices: 0, total: 4 },
      issues: [{ id: 'i1', severity: 'critical', ruleId: 'color-contrast', title: 'Contrast' }],
    });

    const flowBundle = normalizeScanCatalogFromFlowFields({
      status: 'completed',
      overallScore: 82,
      url: 'https://example.test',
      issueCount: 4,
      scoresByKind: { accessibility: 82 },
      criticalCount: 1,
      seriousCount: 3,
      issueItems: [
        { id: 'i1', severity: 'critical', ruleId: 'color-contrast', title: 'Contrast' },
      ],
    });

    expect(agentBundle).toEqual(flowBundle);

    const ctx = setContextBundle(emptyRunContext(), 'scan', agentBundle);
    expect(resolveCatalogPath(ctx, 'scan.overallScore')).toBe(82);
    expect(resolveCatalogPath(ctx, 'scan.url')).toBe('https://example.test');
    expect(resolveCatalogPath(ctx, 'scan.scores.accessibility')).toBe(82);
    expect(resolveCatalogPath(ctx, 'scan.issues.criticalCount')).toBe(1);
    expect(resolveCatalogPath(ctx, 'scan.issues.seriousCount')).toBe(3);
  });

  it('promote: explore-only → playbook; scan chain → flow; empty → reject', () => {
    expect(classifyPromoteTrace([])).toMatchObject({ ok: false, code: 'empty_trace' });

    const explore = classifyPromoteTrace([
      { capabilityId: 'brandion.tokens_list', inputs: {} },
      { capabilityId: 'audion.persona.read', inputs: {} },
    ]);
    expect(explore).toMatchObject({ ok: true, target: 'playbook' });

    const flow = classifyPromoteTrace([
      { capabilityId: 'checkion.scan', inputs: { url: 'https://a.test' } },
      { capabilityId: 'checkion.geo_job', inputs: {} },
    ]);
    expect(flow).toMatchObject({
      ok: true,
      target: 'flow',
      flowCapabilityIds: ['checkion.scan', 'checkion.geo_job'],
    });

    const missingUrl = classifyPromoteTrace([
      { capabilityId: 'checkion.scan', inputs: {} },
    ]);
    expect(missingUrl).toMatchObject({ ok: false, code: 'unbound_required_input' });
  });
});
