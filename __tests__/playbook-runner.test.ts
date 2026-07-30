import { describe, expect, it, vi, beforeEach } from 'vitest';
import '@/lib/assistant/playbooks/index';
import { getPlaybook, listPlaybooks } from '@/lib/assistant/playbooks/registry';
import { runPlaybook } from '@/lib/assistant/playbooks/runner';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/assistant/playbooks/execute-step', () => ({
  executePlaybookStep: vi.fn(),
}));

import { executePlaybookStep } from '@/lib/assistant/playbooks/execute-step';

describe('playbook registry', () => {
  it('registers website_audit', () => {
    expect(getPlaybook('website_audit')?.label).toBe('Website-Audit');
    expect(listPlaybooks().some((p) => p.id === 'website_audit')).toBe(true);
  });

  it('registers launch_readiness', () => {
    expect(getPlaybook('launch_readiness')?.label).toBe('Launch Readiness');
    expect(listPlaybooks().some((p) => p.id === 'launch_readiness')).toBe(true);
  });

  it('registers event_quick_check', () => {
    expect(getPlaybook('event_quick_check')?.label).toBe(QUICK_CHECK_LABEL);
    expect(listPlaybooks().some((p) => p.id === 'event_quick_check')).toBe(true);
  });
});

describe('runPlaybook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs required steps and builds outcomes', async () => {
    vi.mocked(executePlaybookStep).mockImplementation(async (kind) => {
      if (kind === 'pagespeed_check') {
        return {
          ok: true,
          payload: {
            kind: 'pagespeed_check',
            data: {
              url: 'https://example.com',
              performance: 85,
              accessibility: 90,
              bestPractices: 80,
              seo: 88,
            },
          },
        };
      }
      if (kind === 'quick_scan') {
        return {
          ok: true,
          payload: {
            kind: 'quick_scan',
            data: {
              id: 'scan-1',
              url: 'https://example.com',
              score: 78,
              stats: { errors: 1, warnings: 2, notices: 0, total: 3 },
              issues: [],
            },
          },
        };
      }
      if (kind === 'ssl_check') {
        return { ok: false, error: 'SSL timeout' };
      }
      return { ok: true, skipped: true, reason: 'skip' };
    });

    const result = await runPlaybook({
      playbookId: 'website_audit',
      url: 'https://example.com',
      context: { url: 'https://example.com', userId: 'u1', includeGeo: false },
      skipKinds: ['geo_analysis', 'contrast_check', 'readability_check'],
    });

    expect(result.ok).toBe(true);
    expect(result.outcomes.filter((o) => o.status === 'done').length).toBeGreaterThanOrEqual(2);
    expect(result.outcomes.find((o) => o.kind === 'ssl_check')?.status).toBe('error');
  });

  it('fails when required step fails', async () => {
    vi.mocked(executePlaybookStep).mockResolvedValue({ ok: false, error: 'PageSpeed down' });

    const result = await runPlaybook({
      playbookId: 'website_audit',
      url: 'https://example.com',
      context: { url: 'https://example.com', userId: 'u1' },
      skipKinds: ['ssl_check', 'readability_check', 'contrast_check', 'geo_analysis'],
    });

    expect(result.ok).toBe(false);
    expect(result.requiredFailed).toBe(true);
  });
});
