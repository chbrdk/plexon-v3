import { describe, expect, it } from 'vitest';
import {
  createJourneyQualityTemplate,
  createPageQualityTemplate,
} from '@/lib/collection-test-flow';
import { validateCollectionFlowForRun } from '@/lib/collection-flow-validate';

describe('validateCollectionFlowForRun', () => {
  it('accepts a page-quality template', () => {
    const doc = createPageQualityTemplate('https://acme.test/');
    const result = validateCollectionFlowForRun(doc);
    expect(result.ok).toBe(true);
    expect(result.issues.filter((i) => i.level === 'error')).toHaveLength(0);
  });

  it('warns when persona is unset on journey template', () => {
    const doc = createJourneyQualityTemplate('https://acme.test/');
    const result = validateCollectionFlowForRun(doc);
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.code === 'persona_unset')).toBe(true);
  });

  it('errors when compare path is missing', () => {
    const doc = createPageQualityTemplate('https://acme.test/');
    const compare = doc.nodes.find((n) => n.kind === 'compare');
    if (compare) compare.path = undefined;
    const result = validateCollectionFlowForRun(doc);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'compare_missing_path')).toBe(true);
  });

  it('errors when start URL is empty', () => {
    const doc = createPageQualityTemplate('');
    const start = doc.nodes.find((n) => n.kind === 'start');
    if (start) {
      start.url = '';
      start.urlKey = '';
    }
    const scan = doc.nodes.find((n) => n.kind === 'scan');
    if (scan) scan.url = '';
    const result = validateCollectionFlowForRun(doc);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'missing_url')).toBe(true);
  });
});
