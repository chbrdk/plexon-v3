import { describe, expect, it } from 'vitest';
import {
  buildSchemaFromCatalogPaths,
  journeyStepSchemaTree,
  mergeRunItemsIntoSchema,
  predictedSchemaForNodeOutput,
} from '@/lib/collection-flow-output-schemas';

function childKeys(node: { children?: Array<{ key: string }> }): string[] {
  return (node.children ?? []).map((c) => c.key);
}

describe('buildSchemaFromCatalogPaths', () => {
  it('nests scan catalog paths under a node expression base', () => {
    const tree = buildSchemaFromCatalogPaths("$('n-scan').json", 'scan', ['overallScore', 'status']);
    expect(tree.type).toBe('object');
    expect(childKeys(tree)).toContain('overallScore');
    expect(childKeys(tree)).toContain('status');
    const score = tree.children?.find((c) => c.key === 'overallScore');
    expect(score?.type).toBe('number');
    expect(score?.path).toBe("$('n-scan').json.overallScore");
  });

  it('nests lens scores under a scores object', () => {
    const tree = buildSchemaFromCatalogPaths('scan', 'scan', [
      'overallScore',
      'scores.accessibility',
      'scores.seo',
    ]);
    const scores = tree.children?.find((c) => c.key === 'scores');
    expect(scores?.type).toBe('object');
    expect(scores?.children?.some((c) => c.key === 'accessibility')).toBe(true);
    expect(scores?.children?.some((c) => c.key === 'seo')).toBe(true);
  });

  it('adds issues.items[item] shape for scan catalog', () => {
    const tree = buildSchemaFromCatalogPaths('scan', 'scan', ['issues.openCount']);
    const issues = tree.children?.find((c) => c.key === 'issues');
    const items = issues?.children?.find((c) => c.key === 'items');
    const item = items?.children?.find((c) => c.key === '[item]');
    expect(item?.children?.some((c) => c.key === 'ruleId')).toBe(true);
  });
});

describe('journeyStepSchemaTree', () => {
  it('lists text, note, and label fields', () => {
    const tree = journeyStepSchemaTree('n-action');
    expect(childKeys(tree)).toEqual(['text', 'note', 'label']);
    expect(tree.children?.every((c) => c.type === 'string')).toBe(true);
  });
});

describe('mergeRunItemsIntoSchema', () => {
  it('overlays run values onto predicted leaves', () => {
    const predicted = predictedSchemaForNodeOutput('n-scan', 'scan');
    const merged = mergeRunItemsIntoSchema(predicted, [
      { path: "$('n-scan').json.overallScore", value: '72', predicted: false },
    ]);
    const score = merged.children?.find((c) => c.key === 'overallScore');
    expect(score?.value).toBe('72');
    expect(score?.schema).toBe(false);
  });
});
