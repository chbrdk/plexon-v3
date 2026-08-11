import { describe, expect, it } from 'vitest';
import type { AssistantIntent } from '@/lib/assistant/intent-router';
import { listRegisteredIntentTypes, dispatchAssistantIntent } from '@/lib/assistant/workflow-registry';

describe('workflow-registry', () => {
  it('registers all intent types', () => {
    const types = listRegisteredIntentTypes().sort();
    const expected: AssistantIntent['type'][] = [
      'capabilities',
      'contrast_check',
      'create_audion_project',
      'create_checkion_project',
      'create_project',
      'domain_scan',
      'free_chat',
      'geo_analysis',
      'journey_generate',
      'journey_outline',
      'pagespeed_check',
      'persona_bootstrap',
      'project_status',
      'quick_scan',
      'readability_check',
      'run_playbook',
      'scan_summarize',
      'ssl_check',
      'start_research',
      'sync_diagnose',
      'ui_showcase',
      'wayback_check',
    ].sort();
    expect(types).toEqual(expected);
  });

  it('dispatches capabilities without workflow run', async () => {
    const result = await dispatchAssistantIntent(
      {
        user: { id: 'u1', role: 'user', email: 'u@test.com' },
        body: {},
        conversationId: 'c1',
        conversation: { id: 'c1', userId: 'u1', platformProjectId: null, title: 'T' },
        bindingIds: null,
        history: [],
        prompt: 'Was kannst du?',
        profile: { name: null, email: 'u@test.com' },
        resolvedName: () => undefined,
        resolvedDomain: () => undefined,
      },
      { type: 'capabilities' }
    );
    expect(result.assistantText.length).toBeGreaterThan(10);
    expect(result.metadata?.contentType).toBe('ui_composed');
    expect(result.workflowRunId).toBeUndefined();
  });
});
