import { describe, expect, it } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import { extractPendingProjectNameFromHistory } from '@/lib/assistant/conversation-context';
import { isConfirmationRequiredToolName } from '@/lib/assistant/orchestrator-complete';
import { buildCapabilitiesUiLayout } from '@/lib/assistant/capabilities-ui';

describe('extended intent router', () => {
  it('routes checkion-only create', () => {
    expect(routeAssistantIntent('Neues Projekt Foo in checkion anlegen').type).toBe(
      'create_checkion_project'
    );
  });

  it('routes quick_scan with url', () => {
    const intent = routeAssistantIntent('Scanne https://example.com auf Accessibility');
    expect(intent.type).toBe('quick_scan');
    if (intent.type === 'quick_scan') expect(intent.url).toContain('example.com');
  });

  it('routes pagespeed', () => {
    expect(routeAssistantIntent('PageSpeed für https://example.com').type).toBe('pagespeed_check');
  });

  it('routes sync_diagnose', () => {
    expect(routeAssistantIntent('Sync-Diagnose audion ✗').type).toBe('sync_diagnose');
  });

  it('routes persona_bootstrap', () => {
    expect(routeAssistantIntent('Generiere Persona für Zielgruppe Eltern').type).toBe(
      'persona_bootstrap'
    );
  });
});

describe('conversation-context', () => {
  it('extracts project name from prior user message', () => {
    const name = extractPendingProjectNameFromHistory(
      [
        { role: 'user', content: 'neues projekt rheinland versicherungen in audion anlegen' },
        { role: 'assistant', content: 'ok' },
      ],
      'LEGE es nur in audion an'
    );
    expect(name).toBe('rheinland versicherungen');
  });
});

describe('write confirmation tools', () => {
  it('requires confirmation for scan_single', () => {
    expect(isConfirmationRequiredToolName('checkion_scan_single')).toBe(true);
  });
  it('requires confirmation for delete', () => {
    expect(isConfirmationRequiredToolName('checkion_scan_delete')).toBe(true);
  });
});

describe('capabilities-ui', () => {
  it('builds corner_tab_section blocks including playbooks', () => {
    const layout = buildCapabilitiesUiLayout();
    expect(layout.blocks.length).toBeGreaterThan(3);
    expect(layout.blocks.every((b) => b.type === 'corner_tab_section')).toBe(true);
    expect(layout.blocks.some((b) => b.props.title?.toString().includes('Playbook'))).toBe(true);
  });
});
