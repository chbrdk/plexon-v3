import { describe, expect, it } from 'vitest';
import {
  detectCreateProjectTarget,
  extractScopedProjectName,
  isAudienceWorkflowIntent,
  matchesCreateProjectIntent,
} from '@/lib/assistant/create-project-scope';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import { formatAudionProjectCreatedMessage } from '@/lib/assistant/format-messages';

describe('create-project-scope', () => {
  it('detects audion-only target when audion is mentioned without checkion/plexon', () => {
    expect(
      detectCreateProjectTarget('kannst du ein neues projekt rheinland versicherungen in audion anlegen')
    ).toBe('audion');
  });

  it('detects audion-only with explicit nur audion', () => {
    expect(detectCreateProjectTarget('LEGE es nur in audion an!!!!')).toBe('audion');
  });

  it('keeps platform target for generic project creation', () => {
    expect(detectCreateProjectTarget('Lege ein neues Projekt "Acme" an')).toBe('platform');
  });

  it('keeps platform target when both products are named', () => {
    expect(detectCreateProjectTarget('Projekt Foo in audion und checkion anlegen')).toBe('platform');
  });

  it('extracts project name before in audion', () => {
    expect(
      extractScopedProjectName('kannst du ein neues projekt rheinland versicherungen in audion anlegen')
    ).toBe('rheinland versicherungen');
  });

  it('matchesCreateProjectIntent rejects audience cross-product prompts', () => {
    const patterns = [/\b(in\s+)?audion\b.*\banlegen\b/i];
    expect(
      matchesCreateProjectIntent(
        'zielgruppen für audion aus checkion ableiten und anlegen',
        patterns
      )
    ).toBe(false);
    expect(
      matchesCreateProjectIntent('neues projekt rheinland in audion anlegen', patterns)
    ).toBe(true);
  });
});

describe('intent-router audion project', () => {
  it('routes audion-scoped create to create_audion_project', () => {
    const intent = routeAssistantIntent(
      'kannst du ein neues projekt rheinland versicherungen in audion anlegen'
    );
    expect(intent.type).toBe('create_audion_project');
    if (intent.type === 'create_audion_project') {
      expect(intent.name).toBe('rheinland versicherungen');
    }
  });

  it('routes nur audion follow-up to create_audion_project', () => {
    expect(routeAssistantIntent('LEGE es nur in audion an!!!!').type).toBe('create_audion_project');
  });

  it('does not route checkion→audion target group derivation to project create', () => {
    const prompt =
      'ja perfekt kannst du dir nun mal das rheinland versicherungen projekt aus checkion angucken und daraus dann zielgruppen für audion ableiten und anlegen';
    expect(isAudienceWorkflowIntent(prompt)).toBe(true);
    expect(routeAssistantIntent(prompt).type).toBe('free_chat');
  });

  it('does not route zielgruppen für audion anlegen without projekt keyword to project create', () => {
    expect(routeAssistantIntent('Lege Zielgruppen für audion an').type).toBe('free_chat');
  });

  it('still routes generic create to platform create_project', () => {
    const intent = routeAssistantIntent('Lege ein neues Projekt "Acme" an, Domain acme.com');
    expect(intent.type).toBe('create_project');
    if (intent.type === 'create_project') {
      expect(intent.name).toBe('Acme');
      expect(intent.domain).toBe('acme.com');
    }
  });
});

describe('formatAudionProjectCreatedMessage', () => {
  it('mentions AUDION not PLEXON platform', () => {
    const text = formatAudionProjectCreatedMessage({
      name: 'Rheinland Versicherungen',
      audionProjectId: 'abc-123',
      adminHref: 'https://audion.example/admin/projects/abc-123',
    });
    expect(text).toContain('AUDION');
    expect(text).not.toContain('Plattform-Projekt');
    expect(text).not.toContain('PLEXON-Dashboard');
    expect(text).toContain('abc-123');
  });
});
