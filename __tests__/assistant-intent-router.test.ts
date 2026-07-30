import { describe, expect, it } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import { normalizeMessageHistory, isDestructiveToolName } from '@/lib/assistant/orchestrator-complete';

describe('intent-router', () => {
  it('detects create project intent', () => {
    const intent = routeAssistantIntent('Lege ein neues Projekt "Acme" an, Domain acme.com');
    expect(intent.type).toBe('create_project');
    if (intent.type === 'create_project') {
      expect(intent.name).toBe('Acme');
      expect(intent.domain).toBe('acme.com');
    }
  });

  it('detects capabilities intent', () => {
    expect(routeAssistantIntent('Was kannst du?').type).toBe('capabilities');
  });

  it('does not treat suggestion label as project name', () => {
    const intent = routeAssistantIntent('Neues Projekt anlegen');
    expect(intent.type).toBe('create_project');
    if (intent.type === 'create_project') {
      expect(intent.name).toBeUndefined();
    }
  });

  it('routes audion-only create away from platform workflow', () => {
    const intent = routeAssistantIntent('Neues Projekt rheinland in audion anlegen');
    expect(intent.type).toBe('create_audion_project');
  });

  it('detects ssl check intent', () => {
    const intent = routeAssistantIntent('SSL Check für https://example.com');
    expect(intent.type).toBe('ssl_check');
    if (intent.type === 'ssl_check') {
      expect(intent.host).toContain('example.com');
    }
  });

  it('detects wayback intent', () => {
    const intent = routeAssistantIntent('Wayback Historie für https://example.com');
    expect(intent.type).toBe('wayback_check');
  });

  it('detects geo deep flag', () => {
    const intent = routeAssistantIntent('GEO deep Analyse https://example.com');
    expect(intent.type).toBe('geo_analysis');
    if (intent.type === 'geo_analysis') {
      expect(intent.deep).toBe(true);
    }
  });

  it('detects domain scan intent', () => {
    expect(routeAssistantIntent('Deep scan https://example.com').type).toBe('domain_scan');
  });

  it('detects readability intent', () => {
    expect(routeAssistantIntent('Lesbarkeit https://example.com').type).toBe('readability_check');
  });

  it('detects contrast intent with hex colors', () => {
    const intent = routeAssistantIntent('Kontrast #111111 #eeeeee');
    expect(intent.type).toBe('contrast_check');
  });

  it('detects scan summarize intent', () => {
    expect(routeAssistantIntent('Fasse den Scan zusammen').type).toBe('scan_summarize');
  });

  it('detects quick scan with summarize flag', () => {
    const intent = routeAssistantIntent('Scanne https://example.com und fasse zusammen');
    expect(intent.type).toBe('quick_scan');
    if (intent.type === 'quick_scan') expect(intent.summarize).toBe(true);
  });

  it('detects launch readiness playbook', () => {
    const intent = routeAssistantIntent('Launch readiness für "Acme" https://example.com');
    expect(intent.type).toBe('run_playbook');
    if (intent.type === 'run_playbook') {
      expect(intent.playbookId).toBe('launch_readiness');
      expect(intent.url).toContain('example.com');
    }
  });

  it('detects quick check playbook (German)', () => {
    const intent = routeAssistantIntent('Quick Check für https://example.com');
    expect(intent.type).toBe('run_playbook');
    if (intent.type === 'run_playbook') {
      expect(intent.playbookId).toBe('event_quick_check');
      expect(intent.url).toContain('example.com');
    }
  });

  it('still detects legacy event quick check phrasing', () => {
    const intent = routeAssistantIntent('Event Quick Check für https://example.com');
    expect(intent.type).toBe('run_playbook');
    if (intent.type === 'run_playbook') {
      expect(intent.playbookId).toBe('event_quick_check');
    }
  });

  it('detects schnellcheck with domain only', () => {
    const intent = routeAssistantIntent('Schnellcheck acme.com');
    expect(intent.type).toBe('run_playbook');
    if (intent.type === 'run_playbook') {
      expect(intent.playbookId).toBe('event_quick_check');
    }
  });

  it('detects English event quick check phrases', () => {
    const phrases = [
      'Event quick check for https://example.com',
      'Quick check acme.com',
      'Fast check for https://example.com',
      'Trade show check https://example.com',
    ];
    for (const phrase of phrases) {
      const intent = routeAssistantIntent(phrase);
      expect(intent.type, phrase).toBe('run_playbook');
      if (intent.type === 'run_playbook') {
        expect(intent.playbookId, phrase).toBe('event_quick_check');
      }
    }
  });

  it('detects website audit playbook', () => {
    const intent = routeAssistantIntent('Website audit https://example.com');
    expect(intent.type).toBe('run_playbook');
    if (intent.type === 'run_playbook') {
      expect(intent.playbookId).toBe('website_audit');
      expect(intent.url).toContain('example.com');
    }
  });

  it('detects website audit ohne geo', () => {
    const intent = routeAssistantIntent('Website audit ohne geo https://example.com');
    expect(intent.type).toBe('run_playbook');
    if (intent.type === 'run_playbook') expect(intent.skipGeo).toBe(true);
  });
});

describe('orchestrator-complete helpers', () => {
  it('normalizes consecutive same-role messages', () => {
    const out = normalizeMessageHistory([
      { role: 'user', content: 'a' },
      { role: 'user', content: 'b' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain('a');
    expect(out[0].content).toContain('b');
  });

  it('flags destructive tool names', () => {
    expect(isDestructiveToolName('checkion_project_delete')).toBe(true);
    expect(isDestructiveToolName('checkion_projects_list')).toBe(false);
  });
});
