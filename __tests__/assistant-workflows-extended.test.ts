import { describe, expect, it } from 'vitest';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import { extractPendingProjectNameFromHistory } from '@/lib/assistant/conversation-context';
import { isConfirmationRequiredToolName } from '@/lib/assistant/orchestrator-complete';
import { buildCapabilitiesUiLayout } from '@/lib/assistant/capabilities-ui';

describe('extended intent router', () => {
  it('routes checkion-worded create to Collection create_project', () => {
    expect(routeAssistantIntent('Neues Projekt Foo in checkion anlegen').type).toBe(
      'create_project'
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

  it('routes journey_outline', () => {
    const intent = routeAssistantIntent('Zeige Journey Outline für "Checkout"');
    expect(intent.type).toBe('journey_outline');
    if (intent.type === 'journey_outline') {
      expect(intent.journeyName).toMatch(/Checkout/i);
      expect(intent.validate).toBeUndefined();
    }
  });

  it('routes journey validate with id', () => {
    const intent = routeAssistantIntent('Validiere Journey journey-product-discovery');
    expect(intent.type).toBe('journey_outline');
    if (intent.type === 'journey_outline') {
      expect(intent.validate).toBe(true);
      expect(intent.journeyId).toBe('journey-product-discovery');
    }
  });

  it('routes journey_generate', () => {
    const intent = routeAssistantIntent('Generiere Customer Journey');
    expect(intent.type).toBe('journey_generate');
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
