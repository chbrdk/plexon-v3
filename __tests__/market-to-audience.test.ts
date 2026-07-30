import { describe, expect, it } from 'vitest';
import {
  deriveTargetGroupsFromMarket,
  parseEchonThreadToMarketContext,
} from '@/lib/integrations/echon-market-context';
import {
  buildMarketResearchQuery,
} from '@/lib/assistant/playbooks/run-market-to-audience';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';
import '@/lib/assistant/playbooks/market-to-audience';
import { getPlaybook } from '@/lib/assistant/playbooks/registry';

describe('market-to-audience playbook', () => {
  it('registers playbook', () => {
    expect(getPlaybook('market_to_audience')?.label).toBe('Markt → Zielgruppen');
  });

  it('routes intent from German prompt', () => {
    const intent = routeAssistantIntent(
      'Markttrends für Versicherungen recherchieren und Zielgruppen in AUDION anlegen'
    );
    expect(intent.type).toBe('run_playbook');
    if (intent.type === 'run_playbook') {
      expect(intent.playbookId).toBe('market_to_audience');
    }
  });

  it('builds research query from project name and domain', () => {
    const q = buildMarketResearchQuery('Rheinland Versicherungen', 'rheinland.de');
    expect(q).toContain('Rheinland Versicherungen');
    expect(q).toContain('rheinland.de');
  });

  it('derives target groups from ECHON findings', () => {
    const suggestions = deriveTargetGroupsFromMarket(
      {
        available: true,
        executiveSummary: 'Der Markt wächst im Bereich Digitalversicherung.',
        keyFindings: ['Junge Digital-Nutzer', 'Bestandskunden 50+'],
      },
      'Rheinland',
      2
    );
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].name).toContain('Rheinland');
    expect(suggestions[0].segment).toContain('Digital');
  });

  it('parses ECHON thread structured answer', () => {
    const ctx = parseEchonThreadToMarketContext(
      {
        id: 'thread-1',
        messages: [
          {
            role: 'assistant',
            structured: {
              research_answer: {
                executive_summary: 'Markt stabil.',
                key_findings: ['Trend A'],
              },
            },
          },
        ],
      },
      'thread-1'
    );
    expect(ctx.available).toBe(true);
    expect(ctx.keyFindings).toEqual(['Trend A']);
  });
});
