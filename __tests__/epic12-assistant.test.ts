import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ASSISTANT_CAPABILITIES_SECTIONS } from '@/lib/assistant/capabilities-overview';
import { ASSISTANT_SUGGESTED_PROMPTS } from '@/lib/assistant/suggested-prompts';
import { isConfirmationRequiredToolName } from '@/lib/assistant/orchestrator-complete';
import { tryAutoAssignCheckionResource } from '@/lib/assistant/auto-assign-checkion';
import { assignCheckionResourceToProject } from '@/lib/integrations/checkion-assign-client';

vi.mock('@/lib/integrations/checkion-assign-client', () => ({
  assignCheckionResourceToProject: vi.fn(),
}));

describe('Epic 12 — capabilities playbooks section', () => {
  it('includes playbooks section with website audit and launch readiness', () => {
    const playbooks = ASSISTANT_CAPABILITIES_SECTIONS.find((s) => s.id === 'playbooks');
    expect(playbooks?.title).toContain('Playbook');
    expect(playbooks?.rows?.some((r) => r.name.includes('Website-Audit'))).toBe(true);
    expect(playbooks?.rows?.some((r) => r.name.includes('Launch Readiness'))).toBe(true);
    expect(playbooks?.rows?.some((r) => r.name.includes('Quick Check'))).toBe(true);
  });
});

describe('Epic 12 — suggested prompts', () => {
  it('prioritizes playbook and audit chips', () => {
    const ids = ASSISTANT_SUGGESTED_PROMPTS.slice(0, 5).map((p) => p.id);
    expect(ids).toEqual(['website-audit', 'launch-readiness', 'event-quick-check', 'domain-scan', 'ssl']);
  });

  it('includes quick check English chip prompt', () => {
    const chip = ASSISTANT_SUGGESTED_PROMPTS.find((p) => p.id === 'event-quick-check');
    expect(chip?.prompt).toMatch(/quick check/i);
  });
});

describe('Epic 12 — write confirmation tools', () => {
  it('requires confirmation for domain scan, geo rerun and journey start', () => {
    expect(isConfirmationRequiredToolName('checkion_scan_domain')).toBe(true);
    expect(isConfirmationRequiredToolName('checkion_geo_eeat_rerun_competitive')).toBe(true);
    expect(isConfirmationRequiredToolName('checkion_scan_journey_start')).toBe(true);
    expect(isConfirmationRequiredToolName('checkion_scan_domain_journey_start')).toBe(true);
  });
});

describe('Epic 12 — auto-assign CHECKION', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips assign when no project binding', async () => {
    const result = await tryAutoAssignCheckionResource({
      kind: 'scan',
      resourceId: 'scan-1',
      checkionProjectId: null,
    });
    expect(result.assigned).toBe(false);
    expect(assignCheckionResourceToProject).not.toHaveBeenCalled();
  });

  it('assigns scan to project when binding exists', async () => {
    vi.mocked(assignCheckionResourceToProject).mockResolvedValue({ ok: true });
    const result = await tryAutoAssignCheckionResource({
      kind: 'scan',
      resourceId: 'scan-1',
      checkionProjectId: 'proj-1',
    });
    expect(result.assigned).toBe(true);
    expect(assignCheckionResourceToProject).toHaveBeenCalledWith({
      kind: 'scan',
      resourceId: 'scan-1',
      projectId: 'proj-1',
    });
  });
});
