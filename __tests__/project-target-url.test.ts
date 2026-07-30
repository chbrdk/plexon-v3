import { describe, expect, it } from 'vitest';
import { extractPendingDomainFromHistory } from '@/lib/assistant/conversation-context';
import { resolveConversationTargetUrl } from '@/lib/assistant/conversation-target-url';
import { attachRecommendationsToMetadata } from '@/lib/assistant/insights/conversation-recommendations';
import { buildDefaultConversationStarters } from '@/lib/assistant/insights/conversation-recommendations-core';
import { buildAssistantSuggestedPrompts } from '@/lib/assistant/suggested-prompts';
import {
  applyConversationTargetToRecommendations,
  normalizeAssistantTargetUrl,
  personalizeAssistantPrompt,
  resolveAssistantTargetUrl,
} from '@/lib/assistant/project-target-url';

describe('project-target-url', () => {
  it('normalizes bare domains to https URLs', () => {
    expect(normalizeAssistantTargetUrl('rheinland.de')).toBe('https://rheinland.de');
    expect(normalizeAssistantTargetUrl('https://rheinland.de/')).toBe('https://rheinland.de/');
  });

  it('personalizes composer templates with project domain and name', () => {
    const prompts = buildAssistantSuggestedPrompts({
      domain: 'rheinland.de',
      projectName: 'Rheinland Versicherung',
    });
    const pagespeed = prompts.find((p) => p.id === 'pagespeed');
    expect(pagespeed?.prompt).toContain('https://rheinland.de');
    expect(pagespeed?.prompt).not.toContain('example.com');

    const launch = prompts.find((p) => p.id === 'launch-readiness');
    expect(launch?.prompt).toContain('Rheinland Versicherung');
    expect(launch?.prompt).toContain('https://rheinland.de');
  });

  it('keeps placeholder when no domain is provided', () => {
    expect(personalizeAssistantPrompt('GEO Analyse für https://example.com', {})).toBe(
      'GEO Analyse für https://example.com'
    );
  });

  it('resolves project domain when chat history has no URL', () => {
    const url = resolveAssistantTargetUrl({
      history: [{ role: 'user', content: 'GEO Analyse für unser Projekt' }],
      prompt: 'Was als Nächstes?',
      projectDomain: 'shop.acme.com',
    });
    expect(url).toBe('https://shop.acme.com');
  });

  it('prefers conversation URL over project domain', () => {
    const url = resolveConversationTargetUrl({
      messages: [
        { role: 'user', content: 'GEO Analyse https://rheinland.de' },
        { role: 'assistant', content: 'Fertig.' },
      ],
      projectDomain: 'other.com',
    });
    expect(url).toBe('https://rheinland.de');
  });
});

describe('applyConversationTargetToRecommendations', () => {
  it('rewrites stored example.com follow-ups from conversation context', () => {
    const out = applyConversationTargetToRecommendations(
      [{ id: 'x', label: 'SEO', prompt: 'PageSpeed von https://example.com?' }],
      'https://rheinland.de'
    );
    expect(out[0]?.prompt).toContain('rheinland.de');
    expect(out[0]?.prompt).not.toContain('example.com');
  });
});

describe('extractPendingDomainFromHistory metadata', () => {
  it('reads URL from assistant markdown when metadata is missing', () => {
    const url = extractPendingDomainFromHistory(
      [{ role: 'assistant', content: 'Analyse für **https://rheinland.de** abgeschlossen.' }],
      ''
    );
    expect(url).toBe('https://rheinland.de');
  });

  it('reads URL from prior assistant workflow blocks', () => {
    const url = extractPendingDomainFromHistory(
      [
        {
          role: 'assistant',
          content: 'GEO fertig',
          metadata: {
            uiLayout: {
              version: 1,
              blocks: [
                {
                  id: 'kv',
                  type: 'key_value_list',
                  props: { items: [{ label: 'URL', value: 'https://acme.com' }] },
                },
              ],
            },
          },
        },
      ],
      'PageSpeed bitte'
    );
    expect(url).toBe('https://acme.com');
  });
});

describe('conversation recommendations project domain', () => {
  it('uses project domain in default starters', () => {
    const starters = buildDefaultConversationStarters({
      platformProjectId: 'pp-1',
      url: 'https://rheinland.de',
    });
    expect(starters.some((s) => s.prompt.includes('https://rheinland.de'))).toBe(true);
    expect(starters.some((s) => s.prompt.includes('example.com'))).toBe(false);
  });

  it('attaches SEO follow-ups from project domain without URL in prompt', () => {
    const meta = attachRecommendationsToMetadata(undefined, {
      intent: { type: 'free_chat' },
      prompt: 'Was empfiehlst du als Nächstes?',
      history: [{ role: 'user', content: 'GEO Analyse für unser Projekt' }],
      platformProjectId: 'pp-1',
      projectDomain: 'rheinland.de',
    });
    const recs = meta?.followUpPrompts as Array<{ prompt: string }>;
    expect(recs?.some((r) => r.prompt.includes('https://rheinland.de'))).toBe(true);
    expect(recs?.some((r) => r.prompt.includes('example.com'))).toBe(false);
  });
});
