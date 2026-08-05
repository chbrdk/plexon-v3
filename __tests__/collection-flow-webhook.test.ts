import { describe, expect, it } from 'vitest';
import {
  hashWebhookSecret,
  issueWebhookSecret,
  parseClosedFlowTriggerBody,
  verifyWebhookSecret,
} from '@/lib/collection-flow-webhook';

describe('collection-flow-webhook', () => {
  it('issues verifiable secret with hint', () => {
    const issued = issueWebhookSecret();
    expect(issued.secret.startsWith('whsec_')).toBe(true);
    expect(issued.hint).toHaveLength(4);
    expect(issued.hash).toBe(hashWebhookSecret(issued.secret));
    expect(verifyWebhookSecret(issued.secret, issued.hash)).toBe(true);
    expect(verifyWebhookSecret('whsec_wrong', issued.hash)).toBe(false);
  });

  it('parses closed trigger body only', () => {
    expect(
      parseClosedFlowTriggerBody({
        url: ' https://ex.test ',
        companyName: ' Acme ',
        callbackUrl: 'https://hooks.example/cb',
        evil: 'nope',
        expression: '1+1',
      })
    ).toEqual({
      url: 'https://ex.test',
      companyName: 'Acme',
      callbackUrl: 'https://hooks.example/cb',
    });
    expect(parseClosedFlowTriggerBody({ callbackUrl: 'javascript:alert(1)' })).toEqual({});
  });
});
