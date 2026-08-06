import { describe, expect, it } from 'vitest';
import {
  deriveFlowLabelFromUrl,
  patchLabelFromUrlIfGeneric,
  summarizeFlowUrl,
} from '@/lib/collection-flow-url';

describe('collection-flow-url', () => {
  it('summarizes hostname and path', () => {
    expect(summarizeFlowUrl('https://www.example.com/checkout')).toBe('www.example.com/checkout');
    expect(summarizeFlowUrl('')).toBe('URL setzen…');
  });

  it('derives label from hostname', () => {
    expect(deriveFlowLabelFromUrl('https://www.acme.com/page')).toBe('acme.com');
  });

  it('patches only generic labels', () => {
    expect(patchLabelFromUrlIfGeneric('Start', 'Start', 'https://shop.de')).toBe('shop.de');
    expect(patchLabelFromUrlIfGeneric('Custom', 'Start', 'https://shop.de')).toBeUndefined();
  });
});
