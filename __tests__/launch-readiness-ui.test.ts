import { describe, expect, it } from 'vitest';
import type { LaunchReadinessResult } from '@/lib/assistant/playbooks/run-launch-readiness';
import { buildLaunchReadinessLayout } from '@/lib/assistant/ui-blocks/build-launch-readiness-ui';

describe('buildLaunchReadinessLayout', () => {
  it('builds metric grid with traffic-light tones', () => {
    const result: LaunchReadinessResult = {
      ok: true,
      playbookId: 'launch_readiness',
      playbookLabel: 'Launch Readiness',
      projectName: 'Acme',
      url: 'https://example.com',
      platformProjectId: 'pp-1',
      steps: [],
      outcomes: [
        {
          stepId: 'audit_pagespeed',
          label: 'PageSpeed',
          status: 'done',
          payload: {
            kind: 'pagespeed_check',
            data: {
              url: 'https://example.com',
              performance: 88,
              accessibility: 92,
              bestPractices: 80,
              seo: 85,
            },
          },
        },
        {
          stepId: 'sync_diagnose',
          label: 'Sync',
          status: 'done',
          data: {
            checkionProbe: { ok: true },
            audionProbe: { ok: false },
          },
        },
      ],
    };

    const layout = buildLaunchReadinessLayout(result);
    const metrics = layout.blocks.find((b) => b.type === 'metric_grid');
    expect(metrics).toBeDefined();
    expect(metrics?.props).toMatchObject({ title: 'Launch-Ampel' });
  });
});
